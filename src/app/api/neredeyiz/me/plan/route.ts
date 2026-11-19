import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/neredeyiz/access"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"
import { formatRangeTr } from "@/lib/neredeyiz/weeks"
import { classLabel, evaluateSubjectTopics, loadTeacherSubjects, teacherYearContext, weekInfo } from "@/lib/neredeyiz/teacher-view"

/**
 * GET /api/neredeyiz/me/plan?subjectId= — Öğretmenin "Yıllık planım" ekranı.
 * Dersleri (sekmeler) ve seçili dersin tüm yılı: ünite/konu sırası, durum, tatil haftaları ve bugünün yeri.
 */
export async function GET(request: NextRequest) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const sp = request.nextUrl.searchParams
    const academicYearId = await resolveNeredeyizYearId(sp)
    if (!academicYearId) return NextResponse.json({ error: "Aktif akademik yıl bulunamadı" }, { status: 404 })

    const [subjects, ctx] = await Promise.all([
      loadTeacherSubjects(guard.actor.staffId, academicYearId),
      teacherYearContext(academicYearId),
    ])
    const tabs = subjects.map((s) => ({ subjectId: s.id, className: classLabel(s), subjectName: s.name }))
    const selected = subjects.find((s) => s.id === sp.get("subjectId")) ?? subjects[0] ?? null
    if (!selected) {
      return NextResponse.json({ academicYearId, tabs, selected: null, units: [], breaks: [], week: weekInfo(ctx.currentWeek) })
    }

    const rows = evaluateSubjectTopics(selected, ctx)
    const units = selected.units.map((u) => ({
      id: u.id,
      name: u.name,
      topics: rows.filter((r) => r.unit.id === u.id).map((r) => ({ ...r.view, plannedStartWeek: r.topic.plannedStartWeek, plannedEndWeek: r.topic.plannedEndWeek })),
    }))
    const all = rows.map((r) => r.ev)
    // Tatil haftaları (art arda olanlar birleşir): kendinden önceki ders haftasının ardına yerleşir
    const breaks: Array<{ afterWeek: number; label: string }> = []
    let lastIdx = 0
    let open: { afterWeek: number; startKey: string; endKey: string } | null = null
    for (const w of ctx.weeks) {
      if (w.index != null) {
        if (open) breaks.push({ afterWeek: open.afterWeek, label: formatRangeTr(open.startKey, open.endKey) })
        open = null
        lastIdx = w.index
      } else if (open) open.endKey = w.endKey
      else open = { afterWeek: lastIdx, startKey: w.startKey, endKey: w.endKey }
    }
    if (open) breaks.push({ afterWeek: open.afterWeek, label: formatRangeTr(open.startKey, open.endKey) })

    return NextResponse.json({
      academicYearId,
      tabs,
      selected: {
        subjectId: selected.id,
        className: classLabel(selected),
        subjectName: selected.name,
        totalTopics: all.length,
        completed: all.filter((e) => e.state === "TAMAMLANDI" || e.state === "GEC_TAMAMLANDI").length,
        late: all.filter((e) => e.state === "GECIKTI").length,
        unplanned: all.filter((e) => e.state === "PLANSIZ").length,
        notes: selected.notes
          .filter((n) => !n.topicId)
          .map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt.toISOString() })),
      },
      units,
      breaks,
      totalWeeks: ctx.totalWeeks,
      week: weekInfo(ctx.currentWeek),
    })
  } catch (error) {
    console.error("me/plan", error)
    return NextResponse.json({ error: "Yıllık plan yüklenemedi" }, { status: 500 })
  }
}
