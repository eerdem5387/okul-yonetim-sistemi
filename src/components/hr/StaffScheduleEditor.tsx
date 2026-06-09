"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import type { WeeklyScheduleItem } from "./WeeklyScheduleCalendar"
import { WeeklyScheduleCalendar } from "./WeeklyScheduleCalendar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { dayLabel, getAuthHeaders } from "./hr-utils"

interface ClassOption {
  id: string
  name: string
}

interface StaffScheduleEditorProps {
  staffId: string
  canEdit: boolean
  items: WeeklyScheduleItem[]
  onChanged: () => void
}

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

const emptyForm = {
  classId: "",
  subjectName: "",
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "09:45",
  room: "",
  notes: "",
}

export function StaffScheduleEditor({
  staffId,
  canEdit,
  items,
  onChanged,
}: StaffScheduleEditorProps) {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true)
    try {
      const res = await fetch("/api/classes", { headers: getAuthHeaders(), cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data.classes) ? data.classes : Array.isArray(data) ? data : []
        setClasses(
          list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
        )
      }
    } finally {
      setLoadingClasses(false)
    }
  }, [])

  useEffect(() => {
    if (canEdit) void loadClasses()
  }, [canEdit, loadClasses])

  const grouped = useMemo(() => {
    const map = new Map<number, WeeklyScheduleItem[]>()
    for (const item of items) {
      const arr = map.get(item.dayOfWeek) ?? []
      arr.push(item)
      map.set(item.dayOfWeek, arr)
    }
    return map
  }, [items])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (item: WeeklyScheduleItem) => {
    setEditingId(item.id)
    setForm({
      classId: item.classId,
      subjectName: item.subjectName,
      dayOfWeek: String(item.dayOfWeek),
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room ?? "",
      notes: "",
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.classId || !form.subjectName) {
      alert("Sınıf ve ders adı zorunludur")
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        classId: form.classId,
        subjectName: form.subjectName,
        teacherId: staffId,
        dayOfWeek: parseInt(form.dayOfWeek, 10),
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room || null,
        notes: form.notes || null,
      }
      const url = editingId ? `/api/schedules/${editingId}` : "/api/schedules"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi")
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      onChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Hata")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu dersi programdan silmek istediğinize emin misiniz?")) return
    const res = await fetch(`/api/schedules/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || "Silinemedi")
      return
    }
    onChanged()
  }

  if (!canEdit) {
    return items.length === 0 ? (
      <p className="text-sm text-gray-500">Bu personel için ders programı tanımlı değil.</p>
    ) : (
      <WeeklyScheduleCalendar items={items} />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          Personelin haftalık ders programını buradan yönetebilirsiniz.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Ders Ekle
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
        >
          <h4 className="text-sm font-semibold text-gray-900">
            {editingId ? "Dersi Düzenle" : "Yeni Ders"}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Sınıf</Label>
              <select
                required
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                disabled={loadingClasses}
              >
                <option value="">Seçin</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Ders</Label>
              <Input
                required
                value={form.subjectName}
                onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Gün</Label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {dayLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Başlangıç</Label>
              <Input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Bitiş</Label>
              <Input
                type="time"
                required
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Derslik</Label>
              <Input
                value={form.room}
                onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Not</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
            >
              İptal
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Henüz ders atanmamış.</p>
      ) : (
        <>
          <WeeklyScheduleCalendar items={items} />
          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Gün</th>
                  <th className="px-3 py-2">Saat</th>
                  <th className="px-3 py-2">Sınıf</th>
                  <th className="px-3 py-2">Ders</th>
                  <th className="px-3 py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {DAY_OPTIONS.flatMap((day) => {
                  const dayItems = grouped.get(day) ?? []
                  return dayItems.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{dayLabel(item.dayOfWeek)}</td>
                      <td className="px-3 py-2">
                        {item.startTime} – {item.endTime}
                      </td>
                      <td className="px-3 py-2">{item.className}</td>
                      <td className="px-3 py-2">{item.subjectName}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-600"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
