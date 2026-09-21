"use client"

import { useCallback, useEffect, useState } from "react"
import { Clock, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { normalizeSlotKind, type SlotKind } from "@/lib/schedules/day-templates"

type SlotDraft = {
  key: string
  label: string
  kind: SlotKind
  startTime: string
  endTime: string
}

type Band = "ortaokul" | "lise"

function newKey() {
  return `k-${Math.random().toString(36).slice(2, 9)}`
}

function kindRowClass(kind: SlotKind) {
  if (kind === "BREAK") return "bg-amber-50/70 border-amber-100"
  if (kind === "ETUT") return "bg-emerald-50/70 border-emerald-100"
  return "bg-white border-gray-200"
}

export function DayTemplateEditorDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const [band, setBand] = useState<Band>("ortaokul")
  const [slots, setSlots] = useState<SlotDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (target: Band) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/schedules/day-templates?band=${target}`, { cache: "no-store" })
      if (!res.ok) throw new Error("fail")
      const data = await res.json()
      const rows = Array.isArray(data.slots) ? data.slots : []
      setSlots(
        rows.map(
          (s: { label: string; kind: string; startTime: string; endTime: string }) => ({
            key: newKey(),
            label: s.label,
            kind: normalizeSlotKind(s.kind, s.label),
            startTime: s.startTime,
            endTime: s.endTime,
          })
        )
      )
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void load(band)
  }, [open, band, load])

  const addRow = (kind: SlotKind) => {
    const last = slots[slots.length - 1]
    const start = last?.endTime || "08:00"
    const [h, m] = start.split(":").map(Number)
    const duration = kind === "BREAK" ? 10 : 40
    const endMin = (h || 0) * 60 + (m || 0) + duration
    const endH = Math.floor(endMin / 60)
    const endM = endMin % 60
    const end = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
    const lessonCount = slots.filter((s) => s.kind === "LESSON").length
    const etutCount = slots.filter((s) => s.kind === "ETUT").length
    const label =
      kind === "BREAK"
        ? "Teneffüs"
        : kind === "ETUT"
          ? `${etutCount + 1}. Etüt`
          : `${lessonCount + 1}. Ders`
    setSlots([
      ...slots,
      {
        key: newKey(),
        label,
        kind,
        startTime: start,
        endTime: end,
      },
    ])
  }

  const save = async () => {
    if (slots.some((s) => !s.label.trim() || !s.startTime || !s.endTime)) {
      alert("Tüm satırlarda etiket ve saat dolu olmalı.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/schedules/day-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          band,
          slots: slots.map((s) => ({
            label: s.label.trim(),
            kind: s.kind,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Kaydedilemedi")
        return
      }
      onSaved?.()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[min(94vw,42rem)] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Ders, teneffüs ve etüt saatleri
          </DialogTitle>
          <DialogDescription>
            Ortaokul ve lise için ayrı şablon tanımlayın. Kulüpler yalnızca etüt saatlerine
            yerleştirilir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={band === "ortaokul" ? "default" : "outline"}
            onClick={() => setBand("ortaokul")}
          >
            Ortaokul (5–8)
          </Button>
          <Button
            size="sm"
            variant={band === "lise" ? "default" : "outline"}
            onClick={() => setBand("lise")}
          >
            Lise (9–12)
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-gray-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Yükleniyor...
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_110px_100px_100px_40px] gap-2 text-xs font-medium text-gray-500 px-1">
              <span>Etiket</span>
              <span>Tür</span>
              <span>Başlangıç</span>
              <span>Bitiş</span>
              <span />
            </div>
            {slots.map((slot, index) => (
              <div
                key={slot.key}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_110px_100px_100px_40px] gap-2 items-center rounded-lg border p-2 ${kindRowClass(
                  slot.kind
                )}`}
              >
                <div>
                  <Label className="sm:hidden text-xs">Etiket</Label>
                  <Input
                    value={slot.label}
                    onChange={(e) => {
                      const next = [...slots]
                      next[index] = { ...slot, label: e.target.value }
                      setSlots(next)
                    }}
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs">Tür</Label>
                  <select
                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"
                    value={slot.kind}
                    onChange={(e) => {
                      const kind = normalizeSlotKind(e.target.value)
                      const next = [...slots]
                      let label = slot.label
                      if (kind === "BREAK" && !label.toLocaleLowerCase("tr-TR").includes("teneffüs")) {
                        label = "Teneffüs"
                      } else if (
                        kind === "ETUT" &&
                        !label.toLocaleLowerCase("tr-TR").includes("etüt") &&
                        !label.toLocaleLowerCase("tr-TR").includes("etut")
                      ) {
                        const etutCount = slots.filter((s) => s.kind === "ETUT").length
                        label = `${etutCount + 1}. Etüt`
                      }
                      next[index] = { ...slot, kind, label }
                      setSlots(next)
                    }}
                  >
                    <option value="LESSON">Ders</option>
                    <option value="BREAK">Teneffüs</option>
                    <option value="ETUT">Etüt</option>
                  </select>
                </div>
                <div>
                  <Label className="sm:hidden text-xs">Başlangıç</Label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => {
                      const next = [...slots]
                      next[index] = { ...slot, startTime: e.target.value }
                      setSlots(next)
                    }}
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs">Bitiş</Label>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => {
                      const next = [...slots]
                      next[index] = { ...slot, endTime: e.target.value }
                      setSlots(next)
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-red-600"
                  onClick={() => setSlots(slots.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" size="sm" variant="outline" onClick={() => addRow("LESSON")}>
                <Plus className="h-4 w-4 mr-1" />
                Ders ekle
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addRow("BREAK")}>
                <Plus className="h-4 w-4 mr-1" />
                Teneffüs ekle
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addRow("ETUT")}>
                <Plus className="h-4 w-4 mr-1" />
                Etüt ekle
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Vazgeç
          </Button>
          <Button className="flex-1" onClick={() => void save()} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
