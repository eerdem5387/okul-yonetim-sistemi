import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canQueryStaff, forbidden, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { evaluateTopics } from "@/lib/neredeyiz/calendar"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

// GET - Öğretmenin derslerindeki gecikmeli konular (aktif ya da seçilen yıl; delayDays = ders günü)
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get("staffId") || guard.actor.staffId
    if (!canQueryStaff(guard.actor, staffId)) return forbidden()
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
        academicYear: { select: { id: true, name: true } },
        assignments: { select: { staffId: true } },
        units: {
          select: {
            id: true,
            name: true,
            topics: {
              where: { plannedEndDate: { not: null } },
              select: {
                id: true,
                name: true,
                plannedStartDate: true,
                plannedEndDate: true,
                progress: { orderBy: { updatedAt: "desc" } },
              },
            },
          },
        },
      },
    })

    const flat = subjects.flatMap((subject) =>
      subject.units.flatMap((unit) => unit.topics.map((topic) => ({ ...topic, subject, unit }))),
    )
    const evaluated = await evaluateTopics(
      flat,
      (t) => t.subject,
      (t) => t.progress[0],
    )

    const delayedTopics = evaluated
      .filter(({ ev }) => ev.delayDays > 0 && (ev.delayed || ev.state === "GECIKMELI_TAMAMLANDI" || ev.pendingApproval))
      .map(({ topic: t, ev }) => ({
        id: t.id,
        name: t.name,
        plannedEndDate: t.plannedEndDate?.toISOString() ?? null,
        delayDays: ev.delayDays,
        state: ev.state,
        unit: { id: t.unit.id, name: t.unit.name },
        subject: {
          id: t.subject.id,
          name: t.subject.name,
          grade: t.subject.grade,
          section: t.subject.section,
          academicYear: t.subject.academicYear,
        },
        progress: t.progress.map((p) => ({
          id: p.id,
          status: p.status,
          actualEndDate: p.actualEndDate?.toISOString() ?? null,
        })),
      }))
      .sort((a, b) => b.delayDays - a.delayDays)

    const grouped = new Map<string, { subject: (typeof delayedTopics)[number]["subject"]; delayedTopics: typeof delayedTopics; totalDelayDays: number }>()
    for (const t of delayedTopics) {
      const g = grouped.get(t.subject.id) ?? { subject: t.subject, delayedTopics: [], totalDelayDays: 0 }
      g.delayedTopics.push(t)
      g.totalDelayDays += t.delayDays
      grouped.set(t.subject.id, g)
    }

    return NextResponse.json({
      academicYearId,
      delayedTopics,
      groupedBySubject: [...grouped.values()],
      summary: {
        totalDelayedTopics: delayedTopics.length,
        totalSubjects: grouped.size,
        averageDelayDays:
          delayedTopics.length > 0
            ? Math.round(delayedTopics.reduce((s, t) => s + t.delayDays, 0) / delayedTopics.length)
            : 0,
        unit: "ders_gunu",
      },
    })
  } catch (error) {
    console.error("Error fetching delayed topics:", error)
    return NextResponse.json({ error: "Gecikme yaşanan konular getirilirken hata oluştu" }, { status: 500 })
  }
}
