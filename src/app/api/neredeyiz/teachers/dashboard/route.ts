import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canQueryStaff, forbidden, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { calendarDaysBetween, dayKey, evaluateTopics, todayKey } from "@/lib/neredeyiz/calendar"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

// GET - Öğretmen dashboard verileri (aktif ya da seçilen akademik yıl; gecikmeler ders günüyle)
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get("staffId") || guard.actor.staffId
    if (!canQueryStaff(guard.actor, staffId)) return forbidden("Yalnızca kendi panelinizi görüntüleyebilirsiniz.")
    const academicYearId = await resolveNeredeyizYearId(searchParams)

    const subjects = await prisma.subject.findMany({
      where: {
        assignments: { some: { staffId } },
        ...(academicYearId ? { academicYearId } : {}),
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        classId: true,
        academicYearId: true,
        assignments: { select: { staffId: true } },
        units: {
          select: {
            id: true,
            name: true,
            topics: {
              select: {
                id: true,
                name: true,
                plannedStartDate: true,
                plannedEndDate: true,
                progress: { orderBy: { updatedAt: "desc" }, take: 1 },
              },
            },
          },
        },
      },
    })

    const flat = subjects.flatMap((subject) =>
      subject.units.flatMap((unit) => unit.topics.map((topic) => ({ ...topic, subject, unit }))),
    )
    const today = todayKey()
    const evaluated = await evaluateTopics(
      flat,
      (t) => t.subject,
      (t) => t.progress[0],
      today,
    )

    const stats = {
      totalTopics: flat.length,
      completedTopics: 0,
      earlyTopics: 0,
      lateCompletedTopics: 0,
      inProgressTopics: 0,
      plannedTopics: 0,
      delayedTopics: 0,
      pendingApprovalTopics: 0,
      completionPercentage: 0,
    }

    const subjectRef = (t: (typeof flat)[number]) => ({
      id: t.subject.id,
      name: t.subject.name,
      grade: t.subject.grade,
      section: t.subject.section,
    })

    const upcomingDeadlines: Array<{
      id: string
      name: string
      plannedEndDate: string
      daysUntil: number
      teachingDaysUntil: number
      subject: ReturnType<typeof subjectRef>
      unit: { id: string; name: string }
    }> = []
    const recentCompletions: Array<{
      id: string
      name: string
      completedDate: string
      isEarly?: boolean
      isLate?: boolean
      daysDifference?: number
      subject: ReturnType<typeof subjectRef>
      unit: { id: string; name: string }
    }> = []

    for (const { topic: t, ev } of evaluated) {
      if (ev.completed) {
        stats.completedTopics++
        if (ev.state === "ERKEN_TAMAMLANDI") stats.earlyTopics++
        if (ev.state === "GECIKMELI_TAMAMLANDI") stats.lateCompletedTopics++
        const actual = t.progress[0]?.actualEndDate
        if (actual) {
          const ago = calendarDaysBetween(dayKey(actual), today)
          if (ago >= 0 && ago <= 7) {
            recentCompletions.push({
              id: t.id,
              name: t.name,
              completedDate: actual.toISOString(),
              isEarly: ev.state === "ERKEN_TAMAMLANDI",
              isLate: ev.state === "GECIKMELI_TAMAMLANDI",
              daysDifference: ev.delayDays || ev.earlyDays || undefined,
              subject: subjectRef(t),
              unit: { id: t.unit.id, name: t.unit.name },
            })
          }
        }
      } else if (ev.pendingApproval) stats.pendingApprovalTopics++
      else if (ev.delayed) stats.delayedTopics++
      else if (ev.state === "DEVAM_EDIYOR") stats.inProgressTopics++
      else stats.plannedTopics++

      if (!ev.completed && !ev.pendingApproval && t.plannedEndDate) {
        const daysUntil = calendarDaysBetween(today, dayKey(t.plannedEndDate))
        if (daysUntil >= 0 && daysUntil <= 7) {
          upcomingDeadlines.push({
            id: t.id,
            name: t.name,
            plannedEndDate: t.plannedEndDate.toISOString(),
            daysUntil,
            teachingDaysUntil: ev.teachingDaysUntilDue ?? 0,
            subject: subjectRef(t),
            unit: { id: t.unit.id, name: t.unit.name },
          })
        }
      }
    }

    stats.completionPercentage = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0
    upcomingDeadlines.sort((a, b) => a.daysUntil - b.daysUntil)
    recentCompletions.sort((a, b) => b.completedDate.localeCompare(a.completedDate))

    return NextResponse.json({
      academicYearId,
      stats,
      upcomingDeadlines: upcomingDeadlines.slice(0, 10),
      recentCompletions: recentCompletions.slice(0, 5),
    })
  } catch (error) {
    console.error("Error fetching teacher dashboard:", error)
    return NextResponse.json({ error: "Dashboard verileri getirilirken hata oluştu" }, { status: 500 })
  }
}
