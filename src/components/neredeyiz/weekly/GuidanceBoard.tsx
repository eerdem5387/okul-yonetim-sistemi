"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { Eyebrow, PageShell, postJson, Segmented, StatCard, useJson } from "./shared"

type Cell = {
  subjectId: string
  state: "ok" | "late" | "lateDone" | "unplanned"
  lateCount: number
  maxLateDays: number
  lateDoneReason: string | null
  teachers: string[]
} | null

type BoardResponse = {
  week: { index: number | null; label: string; isBreak: boolean } | null
  subjects: string[]
  rows: Array<{ classId: string; name: string; cells: Cell[] }>
  lateTopics: Array<{
    subjectId: string
    topicId: string
    className: string
    subjectName: string
    topicName: string
    rangeLabel: string
    lateDays: number
    teachers: string[]
    reminded: boolean
  }>
  lateDoneThisWeek: Array<{ subjectId: string; className: string; subjectName: string; topicName: string; reason: string | null; note: string | null; lateDays: number }>
  stats: { okCells: number; totalCells: number; lateCells: number; lateTopicCount: number; lateDoneThisWeekCount: number; topReasons: Array<{ reason: string; count: number }> }
}

function cellView(c: NonNullable<Cell>) {
  if (c.state === "late")
    return { main: `${c.lateCount} konu gecikti`, sub: `en uzun ${c.maxLateDays} ders günü`, cls: "bg-red-700 text-white border-red-800" }
  if (c.state === "lateDone") return { main: "Geç tamamlandı", sub: c.lateDoneReason ?? "", cls: "bg-amber-100 text-amber-950 border-amber-300" }
  if (c.state === "unplanned") return { main: "Plan yok", sub: "hafta girilmedi", cls: "bg-white text-gray-600 border-dashed border-gray-400" }
  return { main: "Zamanında", sub: "", cls: "bg-green-100 text-green-950 border-green-200" }
}

