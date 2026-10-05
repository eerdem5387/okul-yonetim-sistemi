import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isStaffEligibleAsScheduleInstructor } from "@/lib/staff-counseling"
import { normalizeTime } from "@/lib/schedules/lesson-slots"
import { DAY_LABELS } from "@/lib/schedules/time-conflict"

export const dynamic = "force-dynamic"

export type TeacherWideItem = {
  id: string
  teacherId: string
  kind: "class" | "study" | "club"
  label: string
  detail: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
}

/**
 * GET /api/schedules/teachers-wide
 * Tüm öğretmenlerin ders + ÖÇG + kulüp etüt programı (tam ekran matris).
 */
export async function GET() {
  try {
    const [staff, schedules, studySessions, clubSchedules] = await Promise.all([
      prisma.staff.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          subject: true,
          department: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.schedule.findMany({
        where: { isActive: true },
        select: {
          id: true,
          teacherId: true,
          subjectName: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          class: { select: { id: true, name: true, grade: true, section: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.studyGroupSession.findMany({
        where: { isActive: true },
        select: {
          id: true,
          teacherId: true,
          topic: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          studyGroup: { select: { id: true, name: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.clubSchedule.findMany({
        where: {
          isActive: true,
          OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
        },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          club: {
            select: {
              id: true,
              name: true,
              instructorId: true,
              instructor: { select: { id: true } },
            },
          },
          clubGroup: { select: { id: true, name: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
    ])

    const teachers = staff
      .filter((s) => isStaffEligibleAsScheduleInstructor(s.department))
      .map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        subject: s.subject,
        name: `${s.firstName} ${s.lastName}`.trim(),
      }))

    const teacherIds = new Set(teachers.map((t) => t.id))
    const items: TeacherWideItem[] = []

    for (const s of schedules) {
      if (!s.teacherId || !teacherIds.has(s.teacherId)) continue
      items.push({
        id: `class:${s.id}`,
        teacherId: s.teacherId,
        kind: "class",
        label: s.class?.name || "Sınıf",
        detail: s.subjectName,
        dayOfWeek: s.dayOfWeek,
        startTime: normalizeTime(s.startTime),
        endTime: normalizeTime(s.endTime),
        room: s.room ?? null,
      })
    }

    for (const s of studySessions) {
      if (!s.teacherId || !teacherIds.has(s.teacherId)) continue
      items.push({
        id: `study:${s.id}`,
        teacherId: s.teacherId,
        kind: "study",
        label: s.studyGroup?.name || "ÖÇG",
        detail: s.topic?.trim() || "Özel çalışma",
        dayOfWeek: s.dayOfWeek,
        startTime: normalizeTime(s.startTime),
        endTime: normalizeTime(s.endTime),
        room: s.room ?? null,
      })
    }

    for (const c of clubSchedules) {
      const teacherId = c.club.instructorId || c.club.instructor?.id
      if (!teacherId || !teacherIds.has(teacherId)) continue
      items.push({
        id: `club:${c.id}`,
        teacherId,
        kind: "club",
        label: c.club.name,
        detail: c.clubGroup?.name || "Kulüp",
        dayOfWeek: c.dayOfWeek,
        startTime: normalizeTime(c.startTime),
        endTime: normalizeTime(c.endTime),
        room: c.room ?? null,
      })
    }

    const counts = new Map<string, number>()
    for (const it of items) {
      counts.set(it.teacherId, (counts.get(it.teacherId) ?? 0) + 1)
    }

    return NextResponse.json({
      teachers: teachers.map((t) => ({
        ...t,
        itemCount: counts.get(t.id) ?? 0,
      })),
      items,
      weekdays: [1, 2, 3, 4, 5].map((d) => ({
        dayOfWeek: d,
        label: DAY_LABELS[d],
      })),
    })
  } catch (error) {
    console.error("[teachers-wide]", error)
    return NextResponse.json({ error: "Öğretmen programları alınamadı" }, { status: 500 })
  }
}
