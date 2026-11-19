import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { forbidden, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { todayKey, topicScopeOf } from "@/lib/neredeyiz/calendar"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"
import { evaluateWeeklyTopic, LATE_REASON_LABELS, loadYearContexts } from "@/lib/neredeyiz/weeks"

/**
 * GET /api/neredeyiz/reports/overview — Yıllık özet (rehberlik / yönetim).
 * Sınıf-ders ve öğretmen bazında: toplam, zamanında, geç tamamlanan, geciken, haftası girilmemiş konu;
 * gecikme sebeplerinin dağılımı.
 */
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  if (guard.actor.isTeacher && !guard.actor.superAdmin) return forbidden("Raporlar rehberlik ve yönetim içindir.")
  try {
    const academicYearId = await resolveNeredeyizYearId(request.nextUrl.searchParams)
    if (!academicYearId) return NextResponse.json({ error: "Akademik yıl bulunamadı" }, { status: 404 })

    const [subjects, ctxMap] = await Promise.all([
      prisma.subject.findMany({
        where: { academicYearId },
        orderBy: [{ grade: "asc" }, { section: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          grade: true,
          section: true,
          classId: true,
          academicYearId: true,
          class: { select: { name: true } },
          assignments: { select: { staffId: true, staff: { select: { firstName: true, lastName: true } } } },
          units: { select: { topics: { select: { plannedStartWeek: true, plannedEndWeek: true, completion: true } } } },
        },
      }),
      loadYearContexts([academicYearId]),
    ])
    const ctx = ctxMap.get(academicYearId)!
    const today = todayKey()

    type Row = { total: number; onTime: number; lateDone: number; late: number; unplanned: number; due: number }
    const empty = (): Row => ({ total: 0, onTime: 0, lateDone: 0, late: 0, unplanned: 0, due: 0 })
    const reasons = new Map<string, number>()
    const teachers = new Map<string, Row & { name: string; subjects: number }>()
    const totals = empty()

    const rows = subjects.map((s) => {
      const r = empty()
      const scope = topicScopeOf(s)
      for (const t of s.units.flatMap((u) => u.topics)) {
        const ev = evaluateWeeklyTopic(t, t.completion, ctx.weeks, ctx.cal, scope, today)
        r.total++
        if (ev.state === "TAMAMLANDI") r.onTime++
        else if (ev.state === "GEC_TAMAMLANDI") r.lateDone++
        else if (ev.state === "GECIKTI") r.late++
        else if (ev.state === "PLANSIZ") r.unplanned++
        // Bugüne kadar bitmesi gereken konular (tamamlanma oranı için)
        if (ev.plannedEndKey && ev.plannedEndKey < today) r.due++
        if (t.completion?.lateReason) reasons.set(t.completion.lateReason, (reasons.get(t.completion.lateReason) ?? 0) + 1)
      }
      for (const k of Object.keys(totals) as Array<keyof Row>) totals[k] += r[k]
      for (const a of s.assignments) {
        const row = teachers.get(a.staffId) ?? { ...empty(), name: `${a.staff.firstName} ${a.staff.lastName}`, subjects: 0 }
        row.subjects++
        for (const k of Object.keys(r) as Array<keyof Row>) row[k] += r[k]
        teachers.set(a.staffId, row)
      }
      return {
        subjectId: s.id,
        className: s.class?.name ?? `${s.grade}${s.section ? `/${s.section}` : ""}`,
        subjectName: s.name,
        teachers: s.assignments.map((a) => `${a.staff.firstName} ${a.staff.lastName}`),
        ...r,
      }
    })

    const reasonTotal = [...reasons.values()].reduce((a, b) => a + b, 0)
    return NextResponse.json({
      academicYearId,
      totals,
      subjects: rows,
      teachers: [...teachers.entries()]
        .map(([staffId, t]) => ({ staffId, ...t }))
        .sort((a, b) => b.late - a.late || a.name.localeCompare(b.name, "tr")),
      reasons: [...reasons.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => ({
          reason: LATE_REASON_LABELS[k as keyof typeof LATE_REASON_LABELS],
          count: n,
          percent: reasonTotal ? Math.round((n / reasonTotal) * 100) : 0,
        })),
    })
  } catch (error) {
    console.error("reports/overview", error)
    return NextResponse.json({ error: "Rapor oluşturulamadı" }, { status: 500 })
  }
}
