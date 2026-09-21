"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  club: ClubRow & {
    selections?: Array<{
      student: { id: string; firstName: string; lastName: string; grade: string }
    }>
  }
}

export function ClubSchedulesPanel() {
  const [clubs, setClubs] = useState<ClubRow[]>([])
  const [schedules, setSchedules] = useState<ClubScheduleRow[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedClubId, setSelectedClubId] = useState("")
  const [dayOfWeek, setDayOfWeek] = useState("1")
  const [slotKey, setSlotKey] = useState("")
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

  const schedulesByClub = useMemo(() => {
    const map = new Map<string, ClubScheduleRow[]>()
    for (const s of schedules) {
      const list = map.get(s.clubId) ?? []
      list.push(s)
      map.set(s.clubId, list)
    }
    return map
  }, [schedules])

  const openAssign = (clubId?: string) => {
    setSelectedClubId(clubId || "")
    setDayOfWeek("1")
    setSlotKey(etutSlots[0] ? `${etutSlots[0].startTime}|${etutSlots[0].endTime}` : "")
    setRoom("")
    setModalOpen(true)
  }

  const save = async () => {
    if (!selectedClubId || !slotKey) {
      alert("Kulüp ve etüt saati seçin.")
      return
    }
    const [startTime, endTime] = slotKey.split("|")
    setBusy(true)
    try {
      const res = await fetch("/api/schedules/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: selectedClubId,
          dayOfWeek: parseInt(dayOfWeek, 10),
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
    if (!confirm("Bu kulüp saatini programdan kaldırmak istiyor musunuz?")) return
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Kulüp programı</h2>
          <p className="text-sm text-gray-600">
            Kulüpleri yalnızca etüt saatlerine yerleştirin. Üyeler kulüp seçiminden gelir.
          </p>
        </div>
        <Button size="sm" onClick={() => openAssign()} disabled={etutSlots.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Etüte yerleştir
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {etutSlots.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-4 text-sm text-amber-900">
            Henüz etüt saati yok. <strong>Ders saatleri</strong> içinde türü{" "}
            <strong>Etüt</strong> olan satırlar ekleyin; ardından kulüpleri buraya
            yerleştirebilirsiniz.
          </CardContent>
        </Card>
      )}

      {clubs.length === 0 ? (
        <p className="text-sm text-gray-500 py-10 text-center">Tanımlı kulüp yok.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clubs.map((club) => {
            const rows = schedulesByClub.get(club.id) ?? []
            return (
              <Card key={club.id} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{club.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {club._count.selections}/{club.capacity} üye
                        </span>
                        {club.instructor && (
                          <span className="ml-2">
                            · {club.instructor.firstName} {club.instructor.lastName}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={etutSlots.length === 0}
                      onClick={() => openAssign(club.id)}
                    >
                      Yerleştir
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rows.length === 0 ? (
                    <p className="text-xs text-gray-500">Henüz etüt saati atanmadı.</p>
                  ) : (
                    rows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {DAY_NAMES[row.dayOfWeek]} · {row.startTime}–{row.endTime}
                          </p>
                          {row.room && (
                            <p className="text-xs text-gray-500">Derslik: {row.room}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600"
                          disabled={busy}
                          onClick={() => void remove(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kulübü etüte yerleştir</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
                    {c.name} ({c._count.selections} üye)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Gün *</Label>
              <select
                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
              >
                {WEEKDAY_INDEXES.map((d) => (
                  <option key={d} value={d}>
                    {DAY_NAMES[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Etüt saati *</Label>
              <select
                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                value={slotKey}
                onChange={(e) => setSlotKey(e.target.value)}
              >
                {etutSlots.length === 0 ? (
                  <option value="">Etüt tanımlı değil</option>
                ) : (
                  etutSlots.map((s) => (
                    <option key={`${s.startTime}|${s.endTime}`} value={`${s.startTime}|${s.endTime}`}>
                      {s.label} · {s.startTime}–{s.endTime}
                    </option>
                  ))
                )}
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
