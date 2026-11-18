import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { evaluateTopics } from "@/lib/neredeyiz/calendar"
import { buildSubjectFilter, LATEST_PROGRESS, SUBJECT_EVAL_SELECT } from "@/lib/neredeyiz/report-filters"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

// GET - Genel ilerleme durumu raporu (gecikmeler ders günüyle hesaplanır)
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
      where: { unit: { subject: buildSubjectFilter(searchParams, academicYearId, guard.actor) } },
      include: {
        unit: { select: { subject: { select: SUBJECT_EVAL_SELECT } } },
        progress: LATEST_PROGRESS,
      },
    })

    const evaluated = await evaluateTopics(
      topics,
      (t) => t.unit.subject,
      (t) => t.progress[0],
    )

    type Stats = {
      subjectId: string
      subjectName: string
      grade: number
      section: string | null
      totalTopics: number
      completedTopics: number
      earlyTopics: number
      lateCompletedTopics: number
      inProgressTopics: number
      pendingApprovalTopics: number
      plannedTopics: number
      delayedTopics: number
      completionPercentage: number
    }
    const subjectStats = new Map<string, Stats>()

    for (const { topic, ev } of evaluated) {
      const s = topic.unit.subject
      let row = subjectStats.get(s.id)
      if (!row) {
        row = {
          subjectId: s.id,
          subjectName: s.name,
          grade: s.grade,
          section: s.section,
          totalTopics: 0,
          completedTopics: 0,
          earlyTopics: 0,
          lateCompletedTopics: 0,
          inProgressTopics: 0,
          pendingApprovalTopics: 0,
          plannedTopics: 0,
          delayedTopics: 0,
          completionPercentage: 0,
        }
        subjectStats.set(s.id, row)
      }
      row.totalTopics++
      if (ev.completed) {
        row.completedTopics++
        if (ev.state === "ERKEN_TAMAMLANDI") row.earlyTopics++
        if (ev.state === "GECIKMELI_TAMAMLANDI") row.lateCompletedTopics++
      } else if (ev.pendingApproval) row.pendingApprovalTopics++
      else if (ev.delayed) row.delayedTopics++
      else if (ev.state === "DEVAM_EDIYOR") row.inProgressTopics++
      else row.plannedTopics++
    }

    const subjects = [...subjectStats.values()].map((s) => ({
      ...s,
      completionPercentage: s.totalTopics > 0 ? Math.round((s.completedTopics / s.totalTopics) * 100) : 0,
    }))
    const sum = (k: keyof Stats) => subjects.reduce((acc, s) => acc + (s[k] as number), 0)

    return NextResponse.json({
      academicYearId,
      subjects,
      summary: {
        totalSubjects: subjects.length,
        totalTopics: topics.length,
        completedTopics: sum("completedTopics"),
        earlyTopics: sum("earlyTopics"),
        lateCompletedTopics: sum("lateCompletedTopics"),
        delayedTopics: sum("delayedTopics"),
        pendingApprovalTopics: sum("pendingApprovalTopics"),
        averageCompletion:
          subjects.length > 0
            ? Math.round(subjects.reduce((acc, s) => acc + s.completionPercentage, 0) / subjects.length)
            : 0,
      },
    })
  } catch (error) {
    console.error("Error generating progress report:", error)
    return NextResponse.json({ error: "Rapor oluşturulurken hata oluştu" }, { status: 500 })
  }
}
