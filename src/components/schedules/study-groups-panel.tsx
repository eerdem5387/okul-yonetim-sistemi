"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react"
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
import { getAuthHeaders } from "@/components/hr/hr-utils"
import { DAY_NAMES, WEEKDAY_INDEXES } from "@/lib/schedules/lesson-slots"

type Teacher = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

type Student = {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
}

type StudyGroup = {
  id: string
  name: string
  subjectName: string | null
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  notes: string | null
  teacher: Teacher
  students: Array<{ student: Student }>
}

type FormState = {
  name: string
  subjectName: string
  teacherId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string
  notes: string
  studentIds: string[]
}

const emptyForm = (): FormState => ({
  name: "",
  subjectName: "",
  teacherId: "",
  dayOfWeek: "1",
  startTime: "08:00",
  endTime: "09:00",
  room: "",
  notes: "",
  studentIds: [],
})

export function StudyGroupsPanel() {
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StudyGroup | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [studentSearch, setStudentSearch] = useState("")
  const [dayFilter, setDayFilter] = useState<"all" | number>("all")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [groupsRes, teachersRes, studentsRes] = await Promise.all([
        fetch("/api/study-groups", { cache: "no-store" }),
        fetch("/api/staff/pickers?type=teachers", { headers: getAuthHeaders() }),
        fetch("/api/students?limit=3000&gradeBand=k12", { cache: "no-store" }),
      ])
      if (!groupsRes.ok) throw new Error("Gruplar alınamadı")
      const gData = await groupsRes.json()
      setGroups(Array.isArray(gData.groups) ? gData.groups : [])

      const tData = teachersRes.ok ? await teachersRes.json() : { staff: [] }
      setTeachers(Array.isArray(tData.staff) ? tData.staff : [])

      const sData = studentsRes.ok ? await studentsRes.json() : { students: [] }
      setStudents(Array.isArray(sData.students) ? sData.students : Array.isArray(sData) ? sData : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredGroups = useMemo(() => {
    if (dayFilter === "all") return groups
    return groups.filter((g) => g.dayOfWeek === dayFilter)
  }, [groups, dayFilter])

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLocaleLowerCase("tr-TR")
    if (!q) return students.slice(0, 80)
    return students
      .filter((s) => {
        const full = `${s.firstName} ${s.lastName}`.toLocaleLowerCase("tr-TR")
        return (
          full.includes(q) ||
          s.tcNumber.includes(q) ||
          s.grade.toLocaleLowerCase("tr-TR").includes(q)
        )
      })
      .slice(0, 80)
  }, [students, studentSearch])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setStudentSearch("")
    setModalOpen(true)
  }

  const openEdit = (group: StudyGroup) => {
    setEditing(group)
    setForm({
      name: group.name,
      subjectName: group.subjectName || "",
      teacherId: group.teacher.id,
      dayOfWeek: String(group.dayOfWeek),
      startTime: group.startTime,
      endTime: group.endTime,
      room: group.room || "",
      notes: group.notes || "",
      studentIds: group.students.map((m) => m.student.id),
    })
    setStudentSearch("")
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

  const save = async () => {
    if (!form.name.trim() || !form.teacherId || form.studentIds.length === 0) {
      alert("Grup adı, öğretmen ve en az bir öğrenci zorunludur.")
      return
    }
    setBusy(true)
    try {
      const url = editing ? `/api/study-groups/${editing.id}` : "/api/study-groups"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          subjectName: form.subjectName.trim() || null,
          teacherId: form.teacherId,
          dayOfWeek: parseInt(form.dayOfWeek, 10),
          startTime: form.startTime,
          endTime: form.endTime,
          room: form.room.trim() || null,
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

  const remove = async (id: string) => {
    if (!confirm("Bu özel çalışma grubunu silmek istediğinize emin misiniz?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/study-groups/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || "Silinemedi")
        return
      }
      if (editing?.id === id) setModalOpen(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const selectedStudentLabels = useMemo(() => {
    const map = new Map(students.map((s) => [s.id, s]))
    return form.studentIds
      .map((id) => map.get(id))
      .filter(Boolean)
      .map((s) => `${s!.firstName} ${s!.lastName}`)
  }, [form.studentIds, students])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Özel çalışma grupları</h2>
          <p className="text-sm text-gray-600">
            Sınıf yerine seçtiğiniz öğrencilere + öğretmene haftalık saat atayın
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni grup
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={dayFilter === "all" ? "default" : "outline"}
          onClick={() => setDayFilter("all")}
        >
          Tüm günler
        </Button>
        {WEEKDAY_INDEXES.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={dayFilter === d ? "default" : "outline"}
            onClick={() => setDayFilter(d)}
          >
            {DAY_NAMES[d]}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Yükleniyor...
        </div>
      ) : error ? (
        <p className="text-center text-red-600 py-10">{error}</p>
      ) : filteredGroups.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Henüz özel çalışma grubu yok. “Yeni grup” ile oluşturabilirsiniz.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-violet-600 shrink-0" />
                      <span className="truncate">{group.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {DAY_NAMES[group.dayOfWeek]} · {group.startTime}–{group.endTime}
                      {group.subjectName ? ` · ${group.subjectName}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEdit(group)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-red-600"
                      disabled={busy}
                      onClick={() => void remove(group.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-gray-700">
                  Öğretmen:{" "}
                  <span className="font-medium">
                    {group.teacher.firstName} {group.teacher.lastName}
                  </span>
                </p>
                {group.room && <p className="text-gray-500 text-xs">Derslik: {group.room}</p>}
                <p className="text-xs text-violet-700 bg-violet-50 rounded-lg px-2 py-1 inline-block">
                  {group.students.length} öğrenci
                </p>
                <div className="text-xs text-gray-600 line-clamp-3">
                  {group.students
                    .map((m) => `${m.student.firstName} ${m.student.lastName}`)
                    .join(", ")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) setModalOpen(false)
          else setModalOpen(true)
        }}
      >
        <DialogContent className="max-w-2xl w-[min(94vw,42rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Grubu düzenle" : "Yeni özel çalışma grubu"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Grup adı *</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn: Matematik Destek A"
                />
              </div>
              <div>
                <Label>Konu / ders (opsiyonel)</Label>
                <Input
                  className="mt-1"
                  value={form.subjectName}
                  onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                  placeholder="Örn: Matematik"
                />
              </div>
            </div>

            <div>
              <Label>Öğretmen *</Label>
              <select
                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">Öğretmen seçiniz</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                    {t.subject ? ` (${t.subject})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Gün</Label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                >
                  {WEEKDAY_INDEXES.map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Başlangıç</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>Bitiş</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Derslik (opsiyonel)</Label>
              <Input
                className="mt-1"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="Örn: B203"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Öğrenciler * ({form.studentIds.length} seçili)</Label>
              </div>
              {selectedStudentLabels.length > 0 && (
                <p className="mt-1 text-xs text-violet-700 line-clamp-2">
                  {selectedStudentLabels.join(", ")}
                </p>
              )}
              <div className="relative mt-2">
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Ad, TC veya sınıf ara"
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-gray-200 divide-y">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 text-center">Öğrenci bulunamadı</p>
                ) : (
                  filteredStudents.map((s) => {
                    const checked = form.studentIds.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className={`flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-violet-50/60 ${
                          checked ? "bg-violet-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleStudent(s.id)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.grade} · {s.tcNumber}
                          </p>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)} disabled={busy}>
                İptal
              </Button>
              <Button className="flex-1" onClick={() => void save()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
