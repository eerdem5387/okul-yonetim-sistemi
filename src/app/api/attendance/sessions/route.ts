import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin, resolveActorWithPermission } from "@/lib/permissions"

export const dynamic = "force-dynamic"

/**
 * GET /api/attendance/sessions?date=YYYY-MM-DD&teacherId=
 * Öğretmenin o gün yoklama alabileceği oturumlar:
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
      (actor.isTeacher || actor.department === "OGRETMEN")
    if (ownOnly) teacherId = actor.staffId

    if (!dateStr) {
      return NextResponse.json({ error: "date zorunlu (YYYY-MM-DD)" }, { status: 400 })
    }

    const d = new Date(`${dateStr}T12:00:00`)
    // JS: 0=Pazar … Prisma/okul: 1=Pazartesi … 7=Pazar
    const jsDay = d.getDay()
    const dayOfWeek = jsDay === 0 ? 7 : jsDay

    const [schedules, studySessions, clubSchedules] = await Promise.all([
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
              gradeLevel: true,
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
        },
        orderBy: { startTime: "asc" },
      }),
    ])

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
      })),
      ...studySessions.map((s) => ({
        id: s.id,
        kind: "STUDY_GROUP" as const,
        scheduleId: null as string | null,
        classId: null as string | null,
        studyGroupSessionId: s.id,
        clubScheduleId: null as string | null,
        title: s.studyGroup.name,
        subtitle: `ÖÇG · ${s.studyGroup.gradeLevel}. sınıf · ${s.topic}`,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        students: s.studyGroup.students.map((m) => m.student),
        class: null,
      })),
      ...clubSchedules.map((s) => ({
        id: s.id,
        kind: "CLUB" as const,
        scheduleId: null as string | null,
        classId: null as string | null,
        studyGroupSessionId: null as string | null,
        clubScheduleId: s.id,
        title: s.club.name,
        subtitle: "Kulüp",
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        students: s.club.selections.map((m) => m.student),
        class: null,
      })),
    ].sort((a, b) => a.startTime.localeCompare(b.startTime))

    return NextResponse.json({ dayOfWeek, sessions })
  } catch (error) {
    console.error("Error fetching attendance sessions:", error)
    return NextResponse.json({ error: "Oturumlar alınamadı" }, { status: 500 })
  }
}
