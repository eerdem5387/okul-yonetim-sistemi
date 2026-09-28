"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react"
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

type Student = {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
}

type ClubOption = {
  id: string
  name: string
  capacity: number
  _count: { selections: number }
  selections: Array<{ student: Student }>
}

type ClubGroupSchedule = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
}

type ClubGroup = {
  id: string
  name: string
  notes: string | null
  clubId: string
  club: {
    id: string
    name: string
    capacity: number
    instructor: { firstName: string; lastName: string } | null
  }
  students: Array<{ student: Student }>
  schedules: ClubGroupSchedule[]
}

type GroupForm = {
  clubId: string
  name: string
  notes: string
  studentIds: string[]
}

const DAY_SHORT = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]

function emptyForm(): GroupForm {
  return { clubId: "", name: "", notes: "", studentIds: [] }
}

export function ClubGroupsPanel() {
  const [groups, setGroups] = useState<ClubGroup[]>([])
  const [clubs, setClubs] = useState<ClubOption[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ClubGroup | null>(null)
  const [form, setForm] = useState<GroupForm>(emptyForm())
  const [studentSearch, setStudentSearch] = useState("")
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/club-groups", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Gruplar alınamadı")
      setGroups(Array.isArray(data.groups) ? data.groups : [])
      setClubs(Array.isArray(data.clubs) ? data.clubs : [])
    } catch (e) {
      setGroups([])
      setClubs([])
      setError(e instanceof Error ? e.message : "Yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectedClub = useMemo(
    () => clubs.find((c) => c.id === form.clubId) || null,
    [clubs, form.clubId]
  )

  const poolStudents = useMemo(() => {
    const list = selectedClub?.selections.map((s) => s.student) ?? []
    return [...list].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "tr")
    )
  }, [selectedClub])

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLocaleLowerCase("tr")
    return poolStudents.filter((s) => {
      if (showSelectedOnly && !form.studentIds.includes(s.id)) return false
      if (!q) return true
      const hay = `${s.firstName} ${s.lastName} ${s.tcNumber} ${s.grade}`.toLocaleLowerCase("tr")
      return hay.includes(q)
    })
  }, [poolStudents, studentSearch, showSelectedOnly, form.studentIds])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setStudentSearch("")
    setShowSelectedOnly(false)
    setModalOpen(true)
  }

  const openEdit = (group: ClubGroup) => {
    setEditing(group)
    setForm({
      clubId: group.clubId,
      name: group.name,
      notes: group.notes || "",
      studentIds: group.students.map((m) => m.student.id),
    })
    setStudentSearch("")
    setShowSelectedOnly(false)
    setModalOpen(true)
  }

  const toggleStudent = (id: string) => {
    setForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(id)
        ? prev.studentIds.filter((x) => x !== id)
        : [...prev.studentIds, id],
    }))
  }

  const selectAllVisible = () => {
    setForm((prev) => ({
      ...prev,
      studentIds: [...new Set([...prev.studentIds, ...filteredStudents.map((s) => s.id)])],
    }))
  }

  const clearStudents = () => {
    setForm((prev) => ({ ...prev, studentIds: [] }))
  }

  const save = async () => {
    if (!form.clubId) {
      alert("Kulüp seçiniz.")
      return
    }
    if (!form.name.trim()) {
      alert("Grup adı zorunludur.")
      return
    }
    setBusy(true)
    try {
      const url = editing ? `/api/club-groups/${editing.id}` : "/api/club-groups"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: form.clubId,
          name: form.name.trim(),
          notes: form.notes.trim() || null,
          studentIds: form.studentIds,
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

  const remove = async (group: ClubGroup) => {
    if (!confirm(`"${group.name}" grubunu silmek istiyor musunuz?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/club-groups/${group.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
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
      <div className="flex justify-center gap-2 py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Kulüp grupları</h2>
          <p className="text-sm text-gray-600">
            ÖÇG gibi önce grubu ve başvuran öğrencileri oluşturun; etüt atamasını Kulüp
            programından yapın.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni grup
        </Button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {groups.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Henüz kulüp grubu yok. Başvurulardan otomatik oluşturabilir veya “Yeni grup” ile
            ekleyebilirsiniz.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id} className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{g.name}</CardTitle>
                    <CardDescription className="truncate">{g.club.name}</CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(g)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-600"
                      disabled={busy}
                      onClick={() => void remove(g)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex items-center gap-1.5 text-gray-700">
                  <Users className="h-4 w-4 text-gray-500" />
                  {g.students.length} öğrenci
                  {g.club.instructor
                    ? ` · ${g.club.instructor.firstName} ${g.club.instructor.lastName}`
                    : ""}
                </p>
                {g.schedules.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {g.schedules.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                      >
                        {DAY_SHORT[s.dayOfWeek] || s.dayOfWeek} {s.startTime}–{s.endTime}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">Henüz etüt ataması yok</p>
                )}
                {g.notes && <p className="text-xs text-gray-500 line-clamp-2">{g.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Grubu düzenle" : "Yeni kulüp grubu"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Kulüp</Label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  value={form.clubId}
                  disabled={!!editing}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      clubId: e.target.value,
                      studentIds: editing ? prev.studentIds : [],
                      name:
                        prev.name.trim() ||
                        clubs.find((c) => c.id === e.target.value)?.name ||
                        prev.name,
                    }))
                  }
                >
                  <option value="">Seçiniz</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c._count.selections} başvuru)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Grup adı</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Örn: Basketbol A"
                />
              </div>
            </div>

            <div>
              <Label>Not (opsiyonel)</Label>
              <Input
                className="mt-1"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="rounded-xl border border-gray-200 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">
                  Başvuranlar
                  {selectedClub ? ` · ${form.studentIds.length} seçili` : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!selectedClub}
                    onClick={selectAllVisible}
                  >
                    Görünenleri seç
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={form.studentIds.length === 0}
                    onClick={clearStudents}
                  >
                    Temizle
                  </Button>
                </div>
              </div>

              {!selectedClub ? (
                <p className="py-6 text-center text-sm text-gray-500">Önce kulüp seçin</p>
              ) : poolStudents.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Bu kulübe henüz başvuru yok
                </p>
              ) : (
                <>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        className="pl-8"
                        placeholder="Öğrenci ara…"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={showSelectedOnly ? "default" : "outline"}
                      onClick={() => setShowSelectedOnly((v) => !v)}
                    >
                      {showSelectedOnly ? "Tümünü göster" : "Sadece seçili"}
                    </Button>
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-1">
                    {filteredStudents.map((s) => {
                      const active = form.studentIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleStudent(s.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                            active
                              ? "bg-violet-50 text-violet-900"
                              : "hover:bg-gray-50 text-gray-800"
                          }`}
                        >
                          <span>
                            {s.firstName} {s.lastName}
                            <span className="ml-2 text-xs text-gray-500">{s.grade}</span>
                          </span>
                          {active ? <X className="h-3.5 w-3.5 opacity-60" /> : null}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={busy}
              >
                İptal
              </Button>
              <Button type="button" onClick={() => void save()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
