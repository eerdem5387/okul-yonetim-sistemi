"use client"

import { useEffect, useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClubGradeLevelField } from "@/components/clubs/club-grade-level-field"
import { effectiveClubGradeLevels } from "@/lib/club-grade-levels"
import { staffAuthHeaders } from "@/lib/permissions/client"

type TeacherOption = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

type ClubDraft = {
  id: string
  name: string
  description: string | null
  capacity: number
  gradeLevels?: number[]
  instructorId?: string | null
  instructor?: TeacherOption | null
  exemptFromSelectionLimit?: boolean
}

export function ClubDetailEditor({
  club,
  onSaved,
}: {
  club: ClubDraft
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [form, setForm] = useState({
    name: club.name,
    description: club.description || "",
    capacity: club.capacity,
    gradeLevels: effectiveClubGradeLevels(club.gradeLevels),
    instructorId: club.instructorId || club.instructor?.id || "",
    exemptFromSelectionLimit: Boolean(club.exemptFromSelectionLimit),
  })

  useEffect(() => {
    if (!open) return
    fetch("/api/staff/pickers?type=teachers", {
      headers: staffAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { staff: [] }))
      .then((data) => setTeachers(Array.isArray(data.staff) ? data.staff : []))
      .catch(() => setTeachers([]))
  }, [open])

  const start = () => {
    setForm({
      name: club.name,
      description: club.description || "",
      capacity: club.capacity,
      gradeLevels: effectiveClubGradeLevels(club.gradeLevels),
      instructorId: club.instructorId || club.instructor?.id || "",
      exemptFromSelectionLimit: Boolean(club.exemptFromSelectionLimit),
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      alert("Kulüp adı gerekli.")
      return
    }
    if (form.gradeLevels.length === 0) {
      alert("En az bir sınıf düzeyi seçin.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/clubs/${club.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          instructorId: form.instructorId || null,
          exemptFromSelectionLimit: form.exemptFromSelectionLimit,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error || "Kulüp güncellenemedi")
        return
      }
      setOpen(false)
      onSaved()
    } catch {
      alert("Kulüp güncellenemedi")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={start}>
        <Pencil className="h-4 w-4 mr-2" />
        Düzenle
      </Button>
    )
  }

  return (
    <div className="mt-2 w-full basis-full rounded-xl border bg-white p-4 space-y-3">
      <p className="font-semibold text-gray-900">Kulübü düzenle</p>
      <div>
        <Label htmlFor="club-name">Kulüp adı</Label>
        <Input
          id="club-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="club-description">Açıklama</Label>
        <Input
          id="club-description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="club-capacity">Kontejan</Label>
        <Input
          id="club-capacity"
          type="number"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="club-instructor">Sorumlu öğretmen</Label>
        <select
          id="club-instructor"
          value={form.instructorId}
          onChange={(e) => setForm({ ...form, instructorId: e.target.value })}
          className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Atanmadı</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.firstName} {t.lastName}
              {t.subject ? ` (${t.subject})` : ""}
            </option>
          ))}
        </select>
      </div>
      <ClubGradeLevelField
        value={form.gradeLevels}
        onChange={(gradeLevels) => setForm({ ...form, gradeLevels })}
      />
      <label className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
          checked={form.exemptFromSelectionLimit}
          onChange={(e) =>
            setForm({ ...form, exemptFromSelectionLimit: e.target.checked })
          }
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">
            Seçim kotasından muaf
          </span>
          <span className="block text-xs text-gray-600 mt-0.5">
            Açıkken bu kulüp öğrencinin 3 kulüp hakkından düşmez (ör. olimpiyat).
            Kontenjan yine geçerlidir.
          </span>
        </span>
      </label>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
          Vazgeç
        </Button>
      </div>
    </div>
  )
}
