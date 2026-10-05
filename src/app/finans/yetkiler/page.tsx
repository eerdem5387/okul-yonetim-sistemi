"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FinanceTabs } from "../finance-tabs"
import { staffAuthHeaders } from "@/lib/permissions/client"
import { Loader2 } from "lucide-react"

type StaffRow = {
  id: string
  name: string
  department: string
  financeView: boolean
  financeApprove: boolean
}

export default function FinansYetkilerPage() {
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/finans/yetkiler", { headers: staffAuthHeaders() })
      const json = await res.json().catch(() => ({}))
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) throw new Error((json as { error?: string }).error || "Yüklenemedi")
      setRows((json as { staff: StaffRow[] }).staff ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(row: StaffRow, patch: Partial<StaffRow>) {
    setSavingId(row.id)
    setError(null)
    try {
      const res = await fetch("/api/finans/yetkiler", {
        method: "PUT",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: row.id,
          financeView: patch.financeView ?? row.financeView,
          financeApprove: patch.financeApprove ?? row.financeApprove,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Kaydedilemedi")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setSavingId(null)
    }
  }

  if (forbidden) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Erişim yetkileri</h1>
        <FinanceTabs />
        <p className="text-sm text-slate-600">
          Bu alanı yalnızca Kurucu (veya süper admin) yönetebilir.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finans erişim yetkileri</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kurucu olarak diğer personellere finans görüntüleme ve onay hakkı verebilirsiniz.
        </p>
      </div>
      <FinanceTabs />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.department}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.financeView}
                      disabled={savingId === row.id || row.department === "KURUCU"}
                      onChange={(e) =>
                        void save(row, {
                          financeView: e.target.checked,
                          financeApprove: e.target.checked ? row.financeApprove : false,
                        })
                      }
                    />
                    Görüntüle
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.financeApprove}
                      disabled={savingId === row.id || row.department === "KURUCU"}
                      onChange={(e) =>
                        void save(row, {
                          financeApprove: e.target.checked,
                          financeView: e.target.checked ? true : row.financeView,
                        })
                      }
                    />
                    Onayla
                  </label>
                  {savingId === row.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : null}
                </div>
              </div>
            ))}
            {rows.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Aktif personel bulunamadı.</p>
            ) : null}
          </CardContent>
        </Card>
      )}
      <Button variant="outline" onClick={() => void load()}>
        Yenile
      </Button>
    </div>
  )
}
