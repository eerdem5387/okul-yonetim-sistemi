"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarClock,
  ExternalLink,
  Loader2,
  RefreshCw,
  School,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OcgScheduleInsights } from "@/lib/clubs/ocg-schedule-insights"
import { staffAuthHeaders } from "@/lib/permissions/client"

function severityLabel(s: string) {
  if (s === "high") return { text: "Yüksek çakışma", className: "bg-red-100 text-red-800" }
  if (s === "medium") return { text: "Orta çakışma", className: "bg-orange-100 text-orange-800" }
  if (s === "low") return { text: "Düşük çakışma", className: "bg-amber-100 text-amber-800" }
  return { text: "Çakışma yok", className: "bg-emerald-100 text-emerald-800" }
}

function gradesText(grades: number[]) {
  return grades.map((g) => `${g}.`).join(", ")
}

export function ClubOcgInsightsPage({ basePath }: { basePath: string }) {
  const [data, setData] = useState<OcgScheduleInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/clubs/ocg-insights", {
        headers: staffAuthHeaders(),
        cache: "no-store",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((json as { error?: string }).error || "Analiz yüklenemedi")
        setData(null)
        return
      }
      setData(json as OcgScheduleInsights)
    } catch {
      setError("Analiz yüklenemedi")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <Link href={basePath}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kulüp Yönetimine Dön
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              ÖÇG uyumu / Program önerileri
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Kulüp etütleri ile ÖÇG programlarını sınıf düzeyine göre karşılaştırır. Öneriler yol
              gösterir; programı siz güncellersiniz.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Yenile
        </Button>
      </div>

      {loading && !data ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analiz hazırlanıyor…
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      {data ? (
        <>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {data.headline}
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Programlı kulüp</p>
                <p className="text-2xl font-bold mt-1">{data.summary.clubsWithSchedule}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Yüksek çakışma</p>
                <p className="text-2xl font-bold mt-1 text-red-700">
                  {data.summary.highConflictCount}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Çakışmasız</p>
                <p className="text-2xl font-bold mt-1 text-emerald-700">
                  {data.summary.zeroConflictCount}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Takas önerisi</p>
                <p className="text-2xl font-bold mt-1">{data.summary.swapCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <School className="h-5 w-5 text-blue-600" />
                Sınıflara göre ÖÇG yoğun etütler
              </CardTitle>
              <CardDescription>
                Bu saatlerde ilgili sınıf öğrencilerinin çoğu ÖÇG’de olduğu için aynı saatteki
                kulüpleri seçemez.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.gradeLoads.map((g) => (
                <div
                  key={g.grade}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <p className="font-semibold text-slate-900 mb-1">{g.grade}. sınıflar</p>
                  <div className="flex flex-wrap gap-2">
                    {g.slots.slice(0, 6).map((s) => (
                      <span
                        key={s.label}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                      >
                        {s.label} · ~{s.students} öğr.
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
                Önerilen program yer değişimleri
              </CardTitle>
              <CardDescription>
                İki kulübün etütlerini takas ettiğinizde toplam ÖÇG çakışmasının ne kadar
                azalacağını gösterir. Otomatik uygulanmaz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.swaps.length === 0 ? (
                <p className="text-sm text-slate-500">Anlamlı bir takas önerisi bulunamadı.</p>
              ) : (
                data.swaps.map((s) => (
                  <div
                    key={`${s.clubAId}-${s.clubBId}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        Kazanç ~{s.gain}
                      </span>
                      <span className="text-xs text-slate-500">
                        Ortak sınıflar: {gradesText(s.sharedGrades)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800">{s.summary}</p>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="font-semibold text-slate-900">{s.clubAName}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{s.aSlots.join(" · ")}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Sınıflar: {gradesText(s.aGrades)}
                        </p>
                        <Link
                          href={`${basePath}/${s.clubAId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 mt-2 hover:underline"
                        >
                          Programa git <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="font-semibold text-slate-900">{s.clubBName}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{s.bSlots.join(" · ")}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Sınıflar: {gradesText(s.bGrades)}
                        </p>
                        <Link
                          href={`${basePath}/${s.clubBId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 mt-2 hover:underline"
                        >
                          Programa git <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-slate-700" />
                Kulüp çakışma listesi
              </CardTitle>
              <CardDescription>
                Skor yükseldikçe hedef sınıflarda kulübü seçebilecek öğrenci azalır.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.clubs.map((c) => {
                const badge = severityLabel(c.severity)
                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.text}
                        </span>
                        <span className="text-xs text-slate-500">Skor {c.conflictScore}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {c.slots.join(" · ")} · Sınıf: {gradesText(c.grades)}
                      </p>
                      {c.details[0] ? (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {c.details[0].notes[0]}
                        </p>
                      ) : null}
                    </div>
                    <Link href={`${basePath}/${c.id}`}>
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        Programı düzenle
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {data.withoutSchedule.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Programı tanımlı olmayan kulüpler</CardTitle>
                <CardDescription>
                  Veli seçiminde görünmezler. Önce haftalık program atayın.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.withoutSchedule.map((c) => (
                  <Link
                    key={c.id}
                    href={`${basePath}/${c.id}`}
                    className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                  >
                    {c.name}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
