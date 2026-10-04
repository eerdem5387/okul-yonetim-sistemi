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
import { ClubGradeLevelField } from "@/components/clubs/club-grade-level-field"
import {
  CLUB_GRADE_LEVELS,
  effectiveClubGradeLevels,
  formatClubGradeLevels,
} from "@/lib/club-grade-levels"
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
import { scheduleInstructorDeptLabel } from "@/lib/staff-counseling"

type Teacher = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
  department?: string | null
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
  gradeLevels: number[]
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
  gradeLevels: number[]
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
type SlotBand = "ortaokul" | "lise" | "mixed"

type SessionSlotPick = {
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherId: string
  topic: string
  room: string
}

function slotPickKey(s: Pick<SessionSlotPick, "dayOfWeek" | "startTime" | "endTime">) {
  return `${s.dayOfWeek}|${s.startTime}|${s.endTime}`
}

const GRADE_LEVELS = [...CLUB_GRADE_LEVELS]

const emptyGroupForm = (): GroupForm => ({
  name: "",
  gradeLevels: [...CLUB_GRADE_LEVELS],
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

/** Sınıf düzeylerine göre ders saati şablonu. */
function bandForStudyGroup(group: StudyGroup | null): SlotBand {
  if (!group) return "ortaokul"
  const levels = effectiveClubGradeLevels(group.gradeLevels)
  const hasOrta = levels.some((l) => gradeBandFor(l) === "ortaokul")
  const hasLise = levels.some((l) => gradeBandFor(l) === "lise")
  if (hasOrta && hasLise) return "mixed"
  return hasLise ? "lise" : "ortaokul"
}

function slotsForBand(
  band: SlotBand,
  slotMap: { ortaokul: GridSlot[]; lise: GridSlot[] }
): GridSlot[] {
  if (band === "lise") return slotMap.lise
  if (band === "ortaokul") return slotMap.ortaokul
  return assignableSlots([...slotMap.ortaokul, ...slotMap.lise])
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
  const [selectedSlots, setSelectedSlots] = useState<SessionSlotPick[]>([])
  const [teacherBusy, setTeacherBusy] = useState<BusyBlock[]>([])
  const [teacherBusyLoading, setTeacherBusyLoading] = useState(false)
  const [slotMap, setSlotMap] = useState<{ ortaokul: GridSlot[]; lise: GridSlot[] }>({
    ortaokul: assignableSlots([...DEFAULT_ORTAOKUL_WEEKDAY_SLOTS]),
    lise: assignableSlots([...DEFAULT_LISE_WEEKDAY_SLOTS]),
  })

  const sessionBand = useMemo(() => bandForStudyGroup(sessionGroup), [sessionGroup])
  const slots = useMemo(() => slotsForBand(sessionBand, slotMap), [sessionBand, slotMap])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [groupsRes, teachersRes, studentsRes, templatesRes] = await Promise.all([
        fetch("/api/study-groups", { cache: "no-store" }),
        fetch("/api/staff/pickers?type=teachers-and-counselors", { headers: getAuthHeaders() }),
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

  /** Grubun o hücredeki mevcut ataması (diğer öğretmenler dahil) */
  const groupSessionAt = (day: number, start: string, end: string) => {
    if (!sessionGroup) return null
    return (
      sessionGroup.sessions.find(
        (s) => s.dayOfWeek === day && s.startTime === start && s.endTime === end
      ) ?? null
    )
  }

  const pendingAt = (day: number, start: string, end: string) =>
    selectedSlots.find(
      (s) => s.dayOfWeek === day && s.startTime === start && s.endTime === end
    ) ?? null

  const isSelectedSlot = (day: number, start: string, end: string) => {
    if (editingSession) {
      return (
        sessionForm.dayOfWeek === String(day) &&
        sessionForm.startTime === start &&
        sessionForm.endTime === end
      )
    }
    const pending = pendingAt(day, start, end)
    // Sol tabloda yalnızca şu an seçili öğretmenin bekleyen hücreleri “Seçildi”
    return Boolean(pending && pending.teacherId === sessionForm.teacherId)
  }

  const toggleSlotPick = (day: number, start: string, end: string) => {
    if (editingSession) {
      setSessionForm((prev) => ({
        ...prev,
        dayOfWeek: String(day),
        startTime: start,
        endTime: end,
      }))
      return
    }

    if (!sessionForm.teacherId) {
      alert("Önce öğretmen seçiniz.")
      return
    }
    if (!sessionForm.topic.trim()) {
      alert("Önce konu yazınız. Her öğretmen için konu, hücre seçmeden önce girilir.")
      return
    }

    const existingGroup = groupSessionAt(day, start, end)
    if (existingGroup) {
      alert(
        `Bu saatte grubun zaten ataması var: ${existingGroup.teacher.firstName} ${existingGroup.teacher.lastName}. ` +
          `Değiştirmek için karttaki atamayı düzenleyin.`
      )
      return
    }

    const key = slotPickKey({ dayOfWeek: day, startTime: start, endTime: end })
    const existingPending = selectedSlots.find((s) => slotPickKey(s) === key)

    // Aynı hücreye tekrar tıklama: aynı öğretmense kaldır, değilse yeni öğretmene çevir
    if (existingPending) {
      if (existingPending.teacherId === sessionForm.teacherId) {
        setSelectedSlots((prev) => prev.filter((s) => slotPickKey(s) !== key))
        return
      }
    }

    const pick: SessionSlotPick = {
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      teacherId: sessionForm.teacherId,
      topic: sessionForm.topic.trim(),
      room: sessionForm.room.trim(),
    }
    setSelectedSlots((prev) => {
      const without = prev.filter((s) => slotPickKey(s) !== key)
      return [...without, pick].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
      )
    })
  }

  const teacherNameById = (id: string) => {
    const t = teachers.find((x) => x.id === id)
    return t ? `${t.firstName} ${t.lastName}` : "Öğretmen"
  }

  const pendingSummary = useMemo(() => {
    const byTeacher = new Map<string, number>()
    for (const s of selectedSlots) {
      byTeacher.set(s.teacherId, (byTeacher.get(s.teacherId) ?? 0) + 1)
    }
    return [...byTeacher.entries()].map(([id, n]) => {
      const t = teachers.find((x) => x.id === id)
      const name = t ? `${t.firstName} ${t.lastName}` : "Öğretmen"
      return `${name} ×${n}`
    })
  }, [selectedSlots, teachers])

  const openCreateGroup = () => {
    setEditingGroup(null)
    setGroupForm(emptyGroupForm())
    setStudentSearch("")
    setGradeLevelFilter("all")
    setShowSelectedOnly(false)
    setGroupModalOpen(true)
  }

  const openEditGroup = (group: StudyGroup) => {
    const levels = effectiveClubGradeLevels(group.gradeLevels)
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      gradeLevels: levels,
      notes: group.notes || "",
      studentIds: group.students.map((m) => m.student.id),
    })
    setStudentSearch("")
    setGradeLevelFilter("all")
    setShowSelectedOnly(false)
    setGroupModalOpen(true)
  }

  const openCreateSession = (group: StudyGroup) => {
    const band = bandForStudyGroup(group)
    const bandSlots = slotsForBand(band, slotMap)
    setSessionGroup(group)
    setEditingSession(null)
    setSessionForm(emptySessionForm(bandSlots))
    setSelectedSlots([])
    setTeacherBusy([])
    setSessionModalOpen(true)
  }

  const openEditSession = (group: StudyGroup, session: StudySession) => {
    setSessionGroup(group)
    setEditingSession(session)
    setSelectedSlots([])
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
    if (groupForm.gradeLevels.length === 0) {
      alert("En az bir sınıf düzeyi seçiniz (veya Tümü).")
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
          gradeLevels: groupForm.gradeLevels,
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

    if (editingSession) {
      if (!sessionForm.teacherId || !sessionForm.topic.trim()) {
        alert("Öğretmen ve konu zorunludur.")
        return
      }
      setBusy(true)
      try {
        const res = await fetch(`/api/study-groups/sessions/${editingSession.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: sessionForm.teacherId,
            dayOfWeek: parseInt(sessionForm.dayOfWeek, 10),
            startTime: sessionForm.startTime,
            endTime: sessionForm.endTime,
            room: sessionForm.room.trim() || null,
            topic: sessionForm.topic.trim(),
            notes: sessionForm.notes.trim() || null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          alert((data as { error?: string }).error || "Atama kaydedilemedi")
          return
        }
        setSessionModalOpen(false)
        setSelectedSlots([])
        await load()
      } finally {
        setBusy(false)
      }
      return
    }

    if (selectedSlots.length === 0) {
      alert("En az bir gün/ders saati seçiniz.")
      return
    }

    const missing = selectedSlots.filter((s) => !s.teacherId || !s.topic.trim())
    if (missing.length > 0) {
      alert("Bazı seçimlerde öğretmen veya konu eksik. Öğretmen ve konuyu seçip hücreleri yeniden işaretleyin.")
      return
    }

    setBusy(true)
    try {
      const errors: string[] = []
      let okCount = 0
      for (const slot of selectedSlots) {
        const res = await fetch("/api/study-groups/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studyGroupId: sessionGroup.id,
            teacherId: slot.teacherId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room.trim() || null,
            topic: slot.topic.trim(),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          errors.push(
            `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime} (${teacherNameById(slot.teacherId)}): ${
              (data as { error?: string }).error || "hata"
            }`
          )
        } else {
          okCount++
        }
      }
      if (errors.length > 0) {
        alert(
          (okCount > 0 ? `${okCount} atama kaydedildi.\n\n` : "") +
            `Kaydedilemeyenler:\n${errors.join("\n")}`
        )
        if (okCount === 0) return
      }
      setSessionModalOpen(false)
      setSelectedSlots([])
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
                        {formatClubGradeLevels(group.gradeLevels)}
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
                  <div className="max-h-20 overflow-y-auto text-xs text-gray-600 leading-relaxed pr-0.5">
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
                <ClubGradeLevelField
                  value={groupForm.gradeLevels}
                  onChange={(gradeLevels) => setGroupForm({ ...groupForm, gradeLevels })}
                  label="Sınıf düzeyi *"
                  hint="Tümü veya birden fazla sınıf seçebilirsiniz."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Kartta görünür; program atamasında{" "}
                  {(() => {
                    const band = bandForStudyGroup({
                      id: "",
                      name: "",
                      gradeLevels: groupForm.gradeLevels,
                      notes: null,
                      students: [],
                      sessions: [],
                    })
                    if (band === "mixed") return "ortaokul + lise"
                    return band === "lise" ? "lise" : "ortaokul"
                  })()}{" "}
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
        <DialogContent className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto p-0">
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
                <Label>Öğretmen / Rehberlik *</Label>
                <select
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm"
                  value={sessionForm.teacherId}
                  onChange={(e) => setSessionForm({ ...sessionForm, teacherId: e.target.value })}
                >
                  <option value="">Seçiniz</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                      {t.department && t.department !== "OGRETMEN"
                        ? ` (${scheduleInstructorDeptLabel(t.department)})`
                        : t.subject
                          ? ` (${t.subject})`
                          : ""}
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm text-gray-600">
                Öğretmen + konu seç → boş hücrelere tıkla → öğretmen değiştir → başka hücreler seç → tek
                seferde kaydet. Sol: seçili öğretmen; sağ: grup programı + bekleyen seçimler.
              </p>
              {!editingSession && selectedSlots.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
                    {selectedSlots.length} atama hazır
                    {pendingSummary.length > 0 ? ` · ${pendingSummary.join(", ")}` : ""}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setSelectedSlots([])}
                  >
                    Seçimleri temizle
                  </Button>
                </div>
              )}
              {editingSession && sessionForm.teacherId && (
                <p className="text-xs font-medium text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
                  Seçili: {DAY_NAMES[parseInt(sessionForm.dayOfWeek, 10) || 1]} · {sessionForm.startTime}
                  –{sessionForm.endTime}
                </p>
              )}
            </div>

            {!sessionForm.teacherId ? (
              <p className="text-sm text-gray-500 py-10 text-center rounded-2xl border border-dashed border-gray-200">
                Öğretmen seçildikten sonra her iki program yan yana açılır
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
              <div className="grid gap-4 xl:grid-cols-2">
                {/* Sol: öğretmen */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2 min-w-0">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Öğretmen · {selectedTeacher?.firstName} {selectedTeacher?.lastName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {editingSession
                        ? "Bir hücre seçin"
                        : "Boş hücrelere tıklayın (mevcut seçimler öğretmen değişince korunur)"}
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-white bg-white">
                    <table className="w-full border-collapse min-w-[520px]">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border-b border-r border-gray-200 p-1.5 text-[10px] font-semibold text-gray-700 w-24">
                            Saat
                          </th>
                          {WEEKDAY_INDEXES.map((day) => (
                            <th
                              key={day}
                              className="border-b border-gray-200 p-1.5 text-[10px] font-semibold text-gray-700"
                            >
                              {DAY_NAMES[day].slice(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map((slot) => (
                          <tr key={`t-${slot.id}-${slot.startTime}`}>
                            <td
                              className={`border-b border-r border-gray-200 p-1.5 text-[10px] font-medium ${
                                slot.kind === "ETUT"
                                  ? "text-emerald-900 bg-emerald-50/80"
                                  : "text-gray-800 bg-gray-50/80"
                              }`}
                            >
                              <div>{slot.label}</div>
                              <div className="text-[9px] opacity-70 font-normal">
                                {slot.startTime}–{slot.endTime}
                              </div>
                            </td>
                            {WEEKDAY_INDEXES.map((day) => {
                              const occupied = findBusy(day, slot.startTime, slot.endTime)
                              const selected = isSelectedSlot(day, slot.startTime, slot.endTime)
                              const pendingOther = pendingAt(day, slot.startTime, slot.endTime)
                              const groupOcc = groupSessionAt(day, slot.startTime, slot.endTime)
                              if (occupied) {
                                return (
                                  <td
                                    key={`t-${day}-${slot.id}`}
                                    className="border-b border-gray-100 p-1 align-top bg-rose-50"
                                    title={occupied.label}
                                  >
                                    <p className="text-[9px] font-semibold text-rose-800 leading-tight line-clamp-2 px-0.5">
                                      {occupied.label}
                                    </p>
                                    <p className="text-[8px] text-rose-600 px-0.5">Dolu</p>
                                  </td>
                                )
                              }
                              if (!editingSession && groupOcc) {
                                return (
                                  <td
                                    key={`t-${day}-${slot.id}`}
                                    className="border-b border-gray-100 p-1 align-top bg-amber-50"
                                    title="Grupta zaten atama var"
                                  >
                                    <p className="text-[9px] font-semibold text-amber-900 leading-tight line-clamp-2 px-0.5">
                                      Grup dolu
                                    </p>
                                    <p className="text-[8px] text-amber-700 px-0.5">
                                      {groupOcc.teacher.firstName}
                                    </p>
                                  </td>
                                )
                              }
                              if (
                                !editingSession &&
                                pendingOther &&
                                pendingOther.teacherId !== sessionForm.teacherId
                              ) {
                                return (
                                  <td
                                    key={`t-${day}-${slot.id}`}
                                    className="border-b border-gray-100 p-1 cursor-pointer align-top bg-sky-50 hover:bg-sky-100"
                                    title="Başka öğretmen için seçildi — tıklayınca bu öğretmene geçer"
                                    onClick={() => toggleSlotPick(day, slot.startTime, slot.endTime)}
                                  >
                                    <p className="text-[9px] font-semibold text-sky-900 leading-tight line-clamp-2 px-0.5">
                                      {teacherNameById(pendingOther.teacherId)}
                                    </p>
                                    <p className="text-[8px] text-sky-700 px-0.5">Bekliyor</p>
                                  </td>
                                )
                              }
                              return (
                                <td
                                  key={`t-${day}-${slot.id}`}
                                  className={`border-b border-gray-100 p-1 cursor-pointer align-middle transition-colors ${
                                    selected
                                      ? "bg-violet-100 ring-2 ring-inset ring-violet-400"
                                      : "bg-emerald-50/70 hover:bg-emerald-100"
                                  }`}
                                  onClick={() => toggleSlotPick(day, slot.startTime, slot.endTime)}
                                >
                                  <div className="h-9 flex items-center justify-center">
                                    <span
                                      className={`text-[9px] font-medium ${
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
                </div>

                {/* Sağ: grup */}
                <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-3 space-y-2 min-w-0">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Grup · {sessionGroup?.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Kayıtlı atamalar + henüz kaydedilmemiş seçimler
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-white bg-white">
                    <table className="w-full border-collapse min-w-[520px]">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border-b border-r border-gray-200 p-1.5 text-[10px] font-semibold text-gray-700 w-24">
                            Saat
                          </th>
                          {WEEKDAY_INDEXES.map((day) => (
                            <th
                              key={day}
                              className="border-b border-gray-200 p-1.5 text-[10px] font-semibold text-gray-700"
                            >
                              {DAY_NAMES[day].slice(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map((slot) => (
                          <tr key={`g-${slot.id}-${slot.startTime}`}>
                            <td
                              className={`border-b border-r border-gray-200 p-1.5 text-[10px] font-medium ${
                                slot.kind === "ETUT"
                                  ? "text-emerald-900 bg-emerald-50/80"
                                  : "text-gray-800 bg-gray-50/80"
                              }`}
                            >
                              <div>{slot.label}</div>
                              <div className="text-[9px] opacity-70 font-normal">
                                {slot.startTime}–{slot.endTime}
                              </div>
                            </td>
                            {WEEKDAY_INDEXES.map((day) => {
                              const sess = groupSessionAt(day, slot.startTime, slot.endTime)
                              const pending = pendingAt(day, slot.startTime, slot.endTime)
                              const isEditingHere = editingSession && sess?.id === editingSession.id
                              if (sess) {
                                return (
                                  <td
                                    key={`g-${day}-${slot.id}`}
                                    className={`border-b border-gray-100 p-1 align-top ${
                                      isEditingHere
                                        ? "bg-violet-100 ring-2 ring-inset ring-violet-400"
                                        : "bg-violet-50"
                                    }`}
                                    title={`${sess.teacher.firstName} ${sess.teacher.lastName} · ${sess.topic}`}
                                  >
                                    <p className="text-[9px] font-semibold text-violet-900 leading-tight line-clamp-2 px-0.5">
                                      {sess.teacher.firstName} {sess.teacher.lastName}
                                    </p>
                                    <p className="text-[8px] text-violet-700 line-clamp-1 px-0.5">
                                      {sess.topic || "Konu yok"}
                                    </p>
                                  </td>
                                )
                              }
                              if (pending) {
                                return (
                                  <td
                                    key={`g-${day}-${slot.id}`}
                                    className="border-b border-gray-100 p-1 align-top bg-sky-50 ring-1 ring-inset ring-sky-300"
                                    title={`Bekleyen: ${teacherNameById(pending.teacherId)} · ${pending.topic}`}
                                  >
                                    <p className="text-[9px] font-semibold text-sky-900 leading-tight line-clamp-2 px-0.5">
                                      {teacherNameById(pending.teacherId)}
                                    </p>
                                    <p className="text-[8px] text-sky-700 line-clamp-1 px-0.5">
                                      {pending.topic} · bekliyor
                                    </p>
                                  </td>
                                )
                              }
                              return (
                                <td
                                  key={`g-${day}-${slot.id}`}
                                  className="border-b border-gray-100 p-1 align-middle bg-gray-50/50"
                                >
                                  <div className="h-9 flex items-center justify-center">
                                    <span className="text-[9px] text-gray-300">—</span>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 border-t bg-white px-6 py-4 flex flex-col sm:flex-row gap-3">
            <p className="text-xs text-gray-500 sm:flex-1 self-center">
              {editingSession
                ? "Soldaki tablodan yeni saat seçebilirsiniz; sağdaki tabloda grubun diğer atamalarını görün."
                : "Farklı öğretmenlerle haftanın etütlerini biriktirip tek Kaydet ile yazabilirsiniz."}
            </p>
            <Button
              variant="outline"
              className="sm:w-28"
              onClick={() => setSessionModalOpen(false)}
              disabled={busy}
            >
              İptal
            </Button>
            <Button className="sm:w-40" onClick={() => void saveSession()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingSession ? (
                "Güncelle"
              ) : selectedSlots.length > 1 ? (
                `${selectedSlots.length} atama kaydet`
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
