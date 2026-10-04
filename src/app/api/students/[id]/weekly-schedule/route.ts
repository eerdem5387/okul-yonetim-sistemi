import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clubMatchesStudentGrade } from "@/lib/club-grade-levels"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"
import { DENEME_SINAVI_SUBJECT, normalizeTime } from "@/lib/schedules/lesson-slots"
import { listGradeEtutExams } from "@/lib/schedules/grade-etut-exams"
import {
  assignStudentToClubGroup,
  assignStudentToStudyGroup,
  removeStudentFromAssignment,
} from "@/lib/schedules/student-activity-conflicts"
import { restoreStudentToClubSchedule } from "@/lib/schedules/club-schedule-exclusions"

export const dynamic = "force-dynamic"

/**
 * GET /api/students/[id]/weekly-schedule
 * Öğrencinin haftalık ders + kulüp etüt + ÖÇG programı ve atama seçenekleri.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await context.params

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        classAssignments: {
          where: { class: { academicYear: { isActive: true } } },
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                saturdayEnabled: true,
              },
            },
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
    }

    const gradeLevel = parseStudentGradeLevel(student.grade)
    const activeClass = student.classAssignments[0]?.class ?? null

    const [
      classSchedules,
      clubGroupMemberships,
      clubSelections,
      exclusions,
      studyMemberships,
      allClubGroups,
      allStudyGroups,
      gradeEtutExams,
    ] = await Promise.all([
      activeClass
        ? prisma.schedule.findMany({
            where: { classId: activeClass.id, isActive: true },
            include: {
              teacher: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          })
        : Promise.resolve([]),
      prisma.clubGroupStudent.findMany({
        where: { studentId },
        select: {
          clubGroupId: true,
          clubGroup: {
            select: {
              id: true,
              name: true,
              clubId: true,
              club: { select: { id: true, name: true } },
              schedules: {
                where: { isActive: true },
                select: {
                  id: true,
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                  room: true,
                },
              },
            },
          },
        },
      }),
      prisma.clubSelection.findMany({
        where: { studentId },
        select: {
          id: true,
          clubId: true,
          club: {
            select: {
              id: true,
              name: true,
              schedules: {
                where: { isActive: true, clubGroupId: null },
                select: {
                  id: true,
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                  room: true,
                },
              },
            },
          },
        },
      }),
      prisma.clubScheduleExclusion.findMany({
        where: { studentId },
        select: { clubScheduleId: true, note: true },
      }),
      prisma.studyGroupStudent.findMany({
        where: { studentId },
        select: {
          studyGroupId: true,
          studyGroup: {
            select: {
              id: true,
              name: true,
              gradeLevels: true,
              sessions: {
                where: { isActive: true },
                include: {
                  teacher: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
                orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
              },
            },
          },
        },
      }),
      prisma.clubGroup.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          clubId: true,
          club: {
            select: {
              id: true,
              name: true,
              gradeLevels: true,
            },
          },
          _count: { select: { students: true, schedules: true } },
          schedules: {
            where: { isActive: true },
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: [{ club: { name: "asc" } }, { name: "asc" }],
      }),
      prisma.studyGroup.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          gradeLevels: true,
          _count: { select: { students: true, sessions: true } },
          sessions: {
            where: { isActive: true },
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              topic: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      listGradeEtutExams(),
    ])

    const excludedIds = new Set(exclusions.map((e) => e.clubScheduleId))
    const exclusionNotes = new Map(exclusions.map((e) => [e.clubScheduleId, e.note]))

    type ScheduleItem = {
      id: string
      kind: "class" | "club" | "study" | "deneme"
      subjectName: string
      className: string
      dayOfWeek: number
      startTime: string
      endTime: string
      room: string | null
      teacherName?: string | null
      assignmentKey?: string
      clubId?: string
      clubGroupId?: string | null
      studyGroupId?: string
      studyGroupSessionId?: string
      excluded?: boolean
      exclusionNote?: string | null
    }

    const items: ScheduleItem[] = []

    for (const s of classSchedules) {
      items.push({
        id: `class-${s.id}`,
        kind: "class",
        subjectName: s.subjectName,
        className: s.teacher
          ? `${s.teacher.firstName} ${s.teacher.lastName}`
          : activeClass?.name || "Ders",
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        teacherName: s.teacher
          ? `${s.teacher.firstName} ${s.teacher.lastName}`
          : null,
      })
    }

    // Gruplu kulüp programları
    for (const m of clubGroupMemberships) {
      const g = m.clubGroup
      for (const sch of g.schedules) {
        const excluded = excludedIds.has(sch.id)
        items.push({
          id: `club-${sch.id}`,
          kind: "club",
          subjectName: g.club.name,
          className: g.name,
          dayOfWeek: sch.dayOfWeek,
          startTime: sch.startTime,
          endTime: sch.endTime,
          room: sch.room,
          assignmentKey: `CLUB:${sch.id}`,
          clubId: g.clubId,
          clubGroupId: g.id,
          excluded,
          exclusionNote: exclusionNotes.get(sch.id) ?? null,
        })
      }
    }

    // Grupsuz kulüp seçimi programları (öğrenci herhangi bir grupta değilse)
    const memberClubIds = new Set(clubGroupMemberships.map((m) => m.clubGroup.clubId))
    for (const sel of clubSelections) {
      if (memberClubIds.has(sel.clubId)) continue
      for (const sch of sel.club.schedules) {
        const excluded = excludedIds.has(sch.id)
        items.push({
          id: `club-${sch.id}`,
          kind: "club",
          subjectName: sel.club.name,
          className: "Kulüp",
          dayOfWeek: sch.dayOfWeek,
          startTime: sch.startTime,
          endTime: sch.endTime,
          room: sch.room,
          assignmentKey: `CLUB:${sch.id}`,
          clubId: sel.clubId,
          clubGroupId: null,
          excluded,
          exclusionNote: exclusionNotes.get(sch.id) ?? null,
        })
      }
    }

    for (const m of studyMemberships) {
      const g = m.studyGroup
      for (const sess of g.sessions) {
        items.push({
          id: `study-${sess.id}`,
          kind: "study",
          subjectName: g.name,
          className: sess.topic?.trim() || "Özel çalışma",
          dayOfWeek: sess.dayOfWeek,
          startTime: sess.startTime,
          endTime: sess.endTime,
          room: sess.room,
          teacherName: `${sess.teacher.firstName} ${sess.teacher.lastName}`,
          assignmentKey: `STUDY_GROUP:${sess.id}`,
          studyGroupId: g.id,
          studyGroupSessionId: sess.id,
        })
      }
    }

    if (gradeLevel != null) {
      for (const exam of gradeEtutExams) {
        if (exam.grade !== gradeLevel) continue
        items.push({
          id: `deneme-${exam.id}`,
          kind: "deneme",
          subjectName: exam.title || DENEME_SINAVI_SUBJECT,
          className: `${exam.grade}. sınıf deneme`,
          dayOfWeek: exam.dayOfWeek,
          startTime: exam.startTime,
          endTime: exam.endTime,
          room: null,
        })
      }
    }

    const clubGroupOptions = allClubGroups
      .filter((g) => clubMatchesStudentGrade(g.club.gradeLevels, student.grade))
      .map((g) => ({
        id: g.id,
        name: g.name,
        clubId: g.clubId,
        clubName: g.club.name,
        studentCount: g._count.students,
        scheduleCount: g._count.schedules,
        schedules: g.schedules.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: normalizeTime(s.startTime),
          endTime: normalizeTime(s.endTime),
        })),
      }))

    const studyGroupOptions = allStudyGroups
      .filter((g) => {
        if (!g.gradeLevels || g.gradeLevels.length === 0) return true
        if (gradeLevel == null) return true
        return g.gradeLevels.includes(gradeLevel)
      })
      .map((g) => ({
        id: g.id,
        name: g.name,
        gradeLevels: g.gradeLevels,
        studentCount: g._count.students,
        sessionCount: g._count.sessions,
        sessions: g.sessions.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: normalizeTime(s.startTime),
          endTime: normalizeTime(s.endTime),
          topic: s.topic,
        })),
      }))

    const memberships = {
      clubGroups: clubGroupMemberships.map((m) => ({
        clubGroupId: m.clubGroup.id,
        clubGroupName: m.clubGroup.name,
        clubId: m.clubGroup.clubId,
        clubName: m.clubGroup.club.name,
      })),
      clubSelections: clubSelections.map((s) => ({
        selectionId: s.id,
        clubId: s.clubId,
        clubName: s.club.name,
      })),
      studyGroups: studyMemberships.map((m) => ({
        studyGroupId: m.studyGroup.id,
        studyGroupName: m.studyGroup.name,
      })),
    }

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
        gradeLevel,
      },
      class: activeClass,
      items,
      options: {
        clubGroups: clubGroupOptions,
        studyGroups: studyGroupOptions,
      },
      memberships,
    })
  } catch (error) {
    console.error("[student weekly-schedule GET]", error)
    return NextResponse.json({ error: "Haftalık program alınamadı" }, { status: 500 })
  }
}

/**
 * POST /api/students/[id]/weekly-schedule
 * action:
 *  - exclude_day | leave_group | restore_day  (+ assignmentKey)
 *  - assign_club_group (+ clubGroupId)
 *  - assign_study_group (+ studyGroupId)
 *  - leave_study_group (+ studyGroupId) — tüm ÖÇG üyeliğini kaldır
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await context.params
    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? "").trim()

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    })
    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
    }

    if (action === "exclude_day" || action === "leave_group") {
      const assignmentKey = String(body.assignmentKey ?? "").trim()
      if (!assignmentKey) {
        return NextResponse.json({ error: "assignmentKey zorunludur" }, { status: 400 })
      }
      const result = await removeStudentFromAssignment({
        studentId,
        assignmentKey,
        mode: action === "exclude_day" ? "exclude_day" : "leave_group",
      })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: result.removed })
    }

    if (action === "restore_day") {
      const assignmentKey = String(body.assignmentKey ?? "").trim()
      const clubScheduleId = assignmentKey.startsWith("CLUB:")
        ? assignmentKey.slice(5)
        : String(body.clubScheduleId ?? "").trim()
      if (!clubScheduleId) {
        return NextResponse.json({ error: "Kulüp programı id zorunludur" }, { status: 400 })
      }
      const result = await restoreStudentToClubSchedule({ studentId, clubScheduleId })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: result.restored })
    }

    if (action === "assign_club_group") {
      const clubGroupId = String(body.clubGroupId ?? "").trim()
      if (!clubGroupId) {
        return NextResponse.json({ error: "clubGroupId zorunludur" }, { status: 400 })
      }
      const result = await assignStudentToClubGroup({ studentId, clubGroupId })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: result.assigned })
    }

    if (action === "assign_study_group") {
      const studyGroupId = String(body.studyGroupId ?? "").trim()
      if (!studyGroupId) {
        return NextResponse.json({ error: "studyGroupId zorunludur" }, { status: 400 })
      }
      const result = await assignStudentToStudyGroup({ studentId, studyGroupId })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: result.assigned })
    }

    if (action === "leave_study_group") {
      const studyGroupId = String(body.studyGroupId ?? "").trim()
      if (!studyGroupId) {
        return NextResponse.json({ error: "studyGroupId zorunludur" }, { status: 400 })
      }
      const group = await prisma.studyGroup.findUnique({
        where: { id: studyGroupId },
        select: { id: true, name: true },
      })
      if (!group) {
        return NextResponse.json({ error: "ÖÇG grubu bulunamadı" }, { status: 404 })
      }
      const del = await prisma.studyGroupStudent.deleteMany({
        where: { studyGroupId, studentId },
      })
      if (del.count === 0) {
        return NextResponse.json(
          { error: "Öğrenci bu ÖÇG grubunda değil" },
          { status: 400 }
        )
      }
      return NextResponse.json({
        success: true,
        message: `${group.name} ÖÇG grubundan çıkarıldı`,
      })
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
  } catch (error) {
    console.error("[student weekly-schedule POST]", error)
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 })
  }
}
