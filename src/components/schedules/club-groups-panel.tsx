"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarPlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Split,
  Trash2,
  Users,
  X,
} from "lucide-react"
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
import { hasTimeConflict } from "@/lib/schedules/time-conflict"
import { scheduleInstructorDeptLabel } from "@/lib/staff-counseling"
import { ClubScheduleRosterDialog } from "@/components/schedules/club-schedule-roster-dialog"

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

type ClubOption = {
  id: string
  name: string
  capacity: number
  instructorId?: string | null
  _count: { selections: number }
  selections: Array<{ student: Student }>
}

type ClubGroupSchedule = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  exclusions?: Array<{
    studentId: string
    student: { firstName: string; lastName: string }
  }>
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
    instructorId?: string | null
    instructor: Teacher | null
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

type SessionForm = {
  teacherId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string
}

type EtutSlot = {
  label: string
  startTime: string
  endTime: string
}

type BusyBlock = {
  dayOfWeek: number
  startTime: string
  endTime: string
  label: string
}

type SlotPick = {
  dayOfWeek: number
  startTime: string
  endTime: string
}

function slotPickKey(s: SlotPick) {
  return `${s.dayOfWeek}|${s.startTime}|${s.endTime}`
}

function emptyForm(): GroupForm {
  return { clubId: "", name: "", notes: "", studentIds: [] }
}

function emptySessionForm(): SessionForm {
  return {
    teacherId: "",
    dayOfWeek: "1",
    startTime: "",
    endTime: "",
    room: "",
  }
}

type Props = {
  onSchedulesChanged?: () => void
  refreshKey?: number
}

