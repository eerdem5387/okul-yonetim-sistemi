"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { staffAuthHeaders } from "@/lib/permissions/client"

type EtutSlot = { startTime: string; endTime: string; label?: string }
type ScheduleRow = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  clubGroupId: string | null
  clubId?: string
  club?: { id: string }
}

const DAY_OPTIONS = [
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "Salı" },
  { value: 3, label: "Çarşamba" },
  { value: 4, label: "Perşembe" },
  { value: 5, label: "Cuma" },
]

function slotKeyOf(s: Pick<EtutSlot, "startTime" | "endTime">) {
  return `${s.startTime}|${s.endTime}`
}

export function ClubScheduleEditor({ clubId }: { clubId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/schedules/clubs", {
        headers: staffAuthHeaders(),
        cache: "no-store",
      })
      if (!res.ok) throw new Error("load")
      const data = await res.json()
      const all = (data.schedules || []) as ScheduleRow[]
      const clubLevel = all.filter((s) => {
        const cid = s.clubId || s.club?.id
        return cid === clubId && !s.clubGroupId
      })
      setSchedules(clubLevel)
      const slots = Array.isArray(data.etutSlots) ? (data.etutSlots as EtutSlot[]) : []
      setEtutSlots(slots)
      setSelectedSlotKeys((prev) => {
        if (prev.length > 0) return prev.filter((k) => slots.some((s) => slotKeyOf(s) === k))
        return slots.length > 0 ? [slotKeyOf(slots[0])] : []
      })
    } catch {
      setSchedules([])
      setEtutSlots([])
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    void load()
  }, [load])

  const toggleSlot = (key: string) => {
    setSelectedSlotKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const add = async () => {
    if (selectedSlotKeys.length === 0) {
      alert("En az bir etüt saati seçin")
      return
    }
    setSaving(true)
    try {
      const errors: string[] = []
      for (const key of selectedSlotKeys) {
        const [startTime, endTime] = key.split("|")
        const res = await fetch("/api/schedules/clubs", {
          method: "POST",
          headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            clubId,
            dayOfWeek,
            startTime,
            endTime,
          }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          const label =
            etutSlots.find((s) => slotKeyOf(s) === key)?.label || `${startTime}–${endTime}`
          errors.push(`${label}: ${(j as { error?: string }).error || "eklenemedi"}`)
        }
      }
      await load()
      if (errors.length > 0) {
        alert(errors.join("\n"))
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm("Bu program satırını silmek istiyor musunuz?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/schedules/clubs/${id}`, {
        method: "DELETE",
        headers: staffAuthHeaders(),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert((j as { error?: string }).error || "Silinemedi")
        return
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  const dayLabel = (d: number) => DAY_OPTIONS.find((x) => x.value === d)?.label || `Gün ${d}`

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 h-5 w-5 text-blue-600" />
        <div>
          <h3 className="font-semibold text-slate-900">Haftalık kulüp programı</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Veli seçiminde öğrenci yalnızca ÖÇG programıyla çakışmayan kulüpleri görür. Aynı gün için
            bir veya iki etüt saatini birlikte seçebilirsiniz.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {schedules.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="font-medium text-slate-800">
                  {dayLabel(s.dayOfWeek)} · {s.startTime}–{s.endTime}
                  {s.room ? ` · ${s.room}` : ""}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-red-700"
                  disabled={saving}
                  onClick={() => void remove(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
            {schedules.length === 0 ? (
              <li className="px-3 py-4 text-sm text-amber-800 bg-amber-50">
                Henüz program yok — veli bu kulübü seçim listesinde görmez.
              </li>
            ) : null}
          </ul>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Gün</Label>
              <select
                className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Etüt saati</Label>
              {etutSlots.length === 0 ? (
                <p className="mt-1 rounded-md border border-dashed px-2 py-2 text-sm text-slate-500">
                  Etüt slotu yok (ders programı şablonunu kontrol edin)
                </p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-2">
                  {etutSlots.map((s) => {
                    const key = slotKeyOf(s)
                    const checked = selectedSlotKeys.includes(key)
                    return (
                      <label
                        key={key}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          checked
                            ? "border-blue-500 bg-blue-50 text-blue-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={checked}
                          onChange={() => toggleSlot(key)}
                        />
                        <span className="font-medium">{s.label || `${s.startTime}–${s.endTime}`}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void add()}
            disabled={saving || selectedSlotKeys.length === 0}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Programa ekle
          </Button>
        </>
      )}
    </div>
  )
}
