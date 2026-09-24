"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarPlus, Loader2, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react"
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
  DEFAULT_LISE_WEEKDAY_SLOTS,
  DEFAULT_ORTAOKUL_WEEKDAY_SLOTS,
  WEEKDAY_INDEXES,
  gradeBandFor,
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

type StudySession = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  topic: string
  notes: string | null
  teacher: Teacher
}

type StudyGroup = {
  id: string
  name: string
  gradeLevel: number
  notes: string | null
  students: Array<{ student: Student }>
  sessions: StudySession[]
}

type BusyBlock = {
  dayOfWeek: number
  startTime: string
  endTime: string
  label: string
  kind: "class" | "study"
}

type GroupForm = {
  name: string
  gradeLevel: number
  notes: string
  studentIds: string[]
}

type SessionForm = {
  teacherId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string
  topic: string
  notes: string
}

type GridSlot = LessonSlot & { kind?: "LESSON" | "BREAK" | "ETUT" }
type SlotBand = "ortaokul" | "lise"

const GRADE_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12] as const

const emptyGroupForm = (): GroupForm => ({
  name: "",
  gradeLevel: 8,
  notes: "",
  studentIds: [],
})

const emptySessionForm = (slots?: GridSlot[]): SessionForm => {
  const first = slots?.find((s) => (s.kind ?? "LESSON") !== "BREAK") ?? slots?.[0]
  return {
    teacherId: "",
    dayOfWeek: "1",
    startTime: first?.startTime ?? "08:40",
    endTime: first?.endTime ?? "09:20",
    room: "",
    topic: "",
    notes: "",
  }
}

