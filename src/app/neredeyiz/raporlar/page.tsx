"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Eyebrow, PageShell, Segmented, StatCard, useJson } from "@/components/neredeyiz/weekly/shared"

type Counts = { total: number; onTime: number; lateDone: number; late: number; unplanned: number; due: number }
type Overview = {
  totals: Counts
  subjects: Array<Counts & { subjectId: string; className: string; subjectName: string; teachers: string[] }>
  teachers: Array<Counts & { staffId: string; name: string; subjects: number }>
  reasons: Array<{ reason: string; count: number; percent: number }>
}
type Disruptions = {
  disruptions: Array<{ type: string; typeLabel: string; count: number; totalDays: number; percentage: number }>
  summary: { totalDisruptions: number; totalDays: number }
}
type Year = { id: string; name: string; isActive: boolean }
type View = "subjects" | "teachers"

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

/** Neredeyiz? — Yıllık özet (rehberlik / yönetim). */
export default function NeredeyizYillikOzetPage() {
  const [years, setYears] = useState<Year[]>([])
  const [yearId, setYearId] = useState("")
  const [view, setView] = useState<View>("subjects")
  const [onlyLate, setOnlyLate] = useState(false)

  useEffect(() => {
    fetch("/api/neredeyiz/academic-years")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Year[]) => {
        setYears(Array.isArray(d) ? d : [])
        const active = (Array.isArray(d) ? d : []).find((y) => y.isActive)
        if (active) setYearId(active.id)
      })
      .catch(() => setYears([]))
  }, [])

  const q = yearId ? `?academicYearId=${yearId}` : ""
  const overview = useJson<Overview>(yearId ? `/api/neredeyiz/reports/overview${q}` : null)
  const disruptions = useJson<Disruptions>(yearId ? `/api/neredeyiz/reports/disruptions${q}` : null)
  const o = overview.data

  const subjectRows = useMemo(
    () => (o?.subjects ?? []).filter((s) => !onlyLate || s.late > 0).sort((a, b) => b.late - a.late || a.className.localeCompare(b.className, "tr")),
    [o, onlyLate],
  )

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>NEREDEYİZ?</Eyebrow>
          <h1 className="text-[28px] font-bold tracking-tight">Yıllık özet</h1>
          <p className="text-[15px] text-gray-600">Bugüne kadar bitmesi planlanan konuların ne kadarı zamanında tamamlandı?</p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Akademik yıl
          <select value={yearId} onChange={(e) => setYearId(e.target.value)} className="min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900">
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isActive ? " (aktif)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {overview.error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{overview.error}</p>}
      {overview.loading && !o && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-700" />
        </div>
      )}

      {o && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Zamanında tamamlanan" value={o.totals.onTime} tone="green" sub={`bitmesi gereken ${o.totals.due} konunun %${pct(o.totals.onTime, o.totals.due)}'i`} />
            <StatCard label="Geç tamamlanan" value={o.totals.lateDone} tone="amber" sub="sebebi bildirildi" />
            <StatCard label="Geciken (tamamlanmadı)" value={o.totals.late} tone={o.totals.late ? "red" : "neutral"} sub="rehberlik panosunda" />
            <StatCard label="Haftası girilmemiş konu" value={o.totals.unplanned} sub={`toplam ${o.totals.total} konu`} />
          </div>

          <div className="flex flex-wrap items-start gap-5">
            <section className="min-w-0 flex-[999_1_640px] overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
                <Segmented<View>
                  label="Görünüm"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "subjects", label: "Sınıf · ders" },
                    { value: "teachers", label: "Öğretmen" },
                  ]}
                />
                {view === "subjects" && (
                  <button
                    type="button"
                    aria-pressed={onlyLate}
                    onClick={() => setOnlyLate((v) => !v)}
                    className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold ${onlyLate ? "border-2 border-indigo-700 bg-indigo-50 text-indigo-800" : "border border-gray-300 bg-white"}`}
                  >
                    Yalnız gecikenler
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th scope="col" className="px-4 py-3">{view === "subjects" ? "Sınıf · ders" : "Öğretmen"}</th>
                      <th scope="col" className="px-3 py-3">Zamanında</th>
                      <th scope="col" className="px-3 py-3">Geç</th>
                      <th scope="col" className="px-3 py-3">Geciken</th>
                      <th scope="col" className="px-3 py-3">Toplam</th>
                      <th scope="col" className="px-4 py-3">Zamanında oranı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(view === "subjects" ? subjectRows : o.teachers).map((r) => {
                      const isSubject = "subjectId" in r
                      const rate = pct(r.onTime, r.due)
                      return (
                        <tr key={isSubject ? r.subjectId : r.staffId} className={`border-b border-gray-100 ${r.late ? "bg-red-50" : ""}`}>
                          <td className="px-4 py-3">
                            {isSubject ? (
                              <Link href={`/neredeyiz/ders/${r.subjectId}`} className="flex flex-col">
                                <span className="font-semibold text-gray-900">
                                  {r.className} · {r.subjectName}
                                </span>
                                <span className="text-xs text-gray-600">{r.teachers.join(", ") || "öğretmen atanmamış"}</span>
                              </Link>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-semibold">{r.name}</span>
                                <span className="text-xs text-gray-600">{r.subjects} sınıf-ders</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-green-900">{r.onTime}</td>
                          <td className="px-3 py-3 text-amber-900">{r.lateDone}</td>
                          <td className={`px-3 py-3 ${r.late ? "font-bold text-red-800" : ""}`}>{r.late}</td>
                          <td className="px-3 py-3 text-gray-700">{r.total}</td>
                          <td className="px-4 py-3">
                            {r.due ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                                  <div className={`h-full ${rate >= 80 ? "bg-green-600" : rate >= 50 ? "bg-amber-500" : "bg-red-700"}`} style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-xs font-semibold">%{rate}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">henüz bitmesi gereken yok</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {(view === "subjects" ? subjectRows : o.teachers).length === 0 && (
                  <p className="p-6 text-center text-sm text-gray-600">Gösterilecek kayıt yok.</p>
                )}
              </div>
            </section>

            <aside className="flex flex-[1_1_320px] flex-col gap-4">
              <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-[17px] font-bold">Gecikme sebepleri</h2>
                {o.reasons.length === 0 && <p className="text-sm text-gray-600">Henüz geç tamamlanan konu yok.</p>}
                {o.reasons.map((r) => (
                  <div key={r.reason} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{r.reason}</span>
                      <span className="font-semibold">
                        {r.count} · %{r.percent}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                      <div className="h-full bg-indigo-700" style={{ width: `${r.percent}%` }} />
                    </div>
                  </div>
                ))}
              </section>

              <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[17px] font-bold">Aksamalar</h2>
                  <Link href="/neredeyiz/aksamalar" className="text-sm font-semibold text-indigo-700">
                    Yönet
                  </Link>
                </div>
                {disruptions.data && disruptions.data.summary.totalDisruptions === 0 && (
                  <p className="text-sm text-gray-600">Bu yıl aksama kaydı yok.</p>
                )}
                {disruptions.data?.disruptions.map((d) => (
                  <div key={d.type} className="flex justify-between text-sm">
                    <span>{d.typeLabel}</span>
                    <span className="font-semibold">
                      {d.count} kayıt · {d.totalDays} ders günü
                    </span>
                  </div>
                ))}
                {disruptions.data && disruptions.data.summary.totalDisruptions > 0 && (
                  <p className="text-xs text-gray-600">Aksama günleri ilgili derslerde gecikme hesabına katılmaz.</p>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </PageShell>
  )
}
