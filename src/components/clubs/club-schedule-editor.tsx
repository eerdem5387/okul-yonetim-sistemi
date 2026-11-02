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

export function ClubScheduleEditor({ clubId }: { clubId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [slotKey, setSlotKey] = useState("")

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
      setSlotKey((prev) => {
        if (prev) return prev
        if (slots.length === 0) return ""
        return `${slots[0].startTime}|${slots[0].endTime}`
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

  const add = async () => {
    if (!slotKey) {
      alert("Etüt saati seçin")
      return
    }
    const [startTime, endTime] = slotKey.split("|")
    setSaving(true)
    try {
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
        alert((j as { error?: string }).error || "Program eklenemedi")
        return
      }
      await load()
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
            Veli seçiminde öğrenci yalnızca ÖÇG programıyla çakışmayan kulüpleri görür. En az bir
            etüt saati tanımlayın.
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
              <select
                className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                value={slotKey}
                onChange={(e) => setSlotKey(e.target.value)}
              >
                {etutSlots.length === 0 ? (
                  <option value="">Etüt slotu yok (ders programı şablonunu kontrol edin)</option>
                ) : (
                  etutSlots.map((s) => (
                    <option key={`${s.startTime}-${s.endTime}`} value={`${s.startTime}|${s.endTime}`}>
                      {s.label || `${s.startTime}–${s.endTime}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          <Button type="button" size="sm" onClick={() => void add()} disabled={saving || !slotKey}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Programa ekle
          </Button>
        </>
      )}
    </div>
  )
}
