"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FinanceTabs } from "../finance-tabs"
import { staffAuthHeaders } from "@/lib/permissions/client"
import { Loader2 } from "lucide-react"

type RequestRow = {
  id: string
  title: string
  requesterName: string
  channel: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  total: string | number
  quantity: string | number
  unitPrice: string | number
  notes: string | null
  principalApprovedAt: string | null
  founderApprovedAt: string | null
  rejectReason: string | null
}

const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)

export default function FinansTaleplerPage() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/finans/talepler", { headers: staffAuthHeaders() })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Yüklenemedi")
      setRows((json as { requests: RequestRow[] }).requests ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function decide(id: string, action: "approve" | "reject") {
    const reason =
      action === "reject" ? window.prompt("Red gerekçesi (opsiyonel):") ?? "" : undefined
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch("/api/finans/talepler", {
        method: "POST",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "İşlem başarısız")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Harcama talepleri</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kurucu onayı burada verilir. Müdür onayı muhasebe yazılımında yapılır.
        </p>
      </div>
      <FinanceTabs />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">{r.title}</h2>
                    <p className="text-sm text-slate-500">
                      {r.requesterName} · {Number(r.quantity)} × {money(Number(r.unitPrice))} · {r.channel}
                    </p>
                    {r.notes ? <p className="mt-1 text-sm text-slate-600">{r.notes}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(Number(r.total))}</p>
                    <Badge variant="outline">{r.status}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Müdür: {r.principalApprovedAt ? "onayladı" : "bekliyor"}</span>
                  <span>Kurucu: {r.founderApprovedAt ? "onayladı" : "bekliyor"}</span>
                  {r.rejectReason ? <span>Red: {r.rejectReason}</span> : null}
                </div>
                {r.status === "PENDING" && !r.founderApprovedAt ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => void decide(r.id, "approve")}
                    >
                      Kurucu onayı
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === r.id}
                      onClick={() => void decide(r.id, "reject")}
                    >
                      Reddet
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">Kayıt yok.</p> : null}
        </div>
      )}
    </div>
  )
}