export function ClubGroupsPanel({ onSchedulesChanged, refreshKey = 0 }: Props = {}) {
  const [groups, setGroups] = useState<ClubGroup[]>([])
  const [clubs, setClubs] = useState<ClubOption[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ClubGroup | null>(null)
  const [form, setForm] = useState<GroupForm>(emptyForm())
  const [studentSearch, setStudentSearch] = useState("")
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [error, setError] = useState("")
  const [rosterId, setRosterId] = useState<string | null>(null)
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitSource, setSplitSource] = useState<ClubGroup | null>(null)
  const [splitNewName, setSplitNewName] = useState("")
  const [splitRenameSource, setSplitRenameSource] = useState("")
  const [splitMoveIds, setSplitMoveIds] = useState<string[]>([])
  const [splitSearch, setSplitSearch] = useState("")

  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionGroup, setSessionGroup] = useState<ClubGroup | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<ClubGroupSchedule | null>(null)
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm)
  const [selectedSlots, setSelectedSlots] = useState<SlotPick[]>([])
  const [teacherBusy, setTeacherBusy] = useState<BusyBlock[]>([])
  const [teacherBusyLoading, setTeacherBusyLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [groupsRes, teachersRes, clubsSchedRes] = await Promise.all([
        fetch("/api/club-groups", { cache: "no-store" }),
        fetch("/api/staff/pickers?type=teachers-and-counselors", { headers: getAuthHeaders() }),
        fetch("/api/schedules/clubs", { cache: "no-store" }),
      ])
      const data = await groupsRes.json().catch(() => ({}))
      if (!groupsRes.ok) throw new Error(data.error || "Gruplar alınamadı")
      setGroups(Array.isArray(data.groups) ? data.groups : [])
      setClubs(Array.isArray(data.clubs) ? data.clubs : [])

      const tData = teachersRes.ok ? await teachersRes.json() : { staff: [] }
      setTeachers(Array.isArray(tData.staff) ? tData.staff : [])

      const schedData = clubsSchedRes.ok ? await clubsSchedRes.json() : {}
      setEtutSlots(Array.isArray(schedData.etutSlots) ? schedData.etutSlots : [])
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
  }, [load, refreshKey])

  const notifySchedulesChanged = useCallback(() => {
    onSchedulesChanged?.()
  }, [onSchedulesChanged])

  const loadTeacherBusy = useCallback(
    async (teacherId: string, excludeScheduleId?: string) => {
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
          })
        }
        for (const sess of Array.isArray(sessionData.sessions) ? sessionData.sessions : []) {
          blocks.push({
            dayOfWeek: sess.dayOfWeek,
            startTime: sess.startTime,
            endTime: sess.endTime,
            label: `ÖÇG: ${sess.studyGroup?.name ?? sess.topic ?? ""}`,
          })
        }
        for (const c of Array.isArray(clubData.schedules) ? clubData.schedules : []) {
          if (excludeScheduleId && c.id === excludeScheduleId) continue
          if (c.club?.instructorId !== teacherId && c.club?.instructor?.id !== teacherId) continue
          blocks.push({
            dayOfWeek: c.dayOfWeek,
            startTime: c.startTime,
            endTime: c.endTime,
            label: `Kulüp: ${c.clubGroup?.name ? `${c.club?.name} · ${c.clubGroup.name}` : c.club?.name ?? ""}`,
          })
        }
        setTeacherBusy(blocks)
      } catch {
        setTeacherBusy([])
      } finally {
        setTeacherBusyLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!sessionModalOpen) return
    void loadTeacherBusy(sessionForm.teacherId, editingSchedule?.id)
  }, [sessionModalOpen, sessionForm.teacherId, editingSchedule?.id, loadTeacherBusy])

  const selectedClub = useMemo(
    () => clubs.find((c) => c.id === form.clubId) || null,
    [clubs, form.clubId]
  )

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === sessionForm.teacherId) || null,
    [teachers, sessionForm.teacherId]
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

  const openCreateSession = (group: ClubGroup) => {
    setSessionGroup(group)
    setEditingSchedule(null)
    setSessionForm({
      ...emptySessionForm(),
      teacherId: group.club.instructorId || group.club.instructor?.id || "",
    })
    setSelectedSlots([])
    setTeacherBusy([])
    setSessionModalOpen(true)
  }

  const openSplit = (group: ClubGroup) => {
    if (group.students.length < 2) {
      alert("Grubu bölmek için en az 2 öğrenci olmalı.")
      return
    }
    const sorted = [...group.students].sort((a, b) =>
      `${a.student.lastName} ${a.student.firstName}`.localeCompare(
        `${b.student.lastName} ${b.student.firstName}`,
        "tr"
      )
    )
    const half = Math.floor(sorted.length / 2)
    const moveIds = sorted.slice(half).map((m) => m.student.id)
    const base = group.name.replace(/\s*[-–]\s*[AB]$/i, "").trim() || group.name
    setSplitSource(group)
    setSplitRenameSource(`${base} - A`)
    setSplitNewName(`${base} - B`)
    setSplitMoveIds(moveIds)
    setSplitSearch("")
    setSplitOpen(true)
  }

  const toggleSplitStudent = (id: string) => {
    setSplitMoveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const saveSplit = async () => {
    if (!splitSource) return
    if (!splitNewName.trim()) {
      alert("Yeni grup adı zorunludur.")
      return
    }
    if (splitMoveIds.length === 0) {
      alert("Yeni gruba taşınacak en az bir öğrenci seçiniz.")
      return
    }
    if (splitMoveIds.length >= splitSource.students.length) {
      alert("Mevcut grupta en az bir öğrenci kalmalı.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/club-groups/${splitSource.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newName: splitNewName.trim(),
          renameSourceTo: splitRenameSource.trim() || undefined,
          moveStudentIds: splitMoveIds,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || "Grup bölünemedi")
        return
      }
      setSplitOpen(false)
      setSplitSource(null)
      await load()
      notifySchedulesChanged()
      if (data.message) {
        // soft info via alert is ok for this workflow
        alert(data.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const groupsByClubCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of groups) {
      map.set(g.clubId, (map.get(g.clubId) ?? 0) + 1)
    }
    return map
  }, [groups])

  const splitFilteredStudents = useMemo(() => {
    if (!splitSource) return []
    const q = splitSearch.trim().toLocaleLowerCase("tr")
    return [...splitSource.students]
      .sort((a, b) =>
        `${a.student.lastName} ${a.student.firstName}`.localeCompare(
          `${b.student.lastName} ${b.student.firstName}`,
          "tr"
        )
      )
      .filter((m) => {
        if (!q) return true
        const hay = `${m.student.firstName} ${m.student.lastName} ${m.student.grade}`.toLocaleLowerCase(
          "tr"
        )
        return hay.includes(q)
      })
  }, [splitSource, splitSearch])

  const openEditSession = (group: ClubGroup, schedule: ClubGroupSchedule) => {
    setSessionGroup(group)
    setEditingSchedule(schedule)
    setSelectedSlots([])
    setSessionForm({
      teacherId: group.club.instructorId || group.club.instructor?.id || "",
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room || "",
    })
    setSessionModalOpen(true)
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

  const findBusy = (day: number, start: string, end: string) =>
    teacherBusy.find((b) => b.dayOfWeek === day && hasTimeConflict(b.startTime, b.endTime, start, end))

  const isSelectedSlot = (day: number, start: string, end: string) => {
    if (editingSchedule) {
      return (
        sessionForm.dayOfWeek === String(day) &&
        sessionForm.startTime === start &&
        sessionForm.endTime === end
      )
    }
    return selectedSlots.some(
      (s) => s.dayOfWeek === day && s.startTime === start && s.endTime === end
    )
  }

  const toggleSlotPick = (day: number, start: string, end: string) => {
    if (editingSchedule) {
      setSessionForm((prev) => ({
        ...prev,
        dayOfWeek: String(day),
        startTime: start,
        endTime: end,
      }))
      return
    }
    const pick: SlotPick = { dayOfWeek: day, startTime: start, endTime: end }
    const key = slotPickKey(pick)
    setSelectedSlots((prev) => {
      if (prev.some((s) => slotPickKey(s) === key)) {
        return prev.filter((s) => slotPickKey(s) !== key)
      }
      return [...prev, pick].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
      )
    })
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

  const saveSession = async () => {
    if (!sessionGroup) return

    const slotsToSave: SlotPick[] = editingSchedule
      ? [
          {
            dayOfWeek: parseInt(sessionForm.dayOfWeek, 10),
            startTime: sessionForm.startTime,
            endTime: sessionForm.endTime,
          },
        ]
      : selectedSlots

    if (slotsToSave.length === 0 || !slotsToSave[0].startTime || !slotsToSave[0].endTime) {
      alert("En az bir etüt saati seçiniz.")
      return
    }

    const instructorId = sessionForm.teacherId.trim() || null

    setBusy(true)
    try {
      if (editingSchedule) {
        const res = await fetch(`/api/schedules/clubs/${editingSchedule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clubGroupId: sessionGroup.id,
            dayOfWeek: slotsToSave[0].dayOfWeek,
            startTime: slotsToSave[0].startTime,
            endTime: slotsToSave[0].endTime,
            room: sessionForm.room.trim() || null,
            instructorId,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          alert((data as { error?: string }).error || "Atama kaydedilemedi")
          return
        }
      } else {
        const errors: string[] = []
        let okCount = 0
        for (const slot of slotsToSave) {
          const res = await fetch("/api/schedules/clubs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clubGroupId: sessionGroup.id,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: sessionForm.room.trim() || null,
              instructorId,
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            errors.push(
              `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}: ${(data as { error?: string }).error || "hata"}`
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
      }
      setSessionModalOpen(false)
      setSelectedSlots([])
      await load()
      notifySchedulesChanged()
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
      notifySchedulesChanged()
    } finally {
      setBusy(false)
    }
  }

  const removeSchedule = async (id: string) => {
    if (!confirm("Bu etüt atamasını kaldırmak istiyor musunuz?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/schedules/clubs/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Silinemedi")
        return
      }
      await load()
      notifySchedulesChanged()
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
            Başvurusu yoğun kulüpleri <strong>Grubu böl</strong> ile A/B gruplarına ayırıp her
            birine ayrı gün programı atayabilirsiniz. Günlük muafiyetler program satırından
            yönetilir.
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
                    <CardTitle className="truncate text-base flex items-center gap-2">
                      <span className="truncate">{g.name}</span>
                      {(groupsByClubCount.get(g.clubId) ?? 0) > 1 ? (
                        <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                          çoklu grup
                        </span>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {g.club.name}
                      {g.name !== g.club.name ? ` · alt grup` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Grubu böl"
                      disabled={busy || g.students.length < 2}
                      onClick={() => openSplit(g)}
                    >
                      <Split className="h-4 w-4" />
                    </Button>
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
              <CardContent className="space-y-3 text-sm">
                <p className="flex items-center gap-1.5 text-gray-700">
                  <Users className="h-4 w-4 text-gray-500" />
                  {g.students.length} öğrenci
                  {g.club.instructor
                    ? ` · ${g.club.instructor.firstName} ${g.club.instructor.lastName}`
                    : ""}
                </p>
                {g.students.length > 0 ? (
                  <div className="max-h-20 overflow-y-auto text-xs text-gray-600 leading-relaxed pr-0.5">
                    {g.students
                      .map((m) => `${m.student.firstName} ${m.student.lastName}`)
                      .join(", ")}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">Düzenle → öğrenci ekleyin</p>
                )}

                {g.schedules.length > 0 ? (
                  <ul className="space-y-1.5">
                    {g.schedules.map((sess) => {
                      const exclusions = sess.exclusions ?? []
                      return (
                      <li
                        key={sess.id}
                        className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-2.5 py-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left rounded-md hover:bg-emerald-100/60 px-1 py-0.5 -mx-1"
                            onClick={() => setRosterId(sess.id)}
                            title="Öğrenci listesini aç"
                          >
                            <p className="font-medium text-gray-900">
                              {DAY_NAMES[sess.dayOfWeek]} · {sess.startTime}–{sess.endTime}
                            </p>
                            {sess.room ? (
                              <p className="text-gray-600 truncate">{sess.room}</p>
                            ) : null}
                            {exclusions.length > 0 ? (
                              <p
                                className="mt-1 text-[11px] leading-snug text-amber-800"
                                title={exclusions
                                  .map(
                                    (e) =>
                                      `${e.student.firstName} ${e.student.lastName}`
                                  )
                                  .join(", ")}
                              >
                                {exclusions.length} öğrenci bu günden muaf
                                {exclusions.length <= 3
                                  ? `: ${exclusions
                                      .map(
                                        (e) =>
                                          `${e.student.firstName} ${e.student.lastName}`
                                      )
                                      .join(", ")}`
                                  : ""}
                              </p>
                            ) : (
                              <p className="mt-1 text-[11px] text-emerald-800">
                                Öğrencileri gör / düzenle
                              </p>
                            )}
                          </button>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditSession(g, sess)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600"
                              disabled={busy}
                              onClick={() => void removeSchedule(sess.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-700">Henüz etüt ataması yok</p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={busy || g.students.length < 2}
                    onClick={() => openSplit(g)}
                    title="Öğrencileri iki gruba ayır"
                  >
                    <Split className="h-3.5 w-3.5 mr-1.5" />
                    Grubu böl
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openCreateSession(g)}
                  >
                    <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                    Program ata
                  </Button>
                </div>
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

      {/* Program ataması — öğretmen seç → etüt grid (konu yok) */}
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
                {editingSchedule ? "Atamayı düzenle" : "Program ata"}
                {sessionGroup ? ` — ${sessionGroup.club.name} · ${sessionGroup.name}` : ""}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div>
                <Label>Öğretmen / Rehberlik (opsiyonel)</Label>
                <select
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm"
                  value={sessionForm.teacherId}
                  onChange={(e) => setSessionForm({ ...sessionForm, teacherId: e.target.value })}
                >
                  <option value="">Sonra atanacak</option>
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
                <Label>Derslik</Label>
                <Input
                  className="mt-1.5"
                  value={sessionForm.room}
                  onChange={(e) => setSessionForm({ ...sessionForm, room: e.target.value })}
                  placeholder="B203"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">Gün ve etüt saati</p>
                  <p className="text-sm text-gray-600">
                    {selectedTeacher
                      ? editingSchedule
                        ? `${selectedTeacher.firstName} ${selectedTeacher.lastName} — bir hücre seçin`
                        : `${selectedTeacher.firstName} ${selectedTeacher.lastName} — birden fazla boş hücre seçebilirsiniz`
                      : editingSchedule
                        ? "Öğretmen sonra atanabilir — bir hücre seçin"
                        : "Öğretmen sonra atanabilir — birden fazla boş hücre seçebilirsiniz"}
                  </p>
                </div>
                <p className="text-xs font-medium text-emerald-800 bg-white/80 border border-emerald-100 rounded-lg px-3 py-1.5">
                  {editingSchedule
                    ? `Seçili: ${DAY_NAMES[parseInt(sessionForm.dayOfWeek, 10) || 1]} · ${sessionForm.startTime}–${sessionForm.endTime}`
                    : selectedSlots.length === 0
                      ? "Henüz saat seçilmedi"
                      : `${selectedSlots.length} saat seçili`}
                </p>
              </div>

              {teacherBusyLoading ? (
                <div className="flex justify-center py-10 text-gray-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Program yükleniyor...
                </div>
              ) : etutSlots.length === 0 ? (
                <p className="text-sm text-amber-800 py-6 text-center">
                  Tanımlı etüt saati yok. Ders saatleri’nden türü Etüt olan satırlar ekleyin.
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
                        <tr key={`${slot.startTime}-${slot.endTime}`}>
                          <td className="border-b border-r border-gray-200 p-2 text-xs font-medium text-emerald-900 bg-emerald-50/80">
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
                                  key={`${day}-${slot.startTime}`}
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
                                key={`${day}-${slot.startTime}`}
                                className={`border-b border-gray-100 p-1.5 cursor-pointer align-middle transition-colors ${
                                  selected
                                    ? "bg-emerald-100 ring-2 ring-inset ring-emerald-500"
                                    : "bg-emerald-50/70 hover:bg-emerald-100"
                                }`}
                                onClick={() => toggleSlotPick(day, slot.startTime, slot.endTime)}
                              >
                                <div className="h-11 flex items-center justify-center">
                                  <span
                                    className={`text-[10px] font-medium ${
                                      selected ? "text-emerald-900" : "text-emerald-700"
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
              {editingSchedule
                ? "Öğretmeni şimdi veya sonra atayabilirsiniz."
                : "Öğretmen olmadan da etüt yerleştirebilirsiniz; sonra karttan düzenleyerek öğretmen ekleyin."}
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
              ) : editingSchedule ? (
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

      {/* Grubu böl — öğrencileri iki alt gruba ayır */}
      <Dialog
        open={splitOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSplitOpen(false)
            setSplitSource(null)
          } else {
            setSplitOpen(true)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Grubu böl
              {splitSource ? ` — ${splitSource.club.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          {splitSource ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Seçili öğrenciler yeni gruba taşınır; kalanlar mevcut grupta kalır. Bölme sonrası
                her karttan <strong>Program ata</strong> ile ayrı gün/saat verebilirsiniz.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Mevcut grup adı (A)</Label>
                  <Input
                    className="mt-1"
                    value={splitRenameSource}
                    onChange={(e) => setSplitRenameSource(e.target.value)}
                    placeholder="örn. Gastronomi Lise - A"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Kalacak: {(splitSource.students.length - splitMoveIds.length).toLocaleString("tr")}{" "}
                    öğrenci
                  </p>
                </div>
                <div>
                  <Label>Yeni grup adı (B)</Label>
                  <Input
                    className="mt-1"
                    value={splitNewName}
                    onChange={(e) => setSplitNewName(e.target.value)}
                    placeholder="örn. Gastronomi Lise - B"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Taşınacak: {splitMoveIds.length.toLocaleString("tr")} öğrenci
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    Yeni gruba taşınacak öğrenciler
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const sorted = [...splitSource.students].sort((a, b) =>
                          `${a.student.lastName} ${a.student.firstName}`.localeCompare(
                            `${b.student.lastName} ${b.student.firstName}`,
                            "tr"
                          )
                        )
                        const half = Math.floor(sorted.length / 2)
                        setSplitMoveIds(sorted.slice(half).map((m) => m.student.id))
                      }}
                    >
                      Yarıya böl
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={splitMoveIds.length === 0}
                      onClick={() => setSplitMoveIds([])}
                    >
                      Seçimi temizle
                    </Button>
                  </div>
                </div>

                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-8"
                    placeholder="Öğrenci ara…"
                    value={splitSearch}
                    onChange={(e) => setSplitSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-1">
                  {splitFilteredStudents.map((m) => {
                    const s = m.student
                    const active = splitMoveIds.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSplitStudent(s.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                          active
                            ? "bg-emerald-50 text-emerald-900"
                            : "hover:bg-gray-50 text-gray-800"
                        }`}
                      >
                        <span>
                          {s.firstName} {s.lastName}
                          <span className="ml-2 text-xs text-gray-500">{s.grade}</span>
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                          {active ? "→ B" : "A’da kalır"}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setSplitOpen(false)
                    setSplitSource(null)
                  }}
                >
                  İptal
                </Button>
                <Button type="button" onClick={() => void saveSplit()} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Böl ve oluştur"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ClubScheduleRosterDialog
        open={!!rosterId}
        clubScheduleId={rosterId}
        onOpenChange={(o) => {
          if (!o) setRosterId(null)
        }}
        onChanged={() => {
          void load()
          notifySchedulesChanged()
        }}
      />
    </div>
  )
}
