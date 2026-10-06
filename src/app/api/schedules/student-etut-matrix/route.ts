import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { loadEtutSlots } from "@/lib/schedules/club-schedule"
import { listGradeEtutExams } from "@/lib/schedules/grade-etut-exams"
import { DAY_LABELS, hasTimeConflict } from "@/lib/schedules/time-conflict"
import { DENEME_SINAVI_SUBJECT, normalizeTime } from "@/lib/schedules/lesson-slots"
import {
  gradeLevelWhereClause,
  parseStudentGradeLevel,
} from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

type DayItem = {
  key: string
  kind: "CLUB" | "STUDY_GROUP" | "GRADE_EXAM"
  label: string
  startTime: string
  endTime: string
  clubGroupId: string | null
  studyGroupId: string | null
  scheduleOrSessionId: string
}

type FreeSlot = {
  label: string
  startTime: string
  endTime: string
}

/**
 * GET /api/schedules/student-etut-matrix?grade=7
 * veya ?band=ortaokul|lise|all
 *
 * Sınıf düzeyi × öğrenci × hafta günü etüt matrisi (çakışma + boş slot).
 */
export async function GET(request: NextRequest) {
  try {
    const gradeParam = request.nextUrl.searchParams.get("grade")
    const band = String(request.nextUrl.searchParams.get("band") ?? "all").trim()
    const singleGrade = gradeParam ? parseInt(gradeParam, 10) : null

    let grades: number[]
    if (singleGrade && singleGrade >= 5 && singleGrade <= 12) {
      grades = [singleGrade]
    } else if (band === "ortaokul") {
      grades = [5, 6, 7, 8]
    } else if (band === "lise") {
      grades = [9, 10, 11, 12]
    } else {
      grades = [5, 6, 7, 8, 9, 10, 11, 12]
    }

    const studentWhere =
      grades.length === 1
        ? gradeLevelWhereClause(grades[0])
        : {
            OR: grades.flatMap((g) => {
              const clause = gradeLevelWhereClause(g)
              return Array.isArray(clause.OR) ? clause.OR : [clause]
            }),
          }

    const [students, etutSlotsRaw, clubMemberships, studyMemberships, exclusions, clubGroups, studyGroups, gradeEtutExams] =
      await Promise.all([
        prisma.student.findMany({
          where: studentWhere,
          select: { id: true, firstName: true, lastName: true, grade: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
        loadEtutSlots(),
        prisma.clubGroupStudent.findMany({
          where: {
            clubGroup: { isActive: true },
            student: studentWhere,
          },
          select: {
            studentId: true,
            clubGroup: {
              select: {
                id: true,
                name: true,
                club: { select: { id: true, name: true, gradeLevels: true } },
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
            },
          },
        }),
        prisma.studyGroupStudent.findMany({
          where: {
            studyGroup: { isActive: true },
            student: studentWhere,
          },
          select: {
            studentId: true,
            studyGroup: {
              select: {
                id: true,
                name: true,
                gradeLevels: true,
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
            },
          },
        }),
        prisma.clubScheduleExclusion.findMany({
          where: { student: studentWhere },
          select: { studentId: true, clubScheduleId: true },
        }),
        prisma.clubGroup.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            club: {
              select: {
                id: true,
                name: true,
                gradeLevels: true,
                instructor: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
            schedules: {
              where: { isActive: true },
              select: {
                id: true,
                dayOfWeek: true,
                startTime: true,
                endTime: true,
              },
            },
            _count: { select: { students: true } },
          },
          orderBy: [{ club: { name: "asc" } }, { name: "asc" }],
        }),
        prisma.studyGroup.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            gradeLevels: true,
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
            _count: { select: { students: true } },
          },
          orderBy: { name: "asc" },
        }),
        listGradeEtutExams(),
      ])

    // Benzersiz etüt slotları (saat)
    const etutSlots = (() => {
      const seen = new Set<string>()
      const out: Array<{ label: string; startTime: string; endTime: string }> = []
      for (const s of etutSlotsRaw) {
        const start = normalizeTime(s.startTime)
        const end = normalizeTime(s.endTime)
        const key = `${start}|${end}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ label: s.label, startTime: start, endTime: end })
      }
      out.sort((a, b) => a.startTime.localeCompare(b.startTime))
      return out
    })()

    const exclusionSet = new Set(
      exclusions.map((e) => `${e.studentId}|${e.clubScheduleId}`)
    )

    // studentId → day → items
    const itemsByStudent = new Map<string, Map<number, DayItem[]>>()

    const ensureDay = (studentId: string, day: number) => {
      let byDay = itemsByStudent.get(studentId)
      if (!byDay) {
        byDay = new Map()
        itemsByStudent.set(studentId, byDay)
      }
      let list = byDay.get(day)
      if (!list) {
        list = []
        byDay.set(day, list)
      }
      return list
    }

    for (const m of clubMemberships) {
      const g = m.clubGroup
      for (const sch of g.schedules) {
        if (exclusionSet.has(`${m.studentId}|${sch.id}`)) continue
        ensureDay(m.studentId, sch.dayOfWeek).push({
          key: `CLUB:${sch.id}`,
          kind: "CLUB",
          label: `${g.club.name}${g.name ? ` · ${g.name}` : ""}`,
          startTime: normalizeTime(sch.startTime),
          endTime: normalizeTime(sch.endTime),
          clubGroupId: g.id,
          studyGroupId: null,
          scheduleOrSessionId: sch.id,
        })
      }
    }

    for (const m of studyMemberships) {
      const g = m.studyGroup
      for (const sess of g.sessions) {
        ensureDay(m.studentId, sess.dayOfWeek).push({
          key: `STUDY_GROUP:${sess.id}`,
          kind: "STUDY_GROUP",
          label: g.name,
          startTime: normalizeTime(sess.startTime),
          endTime: normalizeTime(sess.endTime),
          clubGroupId: null,
          studyGroupId: g.id,
          scheduleOrSessionId: sess.id,
        })
      }
    }

    // Sınıf düzeyi deneme — o seviyedeki tüm öğrencilere uygulanır
    const examsByGrade = new Map<number, typeof gradeEtutExams>()
    for (const exam of gradeEtutExams) {
      if (!grades.includes(exam.grade)) continue
      const list = examsByGrade.get(exam.grade) ?? []
      list.push(exam)
      examsByGrade.set(exam.grade, list)
    }

    for (const s of students) {
      const gradeLevel = parseStudentGradeLevel(s.grade)
      if (gradeLevel == null) continue
      const exams = examsByGrade.get(gradeLevel)
      if (!exams?.length) continue
      for (const exam of exams) {
        ensureDay(s.id, exam.dayOfWeek).push({
          key: `GRADE_EXAM:${exam.id}`,
          kind: "GRADE_EXAM",
          label: exam.title?.trim() || DENEME_SINAVI_SUBJECT,
          startTime: normalizeTime(exam.startTime),
          endTime: normalizeTime(exam.endTime),
          clubGroupId: null,
          studyGroupId: null,
          scheduleOrSessionId: exam.id,
        })
      }
    }

    const weekdays = [1, 2, 3, 4, 5] as const

    type StudentRow = {
      id: string
      firstName: string
      lastName: string
      grade: string
      gradeLevel: number
      hasConflict: boolean
      hasEmptyDay: boolean
      days: Record<
        string,
        {
          items: DayItem[]
          hasConflict: boolean
          freeSlots: FreeSlot[]
        }
      >
    }

    const byGrade: Record<string, StudentRow[]> = {}
    for (const g of grades) byGrade[String(g)] = []

    for (const s of students) {
      const gradeLevel = parseStudentGradeLevel(s.grade)
      if (gradeLevel == null || !grades.includes(gradeLevel)) continue

      const byDay = itemsByStudent.get(s.id) ?? new Map()
      const days: StudentRow["days"] = {}
      let hasConflict = false
      let hasEmptyDay = false

      for (const day of weekdays) {
        const raw = [...(byDay.get(day) ?? [])].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        )
        // Aynı key tekrarını temizle
        const seenKeys = new Set<string>()
        const items = raw.filter((it) => {
          if (seenKeys.has(it.key)) return false
          seenKeys.add(it.key)
          return true
        })

        let dayConflict = false
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            if (
              hasTimeConflict(
                items[i].startTime,
                items[i].endTime,
                items[j].startTime,
                items[j].endTime
              )
            ) {
              dayConflict = true
              break
            }
          }
          if (dayConflict) break
        }

        const freeSlots: FreeSlot[] = []
        for (const slot of etutSlots) {
          const occupied = items.some((it) =>
            hasTimeConflict(it.startTime, it.endTime, slot.startTime, slot.endTime)
          )
          if (!occupied) {
            freeSlots.push({
              label: slot.label,
              startTime: slot.startTime,
              endTime: slot.endTime,
            })
          }
        }

        if (dayConflict) hasConflict = true
        if (freeSlots.length > 0) hasEmptyDay = true

        days[String(day)] = { items, hasConflict: dayConflict, freeSlots }
      }

      byGrade[String(gradeLevel)].push({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade,
        gradeLevel,
        hasConflict,
        hasEmptyDay,
        days,
      })
    }

    const assignOptions = {
      clubGroups: clubGroups.map((g) => ({
        id: g.id,
        name: g.name,
        clubId: g.club.id,
        clubName: g.club.name,
        gradeLevels: g.club.gradeLevels ?? [],
        teacherName: g.club.instructor
          ? `${g.club.instructor.firstName} ${g.club.instructor.lastName}`.trim()
          : null,
        memberCount: g._count.students,
        schedules: g.schedules.map((sch) => ({
          dayOfWeek: sch.dayOfWeek,
          dayLabel: DAY_LABELS[sch.dayOfWeek] ?? String(sch.dayOfWeek),
          startTime: normalizeTime(sch.startTime),
          endTime: normalizeTime(sch.endTime),
        })),
      })),
      studyGroups: studyGroups.map((g) => ({
        id: g.id,
        name: g.name,
        gradeLevels: g.gradeLevels ?? [],
        memberCount: g._count.students,
        sessions: g.sessions.map((sess) => ({
          dayOfWeek: sess.dayOfWeek,
          dayLabel: DAY_LABELS[sess.dayOfWeek] ?? String(sess.dayOfWeek),
          startTime: normalizeTime(sess.startTime),
          endTime: normalizeTime(sess.endTime),
          topic: sess.topic || "",
        })),
      })),
    }

    return NextResponse.json({
      grades,
      etutSlots,
      weekdays: weekdays.map((d) => ({ dayOfWeek: d, label: DAY_LABELS[d] })),
      byGrade,
      assignOptions,
    })
  } catch (error) {
    console.error("[student-etut-matrix]", error)
    return NextResponse.json({ error: "Öğrenci etüt matrisi alınamadı" }, { status: 500 })
  }
}
