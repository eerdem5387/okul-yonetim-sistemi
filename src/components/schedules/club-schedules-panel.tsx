"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DAY_NAMES, WEEKDAY_INDEXES } from "@/lib/schedules/lesson-slots"

type Instructor = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

type ClubRow = {
  id: string
  name: string
  capacity: number
  gradeLevels: number[]
  instructor: Instructor | null
  _count: { selections: number }
}

type EtutSlot = {
  label: string
  startTime: string
  endTime: string
  band: string
}

type ClubScheduleRow = {
  id: string
  clubId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  notes: string | null
  club: ClubRow
}

export function ClubSchedulesPanel() {
  const [clubs, setClubs] = useState<ClubRow[]>([])
  const [schedules, setSchedules] = useState<ClubScheduleRow[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedClubId, setSelectedClubId] = useState("")
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [slotLabel, setSlotLabel] = useState("")
  const [room, setRoom] = useState("")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/schedules/clubs", { cache: "no-store" })
      if (!res.ok) throw new Error("Kulüp programları alınamadı")
      const data = await res.json()
      setClubs(Array.isArray(data.clubs) ? data.clubs : [])
      setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
      setEtutSlots(Array.isArray(data.etutSlots) ? data.etutSlots : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setClubs([])
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const cellEntries = useCallback(
    (day: number, start: string, end: string) =>
      schedules.filter(
        (s) => s.dayOfWeek === day && s.startTime === start && s.endTime === end
      ),
    [schedules]
  )

  const openCell = (day: number, slot: EtutSlot) => {
    setDayOfWeek(day)
    setStartTime(slot.startTime)
    setEndTime(slot.endTime)
    setSlotLabel(slot.label)
    setSelectedClubId("")
    setRoom("")
    setModalOpen(true)
  }

  const save = async () => {
    if (!selectedClubId || !startTime || !endTime) {
      alert("Kulüp seçin.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/schedules/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: selectedClubId,
          dayOfWeek,
          startTime,
          endTime,
          room: room.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Kayıt başarısız")
        return
      }
      setModalOpen(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Bu kulübü etütten kaldırmak istiyor musunuz?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/schedules/clubs/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || "Silinemedi")
        return
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  const unassignedClubs = useMemo(() => {
    const assigned = new Set(schedules.map((s) => s.clubId))
    return clubs.filter((c) => !assigned.has(c.id))
  }, [clubs, schedules])

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Haftalık etüt programı — Kulüpler</h2>
        <p className="text-sm text-gray-600">
          Etüt hücresine tıklayarak kulüp yerleştirin. Üyeler kulüp seçiminden gelir.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {etutSlots.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
          Henüz etüt saati yok. <strong>Ders saatleri</strong> içinde türü{" "}
          <strong>Etüt</strong> olan satırlar ekleyin.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-r border-gray-200 p-2 text-xs font-semibold text-gray-700 w-28">
                  Etüt
                </th>
                {WEEKDAY_INDEXES.map((day) => (
                  <th
                    key={day}
                    className="border-b border-gray-200 p-2 text-xs font-semibold text-gray-700"
                  >
                    {DAY_NAMES[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {etutSlots.map((slot) => (
                <tr key={`${slot.startTime}-${slot.endTime}`}>
                  <td className="border-b border-r border-gray-200 p-2 text-xs font-medium bg-emerald-50 text-emerald-900">
                    <div>{slot.label}</div>
                    <div className="text-[10px] opacity-70 font-normal">
                      {slot.startTime}–{slot.endTime}
                    </div>
                  </td>
                  {WEEKDAY_INDEXES.map((day) => {
                    const entries = cellEntries(day, slot.startTime, slot.endTime)
                    return (
                      <td
                        key={`${day}-${slot.startTime}`}
                        className="border-b border-gray-100 p-1.5 align-top cursor-pointer hover:bg-emerald-50/80 transition-colors min-h-[4rem]"
                        onClick={() => openCell(day, slot)}
                      >
                        {entries.length === 0 ? (
                          <div className="flex h-14 items-center justify-center text-gray-300">
                            <Plus className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {entries.map((row) => (
                              <div
                                key={row.id}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 leading-tight truncate">
                                      {row.club.name}
                                    </p>
                                    <p className="text-[10px] text-gray-600">
                                      {row.club._count.selections}/{row.club.capacity} üye
                                    </p>
                                    {row.room && (
                                      <p className="text-[10px] text-gray-500">{row.room}</p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="shrink-0 text-red-600 p-0.5"
                                    disabled={busy}
                                    onClick={() => void remove(row.id)}
                                    title="Kaldır"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="w-full text-[10px] text-emerald-700 py-0.5 hover:underline"
                              onClick={() => openCell(day, slot)}
                            >
                              + Ekle
                            </button>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unassignedClubs.length > 0 && (
        <p className="text-xs text-gray-500">
          Henüz programa alınmayan kulüp: {unassignedClubs.length} (
          {unassignedClubs
            .slice(0, 5)
            .map((c) => c.name)
            .join(", ")}
          {unassignedClubs.length > 5 ? "…" : ""})
        </p>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kulübü etüte yerleştir</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {DAY_NAMES[dayOfWeek]} · {slotLabel || `${startTime}–${endTime}`} ({startTime}–
              {endTime})
            </p>
            <div>
              <Label>Kulüp *</Label>
              <select
                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
              >
                <option value="">Seçiniz</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c._count.selections}/{c.capacity})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Derslik (opsiyonel)</Label>
              <Input
                className="mt-1"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Örn: Spor salonu"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={() => void save()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
