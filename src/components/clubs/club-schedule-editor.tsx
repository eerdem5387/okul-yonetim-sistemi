"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { staffAuthHeaders } from "@/lib/permissions/client"

type EtutSlot = { startTime: string; endTime: string; label?: string }
type TeacherOption = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}
type ScheduleRow = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  clubGroupId: string | null
  clubId?: string
  club?: { id: string; instructorId?: string | null; instructor?: TeacherOption | null }
  clubGroup?: { id: string; name: string } | null
  instructorId?: string | null
  instructor?: TeacherOption | null
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

function teacherLabel(t?: TeacherOption | null) {
  if (!t) return null
  return `${t.firstName} ${t.lastName}`.trim()
}

export function ClubScheduleEditor({
  clubId,
  initialInstructorId,
}: {
  clubId: string
  initialInstructorId?: string | null
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([])
  const [instructorId, setInstructorId] = useState(initialInstructorId || "")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [schedRes, teachersRes] = await Promise.all([
        fetch("/api/schedules/clubs", {
          headers: staffAuthHeaders(),
          cache: "no-store",
        }),
        fetch("/api/staff/pickers?type=teachers-and-counselors", {
          headers: staffAuthHeaders(),
          cache: "no-store",
        }),
      ])
      if (!schedRes.ok) throw new Error("load")
      const data = await schedRes.json()
      const all = (data.schedules || []) as ScheduleRow[]
      const forClub = all.filter((s) => {
        const cid = s.clubId || s.club?.id
        return cid === clubId
      })
      setSchedules(forClub)
      const slots = Array.isArray(data.etutSlots) ? (data.etutSlots as EtutSlot[]) : []
      setEtutSlots(slots)
      setSelectedSlotKeys((prev) => {
        if (prev.length > 0) return prev.filter((k) => slots.some((s) => slotKeyOf(s) === k))
        return slots.length > 0 ? [slotKeyOf(slots[0])] : []
      })

      if (teachersRes.ok) {
        const tData = await teachersRes.json()
        const list = Array.isArray(tData.staff) ? (tData.staff as TeacherOption[]) : []
        setTeachers(list)
      }

      const clubInstructor =
        forClub.find((s) => s.club?.instructorId || s.club?.instructor?.id)?.club?.instructorId ||
        forClub.find((s) => s.club?.instructor?.id)?.club?.instructor?.id ||
        initialInstructorId ||
        ""
      setInstructorId((prev) => prev || clubInstructor || "")
    } catch {
      setSchedules([])
      setEtutSlots([])
    } finally {
      setLoading(false)
    }
  }, [clubId, initialInstructorId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (initialInstructorId) setInstructorId(initialInstructorId)
  }, [initialInstructorId])

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
    if (!instructorId) {
      alert("Sorumlu öğretmen seçin")
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
            instructorId,
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
            Gün + etüt + öğretmen atayın. Aynı saatteki eski grup programı varsa yenisiyle
            değiştirilir; öğretmenin ders programında bu etütler kulüp olarak görünür.
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
            {schedules.map((s) => {
              const teacher =
                teacherLabel(s.instructor) ||
                teacherLabel(s.club?.instructor) ||
                null
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="font-medium text-slate-800">
                    {dayLabel(s.dayOfWeek)} · {s.startTime}–{s.endTime}
                    {s.clubGroup?.name ? ` · ${s.clubGroup.name}` : ""}
                    {teacher ? ` · ${teacher}` : ""}
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
              )
            })}
            {schedules.length === 0 ? (
              <li className="px-3 py-4 text-sm text-amber-800 bg-amber-50">
                Henüz program yok — veli bu kulübü seçim listesinde görmez.
              </li>
            ) : null}
          </ul>

          <div className="grid gap-3 sm:grid-cols-2">
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
            <div>
              <Label className="text-xs">Sorumlu öğretmen</Label>
              <select
                className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
              >
                <option value="">Öğretmen seçin</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                    {t.subject ? ` (${t.subject})` : ""}
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
            disabled={saving || selectedSlotKeys.length === 0 || !instructorId}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Programa ekle
          </Button>
        </>
      )}
    </div>
  )
}
