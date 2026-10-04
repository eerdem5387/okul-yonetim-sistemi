import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatClubGradeLevels } from "@/lib/club-grade-levels"
import { isSuperAdmin, resolveActorWithPermission } from "@/lib/permissions"
import { isStaffEligibleAsScheduleInstructor } from "@/lib/staff-counseling"

export const dynamic = "force-dynamic"

/**
 * GET /api/attendance/sessions?date=YYYY-MM-DD&teacherId=
 * Öğretmen / rehberlik personelinin o gün yoklama alabileceği oturumlar:
 * - sınıf dersleri (Schedule)
 * - ÖÇG atamaları (StudyGroupSession)
 * - kulüp programları (ClubSchedule + instructor)
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await resolveActorWithPermission(request, "attendance", "view")
    if (!actor) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const dateStr = request.nextUrl.searchParams.get("date") || ""
    let teacherId = request.nextUrl.searchParams.get("teacherId") || actor.staffId

    const ownOnly =
      !isSuperAdmin(actor.department, actor.staffId) &&
      isStaffEligibleAsScheduleInstructor(actor.department)
    if (ownOnly) teacherId = actor.staffId

    if (!dateStr) {
      return NextResponse.json({ error: "date zorunlu (YYYY-MM-DD)" }, { status: 400 })
    }

    const d = new Date(`${dateStr}T12:00:00`)
    // JS: 0=Pazar … Prisma/okul: 1=Pazartesi … 7=Pazar
    const jsDay = d.getDay()
    const dayOfWeek = jsDay === 0 ? 7 : jsDay

    const { start: dayStart, end: dayEnd } = (() => {
      const start = new Date(`${dateStr}T00:00:00.000`)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { start, end }
    })()

    const [schedules, studySessions, clubSchedules, takenRows] = await Promise.all([
      prisma.schedule.findMany({
        where: { teacherId, dayOfWeek, isActive: true },
        include: {
          class: { select: { id: true, name: true, grade: true, section: true } },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.studyGroupSession.findMany({
        where: { teacherId, dayOfWeek, isActive: true },
        include: {
          studyGroup: {
            select: {
              id: true,
              name: true,
              gradeLevels: true,
              students: {
                include: {
                  student: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      grade: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.clubSchedule.findMany({
        where: {
          dayOfWeek,
          isActive: true,
          club: { instructorId: teacherId },
        },
        include: {
          club: {
            select: {
              id: true,
              name: true,
              selections: {
                include: {
                  student: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      grade: true,
                    },
                  },
                },
              },
            },
          },
          clubGroup: {
            select: {
              id: true,
              name: true,
              students: {
                include: {
                  student: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      grade: true,
                    },
                  },
                },
              },
            },
          },
          exclusions: {
            select: { studentId: true },
          },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.attendance.findMany({
        where: {
          teacherId,
          date: { gte: dayStart, lt: dayEnd },
        },
        select: {
          kind: true,
          scheduleId: true,
          studyGroupSessionId: true,
          clubScheduleId: true,
        },
      }),
    ])

    const takenClass = new Set<string>()
    const takenStudy = new Set<string>()
    const takenClub = new Set<string>()
    for (const r of takenRows) {
      if (r.kind === "CLASS" && r.scheduleId) takenClass.add(r.scheduleId)
      if (r.kind === "STUDY_GROUP" && r.studyGroupSessionId)
        takenStudy.add(r.studyGroupSessionId)
      if (r.kind === "CLUB" && r.clubScheduleId) takenClub.add(r.clubScheduleId)
    }

    const sessions = [
      ...schedules.map((s) => ({
        id: s.id,
        kind: "CLASS" as const,
        scheduleId: s.id,
        classId: s.classId,
        studyGroupSessionId: null as string | null,
        clubScheduleId: null as string | null,
        title: s.subjectName,
        subtitle: s.class?.name || "",
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        students: null as null,
        class: s.class,
        hasAttendance: takenClass.has(s.id),
      })),
      ...studySessions.map((s) => ({
        id: s.id,
        kind: "STUDY_GROUP" as const,
        scheduleId: null as string | null,
        classId: null as string | null,
        studyGroupSessionId: s.id,
        clubScheduleId: null as string | null,
        title: s.studyGroup.name,
        subtitle: `ÖÇG · ${formatClubGradeLevels(s.studyGroup.gradeLevels)} · ${s.topic}`,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        students: s.studyGroup.students.map((m) => m.student),
        class: null,
        hasAttendance: takenStudy.has(s.id),
      })),
      ...clubSchedules.map((s) => {
        const excludedIds = new Set(s.exclusions.map((e) => e.studentId))
        const raw = s.clubGroup
          ? s.clubGroup.students.map((m) => m.student)
          : s.club.selections.map((m) => m.student)
        const students = raw.filter((st) => !excludedIds.has(st.id))
        return {
          id: s.id,
          kind: "CLUB" as const,
          scheduleId: null as string | null,
          classId: null as string | null,
          studyGroupSessionId: null as string | null,
          clubScheduleId: s.id,
          title: s.clubGroup ? `${s.club.name} · ${s.clubGroup.name}` : s.club.name,
          subtitle: s.clubGroup ? "Kulüp grubu" : "Kulüp",
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room,
          students,
          class: null,
          hasAttendance: takenClub.has(s.id),
        }
      }),
    ].sort((a, b) => a.startTime.localeCompare(b.startTime))

    return NextResponse.json({ dayOfWeek, sessions })
  } catch (error) {
    console.error("Error fetching attendance sessions:", error)
    return NextResponse.json({ error: "Oturumlar alınamadı" }, { status: 500 })
  }
}