/** Teneffüs hariç; aynı başlangıç saati bir kez. */
function assignableSlots(raw: GridSlot[]): GridSlot[] {
  const out: GridSlot[] = []
  const seen = new Set<string>()
  let id = 1
  for (const s of raw) {
    const kind = s.kind ?? "LESSON"
    if (kind === "BREAK") continue
    const key = `${s.startTime}|${s.endTime}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...s, id: id++, kind })
  }
  return out.sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/** Sınıf düzeyine göre ders saati şablonu (5–8 ortaokul, 9–12 lise). */
function bandForStudyGroup(group: StudyGroup | null): SlotBand {
  if (!group) return "ortaokul"
  const level = Number(group.gradeLevel)
  const band = Number.isFinite(level) ? gradeBandFor(level) : null
  return band === "lise" ? "lise" : "ortaokul"
}

export function StudyGroupsPanel() {
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<StudyGroup | null>(null)
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm)
  const [studentSearch, setStudentSearch] = useState("")
  const [gradeLevelFilter, setGradeLevelFilter] = useState<number | "all">("all")
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionGroup, setSessionGroup] = useState<StudyGroup | null>(null)
  const [editingSession, setEditingSession] = useState<StudySession | null>(null)
  const [sessionForm, setSessionForm] = useState<SessionForm>(() => emptySessionForm())
  const [teacherBusy, setTeacherBusy] = useState<BusyBlock[]>([])
  const [teacherBusyLoading, setTeacherBusyLoading] = useState(false)
  const [slotMap, setSlotMap] = useState<{ ortaokul: GridSlot[]; lise: GridSlot[] }>({
    ortaokul: assignableSlots([...DEFAULT_ORTAOKUL_WEEKDAY_SLOTS]),
    lise: assignableSlots([...DEFAULT_LISE_WEEKDAY_SLOTS]),
  })

  const sessionBand = useMemo(() => bandForStudyGroup(sessionGroup), [sessionGroup])
  const slots = useMemo(
    () => (sessionBand === "lise" ? slotMap.lise : slotMap.ortaokul),
    [sessionBand, slotMap]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [groupsRes, teachersRes, studentsRes, templatesRes] = await Promise.all([
        fetch("/api/study-groups", { cache: "no-store" }),
        fetch("/api/staff/pickers?type=teachers", { headers: getAuthHeaders() }),
        fetch("/api/students?limit=3000&gradeBand=k12", { cache: "no-store" }),
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
        const ortaSlots = assignableSlots(
          (Array.isArray(orta?.slots) && orta.slots.length > 0
            ? orta.slots
            : DEFAULT_ORTAOKUL_WEEKDAY_SLOTS) as GridSlot[]
        )
        const liseSlots = assignableSlots(
          (Array.isArray(lise?.slots) && lise.slots.length > 0
            ? lise.slots
            : DEFAULT_LISE_WEEKDAY_SLOTS) as GridSlot[]
        )
        setSlotMap({ ortaokul: ortaSlots, lise: liseSlots })
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

  const loadTeacherBusy = useCallback(async (teacherId: string, excludeSessionId?: string) => {
    if (!teacherId) {
      setTeacherBusy([])
      return
    }
    setTeacherBusyLoading(true)
    try {
      const [schedRes, sessionRes, clubRes] = await Promise.all([
        fetch(`/api/schedules?teacherId=${teacherId}`, { cache: "no-store" }),
        fetch(`/api/study-groups/sessions?teacherId=${teacherId}`, { cache: "no-store" }),
        fetch("/api/schedules/clubs", { cache: "no-store" }),
      ])
      const schedData = schedRes.ok ? await schedRes.json() : { schedules: [] }
      const sessionData = sessionRes.ok ? await sessionRes.json() : { sessions: [] }
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
      for (const sess of Array.isArray(sessionData.sessions) ? sessionData.sessions : []) {
        if (excludeSessionId && sess.id === excludeSessionId) continue
        blocks.push({
          dayOfWeek: sess.dayOfWeek,
          startTime: sess.startTime,
          endTime: sess.endTime,
          label: `ÖÇG: ${sess.studyGroup?.name ?? sess.topic ?? ""}`,
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
    if (!sessionModalOpen) return
    void loadTeacherBusy(sessionForm.teacherId, editingSession?.id)
  }, [sessionModalOpen, sessionForm.teacherId, editingSession?.id, loadTeacherBusy])

  const studentMatchStats = useMemo(() => {
    const q = studentSearch.trim().toLocaleLowerCase("tr-TR")
    const selectedSet = new Set(groupForm.studentIds)

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
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "tr")
    })

    const limit = q || gradeLevelFilter !== "all" || showSelectedOnly ? 200 : 80
    return {
      totalMatched: matched.length,
      shown: sorted.slice(0, limit),
      limit,
    }
  }, [students, studentSearch, gradeLevelFilter, showSelectedOnly, groupForm.studentIds])

  const filteredStudents = studentMatchStats.shown

  const selectedStudents = useMemo(() => {
    const map = new Map(students.map((s) => [s.id, s]))
    return groupForm.studentIds
      .map((id) => map.get(id))
      .filter((s): s is Student => Boolean(s))
  }, [groupForm.studentIds, students])

  const findBusy = (day: number, start: string, end: string) =>
    teacherBusy.find((b) => b.dayOfWeek === day && hasTimeConflict(b.startTime, b.endTime, start, end))

  const isSelectedSlot = (day: number, start: string, end: string) =>
    sessionForm.dayOfWeek === String(day) &&
    sessionForm.startTime === start &&
    sessionForm.endTime === end

  const openCreateGroup = () => {
    setEditingGroup(null)
    setGroupForm(emptyGroupForm())
    setStudentSearch("")
    setGradeLevelFilter("all")
    setShowSelectedOnly(false)
    setGroupModalOpen(true)
  }

  const openEditGroup = (group: StudyGroup) => {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      gradeLevel: group.gradeLevel >= 5 && group.gradeLevel <= 12 ? group.gradeLevel : 8,
      notes: group.notes || "",
      studentIds: group.students.map((m) => m.student.id),
    })
    setStudentSearch("")
    setGradeLevelFilter(group.gradeLevel >= 5 && group.gradeLevel <= 12 ? group.gradeLevel : "all")
    setShowSelectedOnly(false)
    setGroupModalOpen(true)
  }

  const openCreateSession = (group: StudyGroup) => {
    const band = bandForStudyGroup(group)
    const bandSlots = band === "lise" ? slotMap.lise : slotMap.ortaokul
    setSessionGroup(group)
    setEditingSession(null)
    setSessionForm(emptySessionForm(bandSlots))
    setTeacherBusy([])
    setSessionModalOpen(true)
  }

  const openEditSession = (group: StudyGroup, session: StudySession) => {
    setSessionGroup(group)
    setEditingSession(session)
    setSessionForm({
      teacherId: session.teacher.id,
      dayOfWeek: String(session.dayOfWeek),
      startTime: session.startTime,
      endTime: session.endTime,
      room: session.room || "",
      topic: session.topic,
      notes: session.notes || "",
    })
    setSessionModalOpen(true)
  }

  const toggleStudent = (id: string) => {
    setGroupForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(id)
        ? prev.studentIds.filter((x) => x !== id)
        : [...prev.studentIds, id],
    }))
  }

  const selectVisibleStudents = () => {
    setGroupForm((prev) => {
      const next = new Set(prev.studentIds)
      for (const s of filteredStudents) next.add(s.id)
      return { ...prev, studentIds: [...next] }
    })
  }

  const clearVisibleStudents = () => {
    const visible = new Set(filteredStudents.map((s) => s.id))
    setGroupForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.filter((id) => !visible.has(id)),
    }))
  }

  const clearAllStudents = () => {
    setGroupForm((prev) => ({ ...prev, studentIds: [] }))
    setShowSelectedOnly(false)
  }

  const saveGroup = async () => {
    if (!groupForm.name.trim()) {
      alert("Grup adı zorunludur. Öğrenciler şimdi veya sonra eklenebilir.")
      return
    }
    if (!groupForm.gradeLevel) {
      alert("Sınıf düzeyi seçiniz.")
      return
    }
    setBusy(true)
    try {
      const url = editingGroup ? `/api/study-groups/${editingGroup.id}` : "/api/study-groups"
      const method = editingGroup ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          gradeLevel: groupForm.gradeLevel,
          notes: groupForm.notes.trim() || null,
          studentIds: groupForm.studentIds,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Kayıt başarısız")
        return
      }
      setGroupModalOpen(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const saveSession = async () => {
    if (!sessionGroup) return
    if (!sessionForm.teacherId || !sessionForm.topic.trim()) {
      alert("Öğretmen ve konu zorunludur.")
      return
    }
    setBusy(true)
    try {
      const payload = {
        studyGroupId: sessionGroup.id,
        teacherId: sessionForm.teacherId,
        dayOfWeek: parseInt(sessionForm.dayOfWeek, 10),
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime,
        room: sessionForm.room.trim() || null,
        topic: sessionForm.topic.trim(),
        notes: sessionForm.notes.trim() || null,
      }
      const url = editingSession
        ? `/api/study-groups/sessions/${editingSession.id}`
        : "/api/study-groups/sessions"
      const method = editingSession ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Atama kaydedilemedi")
        return
      }
      setSessionModalOpen(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const removeGroup = async (id: string) => {
    if (!confirm("Bu çalışma grubunu ve tüm atamalarını silmek istediğinize emin misiniz?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/study-groups/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || "Silinemedi")
        return
      }
      if (editingGroup?.id === id) setGroupModalOpen(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const removeSession = async (sessionId: string) => {
    if (!confirm("Bu program atamasını silmek istediğinize emin misiniz?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/study-groups/sessions/${sessionId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || "Atama silinemedi")
        return
      }
      if (editingSession?.id === sessionId) setSessionModalOpen(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const selectedTeacher = teachers.find((t) => t.id === sessionForm.teacherId)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Özel çalışma grupları</h2>
          <p className="text-sm text-gray-600">
            Grup oluştururken sınıf düzeyini seçin; program atamasında o düzeyin ders saatleri
            kullanılır. Öğrencileri şimdi veya sonra ekleyebilirsiniz.
          </p>
        </div>
        <Button size="sm" onClick={openCreateGroup}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni grup
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Yükleniyor...
        </div>
      ) : error ? (
        <p className="text-center text-red-600 py-10">{error}</p>
      ) : groups.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Henüz özel çalışma grubu yok. “Yeni grup” ile oluşturabilirsiniz.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-violet-600 shrink-0" />
                      <span className="truncate">{group.name}</span>
                      <span className="shrink-0 rounded-md bg-violet-100 text-violet-800 px-2 py-0.5 text-xs font-semibold">
                        {group.gradeLevel}. sınıf
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {group.students.length === 0
                        ? "Öğrenci yok"
                        : `${group.students.length} öğrenci`}
                      {" · "}
                      {group.sessions.length === 0
                        ? "Atama yok"
                        : `${group.sessions.length} atama`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title="Öğrencileri düzenle"
                      onClick={() => openEditGroup(group)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-red-600"
                      disabled={busy}
                      onClick={() => void removeGroup(group.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {group.students.length > 0 ? (
                  <div className="text-xs text-gray-600 line-clamp-2">
                    {group.students
                      .map((m) => `${m.student.firstName} ${m.student.lastName}`)
                      .join(", ")}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">Düzenle → öğrenci ekleyin</p>
                )}

                {group.sessions.length > 0 && (
                  <ul className="space-y-1.5">
                    {group.sessions.map((sess) => (
                      <li
                        key={sess.id}
                        className="rounded-lg border border-violet-100 bg-violet-50/50 px-2.5 py-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">
                              {DAY_NAMES[sess.dayOfWeek]} · {sess.startTime}–{sess.endTime}
                            </p>
                            <p className="text-gray-600 truncate">
                              {sess.teacher.firstName} {sess.teacher.lastName}
                              {sess.room ? ` · ${sess.room}` : ""}
                            </p>
                            <p className="text-violet-800 mt-0.5 line-clamp-2">Konu: {sess.topic}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditSession(group, sess)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600"
                              disabled={busy}
                              onClick={() => void removeSession(sess.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => openCreateSession(group)}
                >
                  <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                  Program ata
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grup oluştur / öğrenci düzenle */}
      <Dialog
        open={groupModalOpen}
        onOpenChange={(open) => {
          if (!open) setGroupModalOpen(false)
          else setGroupModalOpen(true)
        }}
      >
        <DialogContent className="max-w-3xl w-[min(96vw,48rem)] max-h-[92vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 border-b bg-white px-6 pt-6 pb-4">
            <DialogHeader className="pr-8 mb-0">
              <DialogTitle className="text-xl">
                {editingGroup ? "Grubu ve öğrencileri düzenle" : "Yeni çalışma grubu"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Grup adı *</Label>
                <Input
                  className="mt-1.5"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Örn: G 1"
                />
              </div>
              <div>
                <Label>Sınıf düzeyi *</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {GRADE_LEVELS.map((g) => (
                    <Button
                      key={g}
                      type="button"
                      size="sm"
                      variant={groupForm.gradeLevel === g ? "default" : "outline"}
                      className="h-8 min-w-10"
                      onClick={() => {
                        setGroupForm({ ...groupForm, gradeLevel: g })
                        setGradeLevelFilter(g)
                      }}
                    >
                      {g}.
                    </Button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Kartta görünür; program atamasında {groupForm.gradeLevel <= 8 ? "ortaokul" : "lise"}{" "}
                  ders saatleri kullanılır.
                </p>
              </div>
            </div>
            <div>
              <Label>Not (opsiyonel)</Label>
              <Input
                className="mt-1.5"
                value={groupForm.notes}
                onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
                placeholder="İç not"
              />
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Label className="text-base">
                    Öğrenciler{" "}
                    <span className="font-normal text-gray-500">
                      ({groupForm.studentIds.length} seçili)
                    </span>
                  </Label>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Şimdi veya sonra ekleyebilirsiniz. Karttan düzenleyerek ekleyip çıkarabilirsiniz.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={showSelectedOnly ? "default" : "outline"}
                    onClick={() => setShowSelectedOnly((v) => !v)}
                    disabled={groupForm.studentIds.length === 0}
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
                  {groupForm.studentIds.length > 0 && (
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
                {(GRADE_LEVELS).map((g) => (
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
                  placeholder="Ad, soyad, TC veya sınıf yazın"
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
                  ? ` · ilk ${studentMatchStats.limit} gösteriliyor`
                  : null}
              </p>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 divide-y bg-white">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-gray-500 p-6 text-center">Öğrenci bulunamadı</p>
                ) : (
                  filteredStudents.map((s) => {
                    const checked = groupForm.studentIds.includes(s.id)
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
              Program ataması grup kartındaki “Program ata” ile yapılır.
            </p>
            <Button
              variant="outline"
              className="sm:w-28"
              onClick={() => setGroupModalOpen(false)}
              disabled={busy}
            >
              İptal
            </Button>
            <Button className="sm:w-36" onClick={() => void saveGroup()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingGroup ? (
                "Güncelle"
              ) : (
                "Oluştur"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Program ataması */}
      <Dialog
        open={sessionModalOpen}
        onOpenChange={(open) => {
          if (!open) setSessionModalOpen(false)
          else setSessionModalOpen(true)
        }}
      >
        <DialogContent className="max-w-6xl w-[min(96vw,72rem)] max-h-[92vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 border-b bg-white px-6 pt-6 pb-4">
            <DialogHeader className="pr-8 mb-0">
              <DialogTitle className="text-xl">
                {editingSession ? "Atamayı düzenle" : "Program ata"}
                {sessionGroup ? ` — ${sessionGroup.name}` : ""}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_160px]">
              <div>
                <Label>Öğretmen *</Label>
                <select
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm"
                  value={sessionForm.teacherId}
                  onChange={(e) => setSessionForm({ ...sessionForm, teacherId: e.target.value })}
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
                <Label>Konu *</Label>
                <Input
                  className="mt-1.5"
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  placeholder="Öğretmenin göreceği konu"
                />
              </div>
              <div>
                <Label>Derslik</Label>
                <Input
                  className="mt-1.5"
                  value={sessionForm.room}
                  onChange={(e) => setSessionForm({ ...sessionForm, room: e.target.value })}
                  placeholder="B203"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">Gün ve ders saati</p>
                  <p className="text-sm text-gray-600">
                    {selectedTeacher
                      ? `${selectedTeacher.firstName} ${selectedTeacher.lastName} — boş hücreye tıklayın (${
                          sessionBand === "lise" ? "lise" : "ortaokul"
                        } saatleri)`
                      : "Önce öğretmen seçin"}
                  </p>
                </div>
                {sessionForm.teacherId && (
                  <p className="text-xs font-medium text-indigo-800 bg-white/80 border border-indigo-100 rounded-lg px-3 py-1.5">
                    Seçili: {DAY_NAMES[parseInt(sessionForm.dayOfWeek, 10) || 1]} ·{" "}
                    {sessionForm.startTime}–{sessionForm.endTime}
                  </p>
                )}
              </div>

              {!sessionForm.teacherId ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Öğretmen seçildikten sonra program açılır
                </p>
              ) : teacherBusyLoading ? (
                <div className="flex justify-center py-10 text-gray-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Program yükleniyor...
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-amber-800 py-6 text-center">
                  Tanımlı ders saati yok. Ders saatleri’nden şablon ekleyin.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white bg-white">
                  <table className="w-full border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border-b border-r border-gray-200 p-2 text-xs font-semibold text-gray-700 w-28">
                          Saat
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
                      {slots.map((slot) => (
                        <tr key={`${slot.id}-${slot.startTime}`}>
                          <td
                            className={`border-b border-r border-gray-200 p-2 text-xs font-medium ${
                              slot.kind === "ETUT"
                                ? "text-emerald-900 bg-emerald-50/80"
                                : "text-gray-800 bg-gray-50/80"
                            }`}
                          >
                            <div>{slot.label}</div>
                            <div className="text-[10px] opacity-70 font-normal">
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
                                  setSessionForm((prev) => ({
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
            </div>
          </div>

          <div className="sticky bottom-0 border-t bg-white px-6 py-4 flex flex-col sm:flex-row gap-3">
            <p className="text-xs text-gray-500 sm:flex-1 self-center">
              Konu, öğretmen takviminde bu grubun yanında görünür.
            </p>
            <Button
              variant="outline"
              className="sm:w-28"
              onClick={() => setSessionModalOpen(false)}
              disabled={busy}
            >
              İptal
            </Button>
            <Button className="sm:w-36" onClick={() => void saveSession()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingSession ? (
                "Güncelle"
              ) : (
                "Ata"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
