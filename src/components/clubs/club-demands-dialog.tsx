"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type DemandRow = {
  id: string
  createdAt: string
  note: string | null
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber?: string
  }
}

export function ClubDemandsDialog({
  clubId,
  clubName,
  open,
  onOpenChange,
}: {
  clubId: string | null
  clubName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [demands, setDemands] = useState<DemandRow[]>([])
  const [total, setTotal] = useState(0)
  const [meta, setMeta] = useState<{ filled: number; capacity: number } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clubs/${clubId}/demands`, { cache: "no-store" })
      if (!res.ok) throw new Error("fail")
      const data = await res.json()
      setDemands(Array.isArray(data.demands) ? data.demands : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
      setMeta(
        data.club
          ? { filled: data.club.filled, capacity: data.club.capacity }
          : null
      )
    } catch {
      setDemands([])
      setTotal(0)
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    if (open && clubId) void load()
  }, [open, clubId, load])

  const remove = async (demandId: string) => {
    if (!clubId || !confirm("Bu talebi silmek istiyor musunuz?")) return
    setBusyId(demandId)
    try {
      const res = await fetch(`/api/clubs/${clubId}/demands?demandId=${demandId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || "Silinemedi")
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Talepler{clubName ? ` · ${clubName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Kontenjan doluyken oluşturulan bekleyen talepler.
            {meta ? ` Kulüp: ${meta.filled}/${meta.capacity}.` : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10 text-gray-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Yükleniyor...
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-800">
              Toplam talep: <span className="text-indigo-700">{total}</span>
            </p>
            {demands.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">Henüz talep yok.</p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {demands.map((d, index) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {index + 1}. {d.student.firstName} {d.student.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {d.student.grade}
                        {d.student.tcNumber ? ` · TC ${d.student.tcNumber}` : ""}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(d.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600"
                      disabled={busyId === d.id}
                      onClick={() => void remove(d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
