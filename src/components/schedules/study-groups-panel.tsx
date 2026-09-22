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
import { getAuthHeaders } from "@/components/hr/hr-utils"
import {
  DAY_NAMES,
  DEFAULT_LESSON_SLOTS,
  WEEKDAY_INDEXES,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"
import { hasTimeConflict } from "@/lib/schedules/time-conflict"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

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

type BusyBlock = {
  dayOfWeek: number
  startTime: string
  endTime: string
  label: string
  kind: "class" | "study"
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

type GridSlot = LessonSlot & { kind?: "LESSON" | "BREAK" | "ETUT" }

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

const GRADE_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12]

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
  const [gradeLevelFilter, setGradeLevelFilter] = useState<number | "all">("all")
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [dayFilter, setDayFilter] = useState<"all" | number>("all")
  const [error, setError] = useState("")
  const [teacherBusy, setTeacherBusy] = useState<BusyBlock[]>([])
  const [teacherBusyLoading, setTeacherBusyLoading] = useState(false)
  const [slots, setSlots] = useState<GridSlot[]>(DEFAULT_LESSON_SLOTS)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [groupsRes, teachersRes, studentsRes, templatesRes] = await Promise.all([
        fetch("/api/study-groups", { cache: "no-store" }),
        fetch("/api/staff/pickers?type=teachers", { headers: getAuthHeaders() }),
        fetch("/api/students?limit=3000&gradeBand=k12", {
          cache: "no-store",
        }),
        fetch("/api/schedules/day-templates?band=all", { cache: "no-store" }),
      ])
      if (!groupsRes.ok) throw new Error("Gruplar alınamadı")
      const gData = await groupsRes.json()
      setGroups(Array.isArray(gData.groups) ? gData.groups : [])

      const tData = teachersRes.ok ? await teachersRes.json() : { staff: [] }
      setTeachers(Array.isArray(tData.staff) ? tData.staff : [])

      const sData = studentsRes.ok ? await studentsRes.json() : { students: [] }
      setStudents(Array.isArray(sData.students) ? sData.students : Array.isArray(sData) ? sData : [])

      if (templatesRes.ok) {
        const tmpl = await templatesRes.json()
        const templates = Array.isArray(tmpl.templates) ? tmpl.templates : []
        const orta = templates.find((t: { band: string }) => t.band === "ortaokul")
        const lise = templates.find((t: { band: string }) => t.band === "lise")
        const ortaSlots = (Array.isArray(orta?.slots) ? orta.slots : []) as GridSlot[]
        const liseSlots = (Array.isArray(lise?.slots) ? lise.slots : []) as GridSlot[]
        // ÖÇG: her iki kademenin etüt saatlerini birleştir (eşsiz start-end)
        const merged: GridSlot[] = []
        const seen = new Set<string>()
        let id = 1
        for (const s of [...ortaSlots, ...liseSlots]) {
          if ((s.kind ?? "LESSON") !== "ETUT") continue
          const key = `${s.startTime}|${s.endTime}`
          if (seen.has(key)) continue
          seen.add(key)
          merged.push({ ...s, id: id++ })
        }
        // Etüt yoksa tüm ortaokul şablonunu tut (uyarı gösterilir)
        setSlots(
          merged.length > 0
            ? merged
            : ((ortaSlots.length > 0 ? ortaSlots : liseSlots.length > 0 ? liseSlots : DEFAULT_LESSON_SLOTS) as GridSlot[])
        )
      }
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

  const loadTeacherBusy = useCallback(async (teacherId: string, excludeGroupId?: string) => {
    if (!teacherId) {
      setTeacherBusy([])
      return
    }
    setTeacherBusyLoading(true)
    try {
      const [schedRes, groupRes, clubRes] = await Promise.all([
        fetch(`/api/schedules?teacherId=${teacherId}`, { cache: "no-store" }),
        fetch(`/api/study-groups?teacherId=${teacherId}`, { cache: "no-store" }),
        fetch("/api/schedules/clubs", { cache: "no-store" }),
      ])
      const schedData = schedRes.ok ? await schedRes.json() : { schedules: [] }
      const groupData = groupRes.ok ? await groupRes.json() : { groups: [] }
      const clubData = clubRes.ok ? await clubRes.json() : { schedules: [] }

      const blocks: BusyBlock[] = []
      for (const s of Array.isArray(schedData.schedules) ? schedData.schedules : []) {
        blocks.push({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          label: `${s.subjectName}${s.class?.name ? ` · ${s.class.name}` : ""}`,
          kind: "class",
        })
      }
      for (const g of Array.isArray(groupData.groups) ? groupData.groups : []) {
        if (excludeGroupId && g.id === excludeGroupId) continue
        blocks.push({
          dayOfWeek: g.dayOfWeek,
          startTime: g.startTime,
          endTime: g.endTime,
          label: `ÖÇG: ${g.name}`,
          kind: "study",
        })
      }
      for (const c of Array.isArray(clubData.schedules) ? clubData.schedules : []) {
        if (c.club?.instructorId !== teacherId && c.club?.instructor?.id !== teacherId) continue
        blocks.push({
          dayOfWeek: c.dayOfWeek,
          startTime: c.startTime,
          endTime: c.endTime,
          label: `Kulüp: ${c.club?.name ?? ""}`,
          kind: "study",
        })
      }
      setTeacherBusy(blocks)
    } catch {
      setTeacherBusy([])
    } finally {
      setTeacherBusyLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!modalOpen) return
    void loadTeacherBusy(form.teacherId, editing?.id)
  }, [modalOpen, form.teacherId, editing?.id, loadTeacherBusy])

  const filteredGroups = useMemo(() => {
    if (dayFilter === "all") return groups
    return groups.filter((g) => g.dayOfWeek === dayFilter)
  }, [groups, dayFilter])

  const studentMatchStats = useMemo(() => {
    const q = studentSearch.trim().toLocaleLowerCase("tr-TR")
    const selectedSet = new Set(form.studentIds)

    const matched = students.filter((s) => {
      if (showSelectedOnly && !selectedSet.has(s.id)) return false
      if (gradeLevelFilter !== "all") {
        const level = parseStudentGradeLevel(s.grade)
        if (level !== gradeLevelFilter) return false
      }
      if (!q) return true
      const full = `${s.firstName} ${s.lastName}`.toLocaleLowerCase("tr-TR")
      const grade = s.grade.toLocaleLowerCase("tr-TR")
      return (
        full.includes(q) ||
        s.tcNumber.includes(q) ||
        grade.includes(q) ||
        full.replace(/\s+/g, "").includes(q.replace(/\s+/g, ""))
      )
    })

    const sorted = [...matched].sort((a, b) => {
      const aSel = selectedSet.has(a.id) ? 0 : 1
      const bSel = selectedSet.has(b.id) ? 0 : 1
      if (aSel !== bSel) return aSel - bSel
      const an = `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
        "tr"
      )
      return an
    })

    const limit = q || gradeLevelFilter !== "all" || showSelectedOnly ? 200 : 80
    return {
      totalMatched: matched.length,
      shown: sorted.slice(0, limit),
      limit,
    }
  }, [students, studentSearch, gradeLevelFilter, showSelectedOnly, form.studentIds])

  const filteredStudents = studentMatchStats.shown

  const selectedStudents = useMemo(() => {
    const map = new Map(students.map((s) => [s.id, s]))
    // Düzenlemede listede olmayan (silinmiş) öğrenci id'leri de korunsun diye group fallback yok;
    // sadece bilinen öğrencileri chip olarak göster.
    return form.studentIds
      .map((id) => map.get(id))
      .filter((s): s is Student => Boolean(s))
  }, [form.studentIds, students])

  const etutSlots = useMemo(
    () => slots.filter((s) => s.kind === "ETUT"),
    [slots]
  )

  const findBusy = (day: number, start: string, end: string) =>
    teacherBusy.find((b) => b.dayOfWeek === day && hasTimeConflict(b.startTime, b.endTime, start, end))

  const isSelectedSlot = (day: number, start: string, end: string) =>
    form.dayOfWeek === String(day) && form.startTime === start && form.endTime === end

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setStudentSearch("")
    setGradeLevelFilter("all")
    setShowSelectedOnly(false)
    setTeacherBusy([])
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
    setGradeLevelFilter("all")
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

  const selectVisibleStudents = () => {
    setForm((prev) => {
      const next = new Set(prev.studentIds)
      for (const s of filteredStudents) next.add(s.id)
      return { ...prev, studentIds: [...next] }
    })
  }

  const clearVisibleStudents = () => {
    const visible = new Set(filteredStudents.map((s) => s.id))
    setForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.filter((id) => !visible.has(id)),
    }))
  }

  const clearAllStudents = () => {
    setForm((prev) => ({ ...prev, studentIds: [] }))
    setShowSelectedOnly(false)
  }

  const save = async () => {
    if (!form.name.trim() || !form.teacherId) {
      alert("Grup adı ve öğretmen zorunludur. Öğrenciler sonradan eklenebilir.")
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

  const selectedTeacher = teachers.find((t) => t.id === form.teacherId)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Özel çalışma grupları</h2>
          <p className="text-sm text-gray-600">
            Önce grubu oluşturun; öğrencileri şimdi veya sonra ekleyin. Karttan düzenleyerek öğrencileri değiştirebilirsiniz.
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
            <Card
              key={group.id}
              className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openEdit(group)}
            >
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
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                  {group.students.length === 0
                    ? "Öğrenci henüz eklenmedi"
                    : `${group.students.length} öğrenci`}
                </p>
                {group.students.length > 0 ? (
                  <div className="text-xs text-gray-600 line-clamp-3">
                    {group.students
                      .map((m) => `${m.student.firstName} ${m.student.lastName}`)
                      .join(", ")}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">Düzenle → öğrenci ekleyin</p>
                )}
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
        <DialogContent className="max-w-6xl w-[min(96vw,72rem)] max-h-[92vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 border-b bg-white px-6 pt-6 pb-4">
            <DialogHeader className="pr-8 mb-0">
              <DialogTitle className="text-xl">
                {editing ? "Grubu düzenle" : "Yeni özel çalışma grubu"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Label>Grup adı *</Label>
                <Input
                  className="mt-1.5"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn: Matematik Destek A"
                />
              </div>
              <div>
                <Label>Konu / ders (opsiyonel)</Label>
                <Input
                  className="mt-1.5"
                  value={form.subjectName}
                  onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                  placeholder="Örn: Matematik"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
              <div>
                <Label>Öğretmen *</Label>
                <select
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm"
                  value={form.teacherId}
                  onChange={(e) => {
                    setForm({ ...form, teacherId: e.target.value })
                  }}
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
              <div>
                <Label>Derslik (opsiyonel)</Label>
                <Input
                  className="mt-1.5"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  placeholder="Örn: B203"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">Etüt programı — öğretmen müsaitliği</p>
                  <p className="text-sm text-gray-600">
                    {selectedTeacher
                      ? `${selectedTeacher.firstName} ${selectedTeacher.lastName} — boş etüt hücresine tıklayarak saat seçin`
                      : "Önce öğretmen seçin; ÖÇG yalnızca etüt saatlerine yerleştirilir"}
                  </p>
                </div>
                {form.teacherId && (
                  <p className="text-xs font-medium text-indigo-800 bg-white/80 border border-indigo-100 rounded-lg px-3 py-1.5">
                    Seçili: {DAY_NAMES[parseInt(form.dayOfWeek, 10) || 1]} · {form.startTime}–{form.endTime}
                  </p>
                )}
              </div>

              {!form.teacherId ? (
                <p className="text-sm text-gray-500 py-8 text-center">Öğretmen seçildikten sonra program açılır</p>
              ) : teacherBusyLoading ? (
                <div className="flex justify-center py-10 text-gray-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Program yükleniyor...
                </div>
              ) : etutSlots.length === 0 ? (
                <p className="text-sm text-amber-800 py-6 text-center">
                  Tanımlı etüt saati yok. Ders saatleri’nden Etüt ekleyin.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white bg-white">
                  <table className="w-full border-collapse min-w-[640px]">
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
                        <tr key={`${slot.id}-${slot.startTime}`}>
                          <td className="border-b border-r border-gray-200 p-2 text-xs font-medium text-emerald-900 bg-emerald-50/80">
                            <div>{slot.label}</div>
                            <div className="text-[10px] text-emerald-700/80 font-normal">
                              {slot.startTime}–{slot.endTime}
                            </div>
                          </td>
                          {WEEKDAY_INDEXES.map((day) => {
                            const occupied = findBusy(day, slot.startTime, slot.endTime)
                            const selected = isSelectedSlot(day, slot.startTime, slot.endTime)
                            if (occupied) {
                              return (
                                <td
                                  key={`${day}-${slot.id}`}
                                  className="border-b border-gray-100 p-1.5 align-top bg-rose-50"
                                  title={occupied.label}
                                >
                                  <div className="px-1 py-1">
                                    <p className="text-[10px] font-semibold text-rose-800 leading-tight line-clamp-2">
                                      {occupied.label}
                                    </p>
                                    <p className="text-[9px] text-rose-600 mt-0.5">Dolu</p>
                                  </div>
                                </td>
                              )
                            }
                            return (
                              <td
                                key={`${day}-${slot.id}`}
                                className={`border-b border-gray-100 p-1.5 cursor-pointer align-middle transition-colors ${
                                  selected
                                    ? "bg-violet-100 ring-2 ring-inset ring-violet-400"
                                    : "bg-emerald-50/70 hover:bg-emerald-100"
                                }`}
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    dayOfWeek: String(day),
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                  }))
                                }
                              >
                                <div className="h-11 flex items-center justify-center">
                                  <span
                                    className={`text-[10px] font-medium ${
                                      selected ? "text-violet-800" : "text-emerald-700"
                                    }`}
                                  >
                                    {selected ? "Seçildi" : "Boş"}
                                  </span>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-200" /> Boş
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-rose-50 border border-rose-200" /> Dolu
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-violet-100 border border-violet-300" /> Seçili
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Label className="text-base">
                    Öğrenciler{" "}
                    <span className="font-normal text-gray-500">
                      ({form.studentIds.length} seçili — opsiyonel)
                    </span>
                  </Label>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Tüm öğrenciler listelenir. Sınıf düzeyi + arama ile daraltın; grubu boş da kaydedebilirsiniz.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={showSelectedOnly ? "default" : "outline"}
                    onClick={() => setShowSelectedOnly((v) => !v)}
                    disabled={form.studentIds.length === 0}
                  >
                    Seçilenler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={selectVisibleStudents}
                    disabled={filteredStudents.length === 0}
                  >
                    Görünenleri seç
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearVisibleStudents}
                    disabled={filteredStudents.length === 0}
                  >
                    Görünenleri kaldır
                  </Button>
                  {form.studentIds.length > 0 && (
                    <Button type="button" size="sm" variant="ghost" onClick={clearAllStudents}>
                      Tümünü temizle
                    </Button>
                  )}
                </div>
              </div>

              {selectedStudents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-xl border border-violet-100 bg-white p-2">
                  {selectedStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudent(s.id)}
                      title="Kaldırmak için tıkla"
                      className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-900 px-2.5 py-1 text-xs font-medium hover:bg-violet-200"
                    >
                      {s.firstName} {s.lastName}
                      <span className="text-violet-600/80">· {s.grade}</span>
                      <X className="h-3 w-3 opacity-70" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={gradeLevelFilter === "all" ? "default" : "outline"}
                  className="h-8"
                  onClick={() => setGradeLevelFilter("all")}
                >
                  Tümü
                </Button>
                {GRADE_LEVELS.map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="sm"
                    variant={gradeLevelFilter === g ? "default" : "outline"}
                    className="h-8"
                    onClick={() => setGradeLevelFilter(g)}
                  >
                    {g}.
                  </Button>
                ))}
              </div>

              <div className="relative">
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Ad, soyad, TC veya sınıf yazın (ör. Ayşe, 12345, 9-A)"
                  className="pl-9 h-11"
                  autoComplete="off"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                {studentSearch && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setStudentSearch("")}
                    aria-label="Aramayı temizle"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500">
                {studentMatchStats.totalMatched} sonuç
                {studentMatchStats.totalMatched > studentMatchStats.limit
                  ? ` · ilk ${studentMatchStats.limit} gösteriliyor — aramayı daraltın`
                  : null}
                {!studentSearch && gradeLevelFilter === "all" && !showSelectedOnly
                  ? " · sınıf seçin veya arama yapın"
                  : null}
              </p>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 divide-y bg-white">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-gray-500 p-6 text-center">
                    {showSelectedOnly
                      ? "Seçili öğrenci yok"
                      : "Öğrenci bulunamadı — arama veya sınıf filtresini değiştirin"}
                  </p>
                ) : (
                  filteredStudents.map((s) => {
                    const checked = form.studentIds.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-violet-50/60 ${
                          checked ? "bg-violet-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleStudent(s.id)}
                        />
                        <div className="min-w-0 flex-1">
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
          </div>

          <div className="sticky bottom-0 border-t bg-white px-6 py-4 flex flex-col sm:flex-row gap-3">
            <p className="text-xs text-gray-500 sm:flex-1 self-center">
              {form.studentIds.length === 0
                ? "Öğrencisiz kaydedilebilir; daha sonra karttan düzenleyerek ekleyin."
                : `${form.studentIds.length} öğrenci ile kaydedilecek.`}
            </p>
            <Button
              variant="outline"
              className="sm:w-28"
              onClick={() => setModalOpen(false)}
              disabled={busy}
            >
              İptal
            </Button>
            <Button className="sm:w-36" onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