/** Rehberlik / yönetim — haftalık pano: sınıflar × dersler; yalnız gecikmeler öne çıkar. */
export function GuidanceBoard({ detailHref = (id: string) => `/neredeyiz/ders/${id}` }: { detailHref?: (subjectId: string) => string }) {
  const { success, error } = useToast()
  const [grade, setGrade] = useState("all")
  const [mine, setMine] = useState(false)
  const [onlyLate, setOnlyLate] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [reminded, setReminded] = useState<Record<string, boolean>>({})
  const url = `/api/neredeyiz/board?${new URLSearchParams({ ...(grade !== "all" ? { grade } : {}), ...(mine ? { mine: "1" } : {}) })}`
  const { data, loading, error: loadError } = useJson<BoardResponse>(url)

  const sel = useMemo(() => {
    if (!data || !selected) return null
    for (const r of data.rows) {
      const i = r.cells.findIndex((c) => c?.subjectId === selected)
      if (i >= 0) return { row: r, cell: r.cells[i]!, subject: data.subjects[i]! }
    }
    return null
  }, [data, selected])

  async function remind(subjectId: string) {
    try {
      const res = (await postJson(`/api/neredeyiz/subjects/${subjectId}/remind`)) as { alreadyReminded?: boolean }
      setReminded((r) => ({ ...r, [subjectId]: true }))
      success(res.alreadyReminded ? "Bugün zaten hatırlatılmıştı" : "Öğretmene hatırlatma gönderildi")
    } catch (e) {
      error(e instanceof Error ? e.message : "Hatırlatılamadı")
    }
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>NEREDEYİZ? · HAFTALIK PANO</Eyebrow>
          <h1 className="text-[28px] font-bold tracking-tight">Haftalık pano</h1>
          <p className="text-[15px] text-gray-600">
            {data?.week ? `${data.week.isBreak ? "Tatil haftası" : `${data.week.index}. hafta`} · ${data.week.label} · ` : ""}
            Zamanında giden dersler için işlem gerekmez
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Düzey"
            value={grade}
            onChange={setGrade}
            options={[{ value: "all", label: "Tümü" }, ...["5", "6", "7", "8", "9", "10", "11", "12"].map((g) => ({ value: g, label: g }))]}
          />
          <button
            type="button"
            aria-pressed={mine}
            onClick={() => setMine((v) => !v)}
            className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold ${mine ? "border-2 border-indigo-700 bg-indigo-50 text-indigo-800" : "border border-gray-300 bg-white"}`}
          >
            Benim sınıflarım
          </button>
          <button
            type="button"
            aria-pressed={onlyLate}
            onClick={() => setOnlyLate((v) => !v)}
            className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold ${onlyLate ? "border-2 border-indigo-700 bg-indigo-50 text-indigo-800" : "border border-gray-300 bg-white"}`}
          >
            Yalnız gecikenler
          </button>
        </div>
      </div>

      {loadError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{loadError}</p>}
      {loading && !data && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-700" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Zamanında giden ders" value={`${data.stats.okCells} / ${data.stats.totalCells}`} tone="green" sub="işlem gerekmez" />
            <StatCard label="Geciken konu" value={data.stats.lateTopicCount} tone={data.stats.lateTopicCount ? "red" : "neutral"} sub={`${data.stats.lateCells} sınıf-derste`} />
            <StatCard label="Bu hafta geç tamamlanan" value={data.stats.lateDoneThisWeekCount} tone="amber" sub="sebebi bildirildi" />
            <StatCard
              label="En sık gecikme sebebi"
              value={data.stats.topReasons[0]?.reason ?? "—"}
              sub={data.stats.topReasons.slice(1).map((r) => r.reason).join(" · ") || "bu yıl"}
            />
          </div>

          <div className="flex flex-wrap items-start gap-5">
            <div className="min-w-0 flex-[999_1_640px] overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              {data.rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-600">Gösterilecek sınıf yok.</p>
              ) : (
                <div style={{ minWidth: 120 + data.subjects.length * 112 }} className="flex flex-col">
                  <div
                    className="grid gap-1.5 border-b border-gray-200 px-3 pb-2 pt-3"
                    style={{ gridTemplateColumns: `88px repeat(${data.subjects.length}, minmax(0, 1fr))` }}
                  >
                    <span className="pl-1 text-xs font-semibold text-gray-600">Sınıf</span>
                    {data.subjects.map((s) => (
                      <span key={s} className="text-center text-xs font-semibold text-gray-600">
                        {s}
                      </span>
                    ))}
                  </div>
                  {data.rows.map((r) => (
                    <div
                      key={r.classId}
                      className="grid items-center gap-1.5 border-b border-gray-100 px-3 py-1.5"
                      style={{ gridTemplateColumns: `88px repeat(${data.subjects.length}, minmax(0, 1fr))` }}
                    >
                      <span className="pl-1 text-[15px] font-bold">{r.name}</span>
                      {r.cells.map((c, i) => {
                        if (!c) return <span key={i} aria-hidden="true" />
                        const v = cellView(c)
                        const dim = onlyLate && c.state !== "late"
                        return (
                          <button
                            key={c.subjectId}
                            type="button"
                            onClick={() => setSelected(c.subjectId)}
                            aria-label={`${r.name} ${data.subjects[i]}: ${v.main}${v.sub ? `, ${v.sub}` : ""}`}
                            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border p-1 text-[13px] ${v.cls} ${
                              selected === c.subjectId ? "outline outline-[3px] outline-offset-1 outline-indigo-700" : ""
                            } ${dim ? "opacity-25" : ""}`}
                          >
                            <span className="font-semibold">{v.main}</span>
                            {v.sub && <span className="text-[11px]">{v.sub}</span>}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-4 px-4 py-3 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded border border-green-200 bg-green-100" />Zamanında</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded border border-amber-300 bg-amber-100" />Bu hafta geç tamamlandı (sebepli)</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-red-700" />Planlanan aralıkta tamamlanmayan konu var</span>
                  </div>
                </div>
              )}
            </div>

            <aside className="flex flex-[1_1_340px] flex-col gap-4">
              {sel && (
                <section className="flex flex-col gap-2.5 rounded-2xl border-2 border-indigo-300 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[17px] font-bold">
                      {sel.row.name} · {sel.subject}
                    </h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cellView(sel.cell).cls}`}>{cellView(sel.cell).main}</span>
                  </div>
                  <p className="text-[13px] text-gray-600">Öğretmen: {sel.cell.teachers.join(", ") || "atanmamış"}</p>
                  {data.lateTopics
                    .filter((t) => t.subjectId === sel.cell.subjectId)
                    .map((t) => (
                      <p key={t.topicId} className="text-sm">
                        Gecikti: <strong>{t.topicName}</strong> ({t.rangeLabel}, {t.lateDays} ders günü)
                      </p>
                    ))}
                  <Link
                    href={detailHref(sel.cell.subjectId)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-gray-900 text-sm font-semibold text-white"
                  >
                    Konu geçmişini aç
                  </Link>
                </section>
              )}

              <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-1 flex items-baseline justify-between">
                  <h2 className="text-[17px] font-bold">Geciken konular</h2>
                  <span className="text-[13px] text-gray-600">{data.lateTopics.length} konu</span>
                </div>
                {data.lateTopics.length === 0 && <p className="py-3 text-sm text-gray-600">Geciken konu yok.</p>}
                {data.lateTopics.map((t) => {
                  const done = reminded[t.subjectId] || t.reminded
                  return (
                    <div key={t.topicId} className="flex items-center gap-2.5 border-t border-gray-100 py-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-700" aria-hidden="true" />
                      <button type="button" onClick={() => setSelected(t.subjectId)} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                        <span className="text-sm font-semibold">
                          {t.className} · {t.subjectName}
                        </span>
                        <span className="text-[13px]">{t.topicName}</span>
                        <span className="text-xs text-red-800">
                          Plan: {t.rangeLabel} · {t.lateDays} ders günü gecikti
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={done}
                        onClick={() => void remind(t.subjectId)}
                        className={`min-h-[40px] shrink-0 rounded-lg px-3 text-[13px] font-semibold ${
                          done ? "border border-gray-300 bg-white text-gray-700" : "bg-indigo-700 text-white"
                        }`}
                      >
                        {done ? "Hatırlatıldı" : "Hatırlat"}
                      </button>
                    </div>
                  )
                })}
              </section>

              <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-1 text-[17px] font-bold">Bu hafta geç tamamlananlar</h2>
                {data.lateDoneThisWeek.length === 0 && <p className="py-3 text-sm text-gray-600">Yok.</p>}
                {data.lateDoneThisWeek.map((t, i) => (
                  <Link key={i} href={detailHref(t.subjectId)} className="flex flex-col gap-0.5 border-t border-gray-100 py-2.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {t.className} · {t.subjectName} — {t.topicName}
                    </span>
                    <span className="text-[13px] text-amber-900">
                      Geç tamamlandı · {t.reason ?? ""}
                      {t.note ? ` — "${t.note}"` : ""}
                    </span>
                  </Link>
                ))}
              </section>
            </aside>
          </div>
        </>
      )}
    </PageShell>
  )
}
