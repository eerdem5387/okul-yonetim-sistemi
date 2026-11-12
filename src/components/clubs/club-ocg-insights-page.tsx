"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowLeftRight, Check, ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OcgScheduleInsights } from "@/lib/clubs/ocg-schedule-insights"
import { staffAuthHeaders } from "@/lib/permissions/client"

export function ClubOcgInsightsPage({ basePath }: { basePath: string }) {
  const [data, setData] = useState<OcgScheduleInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [applyingKey, setApplyingKey] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState("")

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
        setError((json as { error?: string }).error || "Öneriler yüklenemedi")
        setData(null)
        return
      }
      setData(json as OcgScheduleInsights)
    } catch {
      setError("Öneriler yüklenemedi")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const applySwap = async (clubAId: string, clubBId: string, clubAName: string, clubBName: string) => {
    const key = `${clubAId}:${clubBId}`
    const ok = window.confirm(
      `«${clubAName}» ile «${clubBName}» kulüplerinin program yerlerini değiştirmek istiyor musunuz?`,
    )
    if (!ok) return

    setApplyingKey(key)
    setActionMessage("")
    setError("")
    try {
      const res = await fetch("/api/clubs/ocg-insights/apply-swap", {
        method: "POST",
        headers: {
          ...staffAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clubAId, clubBId }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        setError(json.error || "Yer değişimi uygulanamadı")
        return
      }
      setActionMessage(json.message || "Program yerleri değiştirildi.")
      await load()
    } catch {
      setError("Yer değişimi uygulanamadı")
    } finally {
      setApplyingKey(null)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <Link href={basePath}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kulüp Yönetimine Dön
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Program değişikliği önerileri</h1>
            <p className="text-gray-600 mt-1 text-sm">
              İki kulübün etüt yerlerini değiştirirseniz kaç öğrencinin daha fazla kulüp seçebileceğini
              gösterir. «Değişikliği Uygula» ile yerleri tek tıkla takas edebilirsiniz.
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

      {actionMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {actionMessage}
        </div>
      ) : null}

      {loading && !data ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Öneriler hazırlanıyor…
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {data.headline}
          </div>

          {data.swaps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500">
                Şu an gösterilecek bir yer değişikliği önerisi yok.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.swaps.map((s) => (
                <Card key={`${s.clubAId}-${s.clubBId}`} className="border-slate-200">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-base">
                        {s.clubAName} ↔ {s.clubBName}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-sm text-emerald-800 font-medium">
                      Yaklaşık {s.extraStudents} öğrenci daha fazla kulüp seçebilir
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-slate-800 leading-relaxed">{s.summary}</p>
                    {s.benefitingGroups.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">Avantaj gören ÖÇG’ler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.benefitingGroups.slice(0, 12).map((name) => (
                            <span
                              key={name}
                              className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800"
                            >
                              {name}
                            </span>
                          ))}
                          {s.benefitingGroups.length > 12 ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                              +{s.benefitingGroups.length - 12} daha
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={applyingKey === `${s.clubAId}:${s.clubBId}` || loading}
                        onClick={() =>
                          void applySwap(s.clubAId, s.clubBId, s.clubAName, s.clubBName)
                        }
                      >
                        {applyingKey === `${s.clubAId}:${s.clubBId}` ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Değişikliği Uygula
                      </Button>
                      <Link href={`${basePath}/${s.clubAId}`}>
                        <Button size="sm" variant="outline">
                          {s.clubAName}
                          <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </Link>
                      <Link href={`${basePath}/${s.clubBId}`}>
                        <Button size="sm" variant="outline">
                          {s.clubBName}
                          <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
