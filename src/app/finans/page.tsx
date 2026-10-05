"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FinanceTabs } from "./finance-tabs"
import { staffAuthHeaders } from "@/lib/permissions/client"
import { Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function FinansPage() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [incomeTotal, setIncomeTotal] = useState(0)
  const [expenseTotal, setExpenseTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const month = new Date().toISOString().slice(0, 7)
      const [reqRes, cashRes] = await Promise.all([
        fetch("/api/finans/talepler?status=PENDING", { headers: staffAuthHeaders() }),
        fetch(`/api/finans/gelir-gider?month=${month}`, { headers: staffAuthHeaders() }),
      ])
      if (!reqRes.ok || !cashRes.ok) {
        const err = await (reqRes.ok ? cashRes : reqRes).json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "Veriler yüklenemedi")
      }
      const reqJson = await reqRes.json()
      const cashJson = await cashRes.json()
      setPending((reqJson.requests ?? []).length)
      setIncomeTotal(Number(cashJson.incomeTotal ?? 0))
      setExpenseTotal(Number(cashJson.expenseTotal ?? 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function syncFromMuhasebe() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch("/api/finans/talepler", {
        method: "POST",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Senkron başarısız")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Senkron hatası")
    } finally {
      setSyncing(false)
    }
  }

  const money = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Muhasebe yazılımından gelen harcama talepleri ve gelir-gider kayıtları.
          </p>
        </div>
        <Button variant="outline" onClick={() => void syncFromMuhasebe()} disabled={syncing}>
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Muhasebeden yenile
        </Button>
      </div>
      <FinanceTabs />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bekleyen talepler</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pending}</p>
              <Link href="/finans/talepler" className="mt-2 inline-block text-sm text-blue-700 underline">
                Talepleri aç
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bu ay gelir</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-700">{money(incomeTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bu ay gider</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-700">{money(expenseTotal)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
