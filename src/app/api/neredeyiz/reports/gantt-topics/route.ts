import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { evaluateTopics, type TopicState } from "@/lib/neredeyiz/calendar"
import { buildSubjectFilter } from "@/lib/neredeyiz/report-filters"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

type GanttStatus = "PLANLANDI" | "DEVAM_EDIYOR" | "ONAY_BEKLIYOR" | "TAMAMLANDI" | "GECIKMELI" | "GECIKMELI_TAMAMLANDI"

function toGanttStatus(state: TopicState): GanttStatus {
  if (state === "ERKEN_TAMAMLANDI") return "TAMAMLANDI"
  if (state === "ERTELENDI") return "PLANLANDI"
  return state
}

// GET - Gantt / takvim / kanban görünümleri için tarihli konular
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
        plannedStartDate: { not: null },
        plannedEndDate: { not: null },
        unit: { subject: buildSubjectFilter(searchParams, academicYearId, guard.actor) },
      },
      include: {
        unit: {
          select: {
            name: true,
            subject: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                classId: true,
                academicYearId: true,
                assignments: {
                  select: { staffId: true, staff: { select: { id: true, firstName: true, lastName: true } } },
                },
              },
            },
          },
        },
        progress: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
      orderBy: { plannedStartDate: "asc" },
    })

    const staffIds = new Set<string>()
    for (const t of topics) {
      const p = t.progress[0]
      if (p?.markedBy) staffIds.add(p.markedBy)
      if (p?.approvedBy) staffIds.add(p.approvedBy)
      if (p?.reportedBy) staffIds.add(p.reportedBy)
    }
    const staffRows = staffIds.size
      ? await prisma.staff.findMany({
          where: { id: { in: [...staffIds] } },
          select: { id: true, firstName: true, lastName: true },
        })
      : []
    const staffMap = new Map(staffRows.map((s) => [s.id, { firstName: s.firstName, lastName: s.lastName }]))

    const evaluated = await evaluateTopics(
      topics,
      (t) => t.unit.subject,
      (t) => t.progress[0],
    )

    const ganttTopics = evaluated.map(({ topic, ev }) => {
      const progress = topic.progress[0]
      return {
        id: topic.id,
        name: topic.name,
        plannedStartDate: topic.plannedStartDate?.toISOString() || null,
        plannedEndDate: topic.plannedEndDate?.toISOString() || null,
        actualEndDate: progress?.actualEndDate?.toISOString() || null,
        status: toGanttStatus(ev.state),
        delayDays: ev.delayDays,
        subject: {
          name: topic.unit.subject.name,
          grade: topic.unit.subject.grade,
          section: topic.unit.subject.section,
        },
        unit: { name: topic.unit.name },
        teachers: topic.unit.subject.assignments.map((a) => ({
          id: a.staff.id,
          firstName: a.staff.firstName,
          lastName: a.staff.lastName,
        })),
        reportedByStaff: progress?.reportedBy ? staffMap.get(progress.reportedBy) ?? null : null,
        markedByStaff: progress?.markedBy ? staffMap.get(progress.markedBy) ?? null : null,
        approvedByStaff: progress?.approvedBy ? staffMap.get(progress.approvedBy) ?? null : null,
      }
    })

    return NextResponse.json({
      academicYearId,
      topics: ganttTopics,
      summary: {
        total: ganttTopics.length,
        planned: ganttTopics.filter((t) => t.status === "PLANLANDI").length,
        inProgress: ganttTopics.filter((t) => t.status === "DEVAM_EDIYOR").length,
        pendingApproval: ganttTopics.filter((t) => t.status === "ONAY_BEKLIYOR").length,
        completed: ganttTopics.filter((t) => t.status === "TAMAMLANDI").length,
        delayed: ganttTopics.filter((t) => t.status === "GECIKMELI" || t.status === "GECIKMELI_TAMAMLANDI").length,
      },
    })
  } catch (error) {
    console.error("Error fetching Gantt topics:", error)
    return NextResponse.json({ error: "Gantt verileri getirilirken hata oluştu" }, { status: 500 })
  }
}
