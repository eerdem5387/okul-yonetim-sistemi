"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ConflictAssignment = {
  key: string
  kind: "CLUB" | "STUDY_GROUP"
  label: string
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherName: string | null
}

type StudentConflict = {
  studentId: string
  firstName: string
  lastName: string
  grade: string
  dayOfWeek: number
  dayLabel: string
  timeLabel: string
  assignments: ConflictAssignment[]
}

function conflictRowKey(c: StudentConflict) {
  return `${c.studentId}|${c.dayOfWeek}|${c.timeLabel}|${c.assignments.map((a) => a.key).join(",")}`
}

export function StudentConflictsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [conflicts, setConflicts] = useState<StudentConflict[]>([])
  const [keepByRow, setKeepByRow] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/schedules/student-conflicts", {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Çakışmalar alınamadı")
      const list: StudentConflict[] = Array.isArray(data.conflicts)
        ? data.conflicts
        : []
      setConflicts(list)
      const initial: Record<string, string> = {}
      for (const c of list) {
        const k = conflictRowKey(c)
        initial[k] = c.assignments[0]?.key || ""
      }
      setKeepByRow(initial)
    } catch (e) {
      setConflicts([])
      setError(e instanceof Error ? e.message : "Yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const resolve = async (c: StudentConflict) => {
    const rowKey = conflictRowKey(c)
    const keepKey = keepByRow[rowKey]
    if (!keepKey) {
      alert("Öğrencinin kalacağı atamayı seçin.")
      return
    }
    const removeKeys = c.assignments.map((a) => a.key).filter((k) => k !== keepKey)
    if (removeKeys.length === 0) return

    setBusyKey(rowKey)
    try {
      const res = await fetch("/api/schedules/student-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: c.studentId,
          keepKey,
          removeKeys,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "İşlem başarısız")
        return
      }
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        alert(data.errors.join("\n"))
      }
      await load()
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Çakışan öğrenciler
          </DialogTitle>
          <DialogDescription>
            Aynı gün/saatte birden fazla kulüp veya ÖÇG ataması olan öğrenciler.
            Kalacağı seçeneği işaretleyip uygulayın; diğerlerinden çıkarılır.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center gap-2 py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Taranıyor...
            </div>
          ) : error ? (
            <p className="py-10 text-center text-rose-600">{error}</p>
          ) : conflicts.length === 0 ? (
            <div className="py-14 text-center">
              <p className="font-medium text-emerald-800">Çakışma yok</p>
              <p className="mt-1 text-sm text-gray-500">
                Kulüp ve ÖÇG programlarında örtüşen öğrenci bulunamadı.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-amber-800">
                {conflicts.length} çakışma kaydı
              </p>
              {conflicts.map((c) => {
                const rowKey = conflictRowKey(c)
                const busy = busyKey === rowKey
                return (
                  <div
                    key={rowKey}
                    className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {c.grade} · {c.dayLabel} · {c.timeLabel}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void resolve(c)}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Uygula"
                        )}
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-700">
                        Bu saatte nereye gidecek?
                      </p>
                      {c.assignments.map((a) => (
                        <label
                          key={a.key}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                            keepByRow[rowKey] === a.key
                              ? "border-violet-400 bg-violet-50"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            className="mt-1"
                            name={rowKey}
                            checked={keepByRow[rowKey] === a.key}
                            onChange={() =>
                              setKeepByRow((prev) => ({
                                ...prev,
                                [rowKey]: a.key,
                              }))
                            }
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-gray-900">
                              {a.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-600">
                              {a.startTime}–{a.endTime}
                              {a.teacherName ? ` · ${a.teacherName}` : ""}
                              {a.kind === "CLUB" ? " · Kulüp" : " · ÖÇG"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 py-3 flex justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            Yenile
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
