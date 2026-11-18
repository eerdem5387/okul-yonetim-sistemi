import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { evaluateTopics } from "@/lib/neredeyiz/calendar"
import { buildSubjectFilter, SUBJECT_EVAL_SELECT } from "@/lib/neredeyiz/report-filters"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

// GET - Gecikmeli konular (tamamlanmamış + gecikmeli tamamlanmış). delayDays = ders günü.
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = await resolveNeredeyizYearId(searchParams)
    if (!academicYearId) {
      return NextResponse.json({ error: "Akademik yıl bulunamadı" }, { status: 400 })
    }

    const topics = await prisma.topic.findMany({
      where: {
        plannedEndDate: { not: null },
        unit: { subject: buildSubjectFilter(searchParams, academicYearId, guard.actor) },
      },
      include: {
        unit: { select: { id: true, name: true, subject: { select: SUBJECT_EVAL_SELECT } } },
        progress: { orderBy: { updatedAt: "desc" } },
      },
    })

    const evaluated = await evaluateTopics(
      topics,
      (t) => t.unit.subject,
      (t) => t.progress[0],
    )

    const delayedTopics = evaluated
      .filter(({ ev }) => ev.delayDays > 0 && (ev.delayed || ev.state === "GECIKMELI_TAMAMLANDI" || ev.pendingApproval))
      .map(({ topic, ev }) => ({
        id: topic.id,
        name: topic.name,
        plannedStartDate: topic.plannedStartDate?.toISOString() ?? null,
        plannedEndDate: topic.plannedEndDate?.toISOString() ?? null,
        delayDays: ev.delayDays,
        state: ev.state,
        unit: { id: topic.unit.id, name: topic.unit.name },
        subject: {
          id: topic.unit.subject.id,
          name: topic.unit.subject.name,
          grade: topic.unit.subject.grade,
          section: topic.unit.subject.section,
        },
        progress: topic.progress.map((p) => ({
          id: p.id,
          status: p.status,
          actualEndDate: p.actualEndDate?.toISOString() ?? null,
        })),
      }))
      .sort((a, b) => b.delayDays - a.delayDays)

    const totalDelayDays = delayedTopics.reduce((s, t) => s + t.delayDays, 0)
    return NextResponse.json({
      academicYearId,
      delayedTopics,
      summary: {
        totalDelayed: delayedTopics.length,
        totalDelayDays,
        averageDelayDays: delayedTopics.length > 0 ? Math.round(totalDelayDays / delayedTopics.length) : 0,
        unit: "ders_gunu",
      },
    })
  } catch (error) {
    console.error("Error fetching delayed topics:", error)
    return NextResponse.json({ error: "Gecikmeli konular getirilirken hata oluştu" }, { status: 500 })
  }
}
