"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2, MapPin, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { departmentLabel, getAuthHeaders } from "./hr-utils"
import { DAY_OF_WEEK_LABELS } from "@/lib/hr/constants"
import type { StaffDepartment } from "@prisma/client"

interface StaffOption {
  id: string
  firstName: string
  lastName: string
  department: StaffDepartment
  subject: string | null
}

interface DutyRecord {
  id: string
  staffId: string
  dayOfWeek: number
  location: string
  notes: string | null
  staff: {
    id: string
    firstName: string
    lastName: string
    department: StaffDepartment
    subject: string | null
  }
}

interface DutyWeeklyEditorProps {
  staffOptions: StaffOption[]
  readOnly?: boolean
  staffId?: string // tek personel için filtreli görünüm
}

const DAYS = [1, 2, 3, 4, 5, 6, 7]

export function DutyWeeklyEditor({ staffOptions, readOnly = false, staffId }: DutyWeeklyEditorProps) {
  const [duties, setDuties] = useState<DutyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{
    day: number
    duty?: DutyRecord
    staffId: string
    location: string
    notes: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = staffId ? `/api/hr/duties?staffId=${staffId}` : "/api/hr/duties"
      const res = await fetch(url, { headers: getAuthHeaders(), cache: "no-store" })
      if (!res.ok) throw new Error("Nöbet listesi yüklenemedi")
      const data = await res.json()
      setDuties(data.duties || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    void load()
  }, [load])

  const grouped = useMemo(() => {
    const out: Record<number, DutyRecord[]> = {}
    for (const d of DAYS) out[d] = []
    for (const d of duties) {
      if (!out[d.dayOfWeek]) out[d.dayOfWeek] = []
      out[d.dayOfWeek].push(d)
    }
    for (const k of Object.keys(out)) {
      out[Number(k)].sort((a, b) => a.location.localeCompare(b.location, "tr"))
    }
    return out
  }, [duties])

  function startNew(day: number) {
    setEditing({ day, staffId: staffId ?? "", location: "", notes: "" })
  }

  function startEdit(duty: DutyRecord) {
    setEditing({
      day: duty.dayOfWeek,
      duty,
      staffId: duty.staffId,
      location: duty.location,
      notes: duty.notes ?? "",
    })
  }

  async function submitEditing() {
    if (!editing) return
    if (!editing.staffId || !editing.location.trim()) {
      setError("Personel ve nöbet yeri zorunlu")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const isUpdate = Boolean(editing.duty)
      const url = isUpdate ? `/api/hr/duties/${editing.duty!.id}` : "/api/hr/duties"
      const res = await fetch(url, {
        method: isUpdate ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          staffId: editing.staffId,
          dayOfWeek: editing.day,
          location: editing.location.trim(),
          notes: editing.notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Kaydedilemedi")
      }
      setEditing(null)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(duty: DutyRecord) {
    if (!confirm(`${duty.staff.firstName} ${duty.staff.lastName} - ${duty.location} nöbeti silinsin mi?`)) return
    try {
      const res = await fetch(`/api/hr/duties/${duty.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Silinemedi")
      }
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DAYS.map((day) => (
          <div key={day} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{DAY_OF_WEEK_LABELS[day]}</h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => startNew(day)}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-50 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ekle
                </button>
              )}
            </div>
            <div className="mt-2 space-y-2">
              {grouped[day].length === 0 && (
                <div className="rounded-md border border-dashed border-gray-200 px-2 py-3 text-center text-xs text-gray-400">
                  Atama yok
                </div>
              )}
              {grouped[day].map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "group flex items-start justify-between gap-2 rounded-md border border-gray-100 bg-gradient-to-r from-blue-50/40 to-indigo-50/40 px-2 py-1.5 text-sm"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{d.location}</span>
                    </div>
                    <div className="truncate text-sm font-medium text-gray-900">
                      {d.staff.firstName} {d.staff.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{departmentLabel(d.staff.department)}</div>
                    {d.notes && <div className="mt-0.5 text-xs italic text-gray-500">{d.notes}</div>}
                  </div>
                  {!readOnly && (
                    <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        className="rounded px-1 py-0.5 text-[11px] text-gray-600 hover:bg-white hover:text-gray-900"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d)}
                        className="rounded px-1 py-0.5 text-[11px] text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {editing.duty ? "Nöbeti Düzenle" : "Yeni Nöbet"} · {DAY_OF_WEEK_LABELS[editing.day]}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="duty-staff">Personel</label>
                <select
                  id="duty-staff"
                  value={editing.staffId}
                  onChange={(e) => setEditing({ ...editing, staffId: e.target.value })}
                  disabled={Boolean(editing.duty) || Boolean(staffId)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Seçiniz</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} · {departmentLabel(s.department)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="duty-location">Nöbet Yeri</label>
                <input
                  id="duty-location"
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: Bahçe, 2. Kat"
                />
              </div>

              <div>
                <label htmlFor="duty-notes">Notlar (opsiyonel)</label>
                <input
                  id="duty-notes"
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Saat aralığı vb."
                />
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={submitting}>
                Vazgeç
              </Button>
              <Button onClick={submitEditing} disabled={submitting}>
                {submitting ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Yardımcı (staff API'den çekilen ham staff'ı bu bileşenin StaffOption'una çevirir)
export function staffToOption(s: {
  id: string
  firstName: string
  lastName: string
  department: StaffDepartment
  subject?: string | null
}): StaffOption {
  return {
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    department: s.department,
    subject: s.subject ?? null,
  }
}
