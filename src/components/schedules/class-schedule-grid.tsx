"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Calendar, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAuthHeaders } from "@/components/hr/hr-utils"
import {
  DAY_NAMES,
  DEFAULT_LESSON_SLOTS,
  DEFAULT_SATURDAY_SLOTS,
  DENEME_SINAVI_SUBJECT,
  SATURDAY_INDEX,
  WEEKDAY_INDEXES,
  type ClassSaturdayMode,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"

export type ScheduleTeacher = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
  branches?: Array<{ id: string; name: string }>
}

export type ScheduleRow = {
  id: string
  subjectName: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  teacher: ScheduleTeacher
}

export type GridSlot = LessonSlot & { kind?: "LESSON" | "BREAK" | "ETUT" }

type ScheduleForm = {
  subjectName: string
  teacherId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string
}

const emptyForm = (): ScheduleForm => ({
  subjectName: "",
  teacherId: "",
  dayOfWeek: "",
  startTime: "",
  endTime: "",
  room: "",
})

function slotLabel(slots: GridSlot[], startTime: string, endTime?: string): string {
  const slot = slots.find(
    (s) => s.startTime === startTime && (!endTime || s.endTime === endTime)
  )
  if (slot) return slot.label
  return `${startTime}${endTime ? `–${endTime}` : ""}`
}

export function ClassScheduleGrid({
  classId,
  className,
  schedules,
  onChanged,
  slots: slotsProp,
  saturdayEnabled = false,
  saturdayMode = "FULL",
  saturdaySlots: saturdaySlotsProp,
}: {
  classId: string
  className?: string
  schedules: ScheduleRow[]
  onChanged: () => void
  slots?: GridSlot[]
  saturdayEnabled?: boolean
  saturdayMode?: ClassSaturdayMode
  saturdaySlots?: GridSlot[]
}) {
  const slots: GridSlot[] = slotsProp && slotsProp.length > 0 ? slotsProp : DEFAULT_LESSON_SLOTS
  const saturdaySlots: GridSlot[] =
    saturdaySlotsProp && saturdaySlotsProp.length > 0
      ? saturdaySlotsProp
      : DEFAULT_SATURDAY_SLOTS.map((s) => ({ ...s, kind: "LESSON" as const }))
  // Sınıf programında etüt satırları gösterilmez (kulüp / ÖÇG ayrı sekmede)
  const displaySlots = slots.filter((s) => (s.kind ?? "LESSON") !== "ETUT")
  const lessonSlots = displaySlots.filter((s) => (s.kind ?? "LESSON") === "LESSON")
  const saturdayDisplaySlots = saturdaySlots.filter((s) => (s.kind ?? "LESSON") !== "ETUT")
  const saturdayLessonSlots = saturdayDisplaySlots.filter(
    (s) => (s.kind ?? "LESSON") === "LESSON"
  )
  const dayIndexes = saturdayEnabled
    ? ([...WEEKDAY_INDEXES, SATURDAY_INDEX] as number[])
    : ([...WEEKDAY_INDEXES] as number[])
  const isExamOnly = saturdayEnabled && saturdayMode === "EXAM_ONLY"
  const [teachers, setTeachers] = useState<ScheduleTeacher[]>([])
  const [courses, setCourses] = useState<
    Array<{ id: string; name: string; branchId?: string | null; branch?: { id: string; name: string } | null }>
  >([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleRow | null>(null)
  const [form, setForm] = useState<ScheduleForm>(emptyForm)
  const [customSubject, setCustomSubject] = useState(false)
  const [busy, setBusy] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)
  const [teacherQuery, setTeacherQuery] = useState("")
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false)

  const selectedBranchId = useMemo(() => {
    if (!form.subjectName.trim()) return null
    const course = courses.find((c) => c.name === form.subjectName)
    return course?.branchId || course?.branch?.id || null
  }, [courses, form.subjectName])

  const loadTeachers = useCallback((branchId?: string | null) => {
    const qs = branchId
      ? `/api/staff/pickers?type=teachers&branchId=${encodeURIComponent(branchId)}`
      : "/api/staff/pickers?type=teachers"
    fetch(qs, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : { staff: [] }))
      .then((data) => setTeachers(Array.isArray(data.staff) ? data.staff : []))
      .catch(() => setTeachers([]))
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    setUserRole(localStorage.getItem("auth_role"))
    setStaffId(localStorage.getItem("staff_id"))
  }, [])

  useEffect(() => {
    loadTeachers(null)
  }, [loadTeachers])

  useEffect(() => {
    if (!modalOpen) return
    loadTeachers(selectedBranchId)
  }, [modalOpen, selectedBranchId, loadTeachers])

  const loadCourses = useCallback(() => {
    fetch("/api/schedules/courses", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { courses: [] }))
      .then((data) => setCourses(Array.isArray(data.courses) ? data.courses : []))
      .catch(() => setCourses([]))
  }, [])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    if (modalOpen) loadCourses()
  }, [modalOpen, loadCourses])

  const openCell = (dayOfWeek: number, startTime: string, endTime: string) => {
    const existing = schedules.find(
      (s) => s.dayOfWeek === dayOfWeek && s.startTime === startTime
    )
    if (existing) {
      setEditing(existing)
      const known = courses.some((c) => c.name === existing.subjectName)
      setCustomSubject(!known && !!existing.subjectName)
      setForm({
        subjectName: existing.subjectName,
        teacherId: existing.teacher.id,
        dayOfWeek: String(existing.dayOfWeek),
        startTime: existing.startTime,
        endTime: existing.endTime,
        room: existing.room || "",
      })
    } else {
      setEditing(null)
      const defaultSubject =
        dayOfWeek === SATURDAY_INDEX && saturdayMode === "EXAM_ONLY"
          ? DENEME_SINAVI_SUBJECT
          : ""
      const known = courses.some((c) => c.name === defaultSubject)
      setCustomSubject(!!defaultSubject && !known)
      setForm({
        subjectName: defaultSubject,
        teacherId: "",
        dayOfWeek: String(dayOfWeek),
        startTime,
        endTime,
        room: "",
      })
    }
    setModalOpen(true)
    setTeacherQuery("")
    setTeacherPickerOpen(!existing)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setCustomSubject(false)
    setForm(emptyForm())
    setTeacherQuery("")
    setTeacherPickerOpen(false)
  }

  const save = async () => {
    if (!form.subjectName.trim() || !form.teacherId || !form.dayOfWeek || !form.startTime || !form.endTime) {
      alert("Ders adı, öğretmen, gün ve saat zorunludur.")
      return
    }
    const day = parseInt(form.dayOfWeek, 10)
    if (day === SATURDAY_INDEX && !saturdayEnabled) {
      alert("Bu sınıf için cumartesi programı kapalı. Sınıf yönetiminde açabilirsiniz.")
      return
    }
    if (
      day === SATURDAY_INDEX &&
      saturdayMode === "EXAM_ONLY" &&
      form.subjectName.trim() !== DENEME_SINAVI_SUBJECT
    ) {
      if (
        !confirm(
          `Bu sınıf cumartesi için “yalnızca deneme sınavı” modunda.\nYine de “${form.subjectName.trim()}” olarak kaydedilsin mi?`
        )
      ) {
        return
      }
    }
    setBusy(true)
    try {
      const url = editing ? `/api/schedules/${editing.id}` : "/api/schedules"
      const method = editing ? "PUT" : "POST"
      const body: Record<string, unknown> = {
        classId,
        subjectName: form.subjectName.trim(),
        teacherId: form.teacherId,
        dayOfWeek: day,
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room.trim() || undefined,
      }
      if (userRole === "counselor" && staffId) {
        body.requestedBy = staffId
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Kayıt başarısız")
        return
      }
      if ((data as { pendingApproval?: boolean }).pendingApproval) {
        alert("Talebiniz onaya gönderildi. Onaylandıktan sonra programa yansır.")
      }
      closeModal()
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (scheduleId: string) => {
    if (!confirm("Bu dersi silmek istediğinize emin misiniz?")) return
    setBusy(true)
    try {
      let url = `/api/schedules/${scheduleId}`
      if (userRole === "counselor" && staffId) {
        url += `?requestedBy=${staffId}`
      }
      const res = await fetch(url, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Silinemedi")
        return
      }
      if ((data as { pendingApproval?: boolean }).pendingApproval) {
        alert("Silme talebi onaya gönderildi.")
      }
      closeModal()
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const unmatched = useMemo(() => {
    const weekdayStarts = new Set(lessonSlots.map((s) => s.startTime))
    const saturdayStarts = new Set(saturdayLessonSlots.map((s) => s.startTime))
    return schedules.filter((s) => {
      if (!dayIndexes.includes(s.dayOfWeek)) return false
      if (s.dayOfWeek === SATURDAY_INDEX) return !saturdayStarts.has(s.startTime)
      return !weekdayStarts.has(s.startTime)
    })
  }, [schedules, lessonSlots, saturdayLessonSlots, dayIndexes])

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === form.teacherId) ?? null,
    [teachers, form.teacherId]
  )

  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLocaleLowerCase("tr-TR")
    if (!q) return teachers
    return teachers.filter((t) => {
      const full = `${t.firstName} ${t.lastName}`.toLocaleLowerCase("tr-TR")
      const subject = (t.subject || "").toLocaleLowerCase("tr-TR")
      return full.includes(q) || subject.includes(q) || t.lastName.toLocaleLowerCase("tr-TR").includes(q)
    })
  }, [teachers, teacherQuery])

  const renderDayColumn = (
    day: number,
    slot: GridSlot,
    isBreak: boolean
  ) => {
    if (isBreak) {
      return (
        <td
          key={`${day}-${slot.id}-break`}
          className="border-b border-gray-100 p-1.5 bg-amber-50/40 text-center text-[10px] text-amber-700/80"
        >
          —
        </td>
      )
    }
    const row = schedules.find(
      (s) => s.dayOfWeek === day && s.startTime === slot.startTime
    )
    return (
      <td
        key={`${day}-${slot.id}`}
        className={`border-b border-gray-100 p-1.5 cursor-pointer align-top transition-colors ${
          row
            ? day === SATURDAY_INDEX
              ? "bg-violet-50/80 hover:bg-violet-100/80"
              : "bg-emerald-50/80 hover:bg-emerald-100/80"
            : "hover:bg-blue-50"
        }`}
        onClick={() => openCell(day, slot.startTime, slot.endTime)}
      >
        {row ? (
          <div className="space-y-0.5 px-1 py-0.5">
            <p className="text-xs font-semibold text-gray-900 leading-tight">
              {row.subjectName}
            </p>
            <p className="text-[10px] text-gray-600 leading-tight">
              {row.teacher.firstName} {row.teacher.lastName}
            </p>
            {(row.startTime !== slot.startTime || row.endTime !== slot.endTime) && (
              <p className="text-[10px] text-indigo-600">
                {row.startTime}–{row.endTime}
              </p>
            )}
            {row.room && (
              <p className="text-[10px] text-gray-500">{row.room}</p>
            )}
          </div>
        ) : (
          <div className="flex h-12 items-center justify-center text-gray-300">
            <Plus className="h-4 w-4" />
          </div>
        )}
      </td>
    )
  }

  return (
    <div className="space-y-4">
      {className && (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{className}</span> haftalık programı — ders
          hücrelerine tıklayın. Saat şablonu:{" "}
          <span className="font-medium">Ders saatleri</span> butonundan düzenlenir.
          {saturdayEnabled && (
            <span className="ml-1 text-violet-700">
              Cumartesi açık
              {isExamOnly ? " (yalnızca deneme sınavı)" : ""}.
            </span>
          )}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse min-w-[720px]">
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
            {displaySlots.map((slot) => {
              const isBreak = (slot.kind ?? "LESSON") === "BREAK"
              return (
              <tr key={`${slot.id}-${slot.startTime}-${slot.label}`}>
                <td
                  className={`border-b border-r border-gray-200 p-2 text-xs font-medium ${
                    isBreak ? "bg-amber-50 text-amber-900" : "text-gray-700 bg-gray-50/80"
                  }`}
                >
                  <div>{slot.label}</div>
                  <div className="text-[10px] opacity-70 font-normal">
                    {slot.startTime}–{slot.endTime}
                  </div>
                </td>
                {WEEKDAY_INDEXES.map((day) => renderDayColumn(day, slot, isBreak))}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {saturdayEnabled && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-semibold text-violet-950">Cumartesi programı</p>
              <p className="text-xs text-violet-800/80">
                {isExamOnly
                  ? "Bu sınıf cumartesi yalnızca deneme sınavı için. Hücreye tıklayınca ders adı Deneme Sınavı önerilir; öğretmen atayın."
                  : "Cumartesi saatleri ayrı şablondan gelir (Ders saatleri → Cumartesi)."}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white">
            <table className="w-full border-collapse min-w-[320px]">
              <thead>
                <tr className="bg-violet-50/80">
                  <th className="border-b border-r border-violet-100 p-2 text-xs font-semibold text-violet-900 w-28">
                    Saat
                  </th>
                  <th className="border-b border-violet-100 p-2 text-xs font-semibold text-violet-900">
                    Cumartesi
                  </th>
                </tr>
              </thead>
              <tbody>
                {saturdayDisplaySlots.map((slot) => {
                  const isBreak = (slot.kind ?? "LESSON") === "BREAK"
                  return (
                    <tr key={`sat-${slot.id}-${slot.startTime}`}>
                      <td
                        className={`border-b border-r border-violet-50 p-2 text-xs font-medium ${
                          isBreak
                            ? "bg-amber-50 text-amber-900"
                            : "text-violet-900 bg-violet-50/50"
                        }`}
                      >
                        <div>{slot.label}</div>
                        <div className="text-[10px] opacity-70 font-normal">
                          {slot.startTime}–{slot.endTime}
                        </div>
                      </td>
                      {renderDayColumn(SATURDAY_INDEX, slot, isBreak)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-900">
            Varsayılan slot dışında saatli dersler ({unmatched.length})
          </p>
          <div className="space-y-1">
            {unmatched.map((row) => (
              <button
                key={row.id}
                type="button"
                className="w-full text-left text-sm rounded-lg border border-amber-100 bg-white px-3 py-2 hover:border-amber-300"
                onClick={() => {
                  setEditing(row)
                  setForm({
                    subjectName: row.subjectName,
                    teacherId: row.teacher.id,
                    dayOfWeek: String(row.dayOfWeek),
                    startTime: row.startTime,
                    endTime: row.endTime,
                    room: row.room || "",
                  })
                  setModalOpen(true)
                }}
              >
                {DAY_NAMES[row.dayOfWeek]} · {row.startTime}–{row.endTime} · {row.subjectName} ·{" "}
                {row.teacher.firstName} {row.teacher.lastName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(null)
            setForm({
              ...emptyForm(),
              dayOfWeek: "1",
              startTime: "08:00",
              endTime: "08:40",
            })
            setModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Özel saatli ders ekle
        </Button>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
          else setModalOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <span>{editing ? "Dersi düzenle" : "Ders ekle"}</span>
              {editing && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => void remove(editing.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Sil
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                {DAY_NAMES[parseInt(form.dayOfWeek, 10) || 0]} ·{" "}
                {slotLabel(slots, form.startTime, form.endTime)}
              </span>
            </div>

            <div>
              <Label>Ders *</Label>
              {customSubject ? (
                <div className="mt-1 space-y-2">
                  <Input
                    value={form.subjectName}
                    onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                    placeholder="Özel ders adı yazın"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={() => {
                      setCustomSubject(false)
                      setForm({ ...form, subjectName: "" })
                    }}
                  >
                    Listeden seç
                  </button>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <select
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    value={form.subjectName}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setCustomSubject(true)
                        setForm({ ...form, subjectName: "", teacherId: "" })
                        return
                      }
                      setForm({ ...form, subjectName: e.target.value, teacherId: "" })
                      setTeacherPickerOpen(true)
                      setTeacherQuery("")
                    }}
                    autoFocus
                  >
                    <option value="">Ders seçiniz</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {form.subjectName &&
                      !courses.some((c) => c.name === form.subjectName) && (
                        <option value={form.subjectName}>{form.subjectName}</option>
                      )}
                    <option value="__custom__">Diğer (yazarak ekle)…</option>
                  </select>
                  {courses.length === 0 && (
                    <p className="text-xs text-amber-700">
                      Henüz ders tanımı yok. Ders Programı → Ders tanımları ile ekleyin.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Öğretmen *</Label>
              {form.subjectName && selectedBranchId && (
                <p className="mt-0.5 text-[11px] text-indigo-700">
                  Bu dersin branşına kayıtlı öğretmenler listeleniyor.
                </p>
              )}
              {form.subjectName && !selectedBranchId && !customSubject && (
                <p className="mt-0.5 text-[11px] text-amber-700">
                  Bu ders henüz branşa bağlı değil — tüm öğretmenler gösteriliyor.
                </p>
              )}
              {selectedTeacher && !teacherPickerOpen ? (
                <div className="mt-1 flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedTeacher.firstName} {selectedTeacher.lastName}
                    </p>
                    {selectedTeacher.subject && (
                      <p className="text-xs text-gray-500 truncate">{selectedTeacher.subject}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    onClick={() => {
                      setTeacherPickerOpen(true)
                      setTeacherQuery("")
                    }}
                  >
                    Değiştir
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 shrink-0 text-gray-500"
                    onClick={() => {
                      setForm({ ...form, teacherId: "" })
                      setTeacherPickerOpen(true)
                      setTeacherQuery("")
                    }}
                    title="Seçimi temizle"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={teacherQuery}
                      onChange={(e) => {
                        setTeacherQuery(e.target.value)
                        setTeacherPickerOpen(true)
                      }}
                      onFocus={() => setTeacherPickerOpen(true)}
                      placeholder="Ad veya branş yazarak ara…"
                      className="pl-9"
                      autoComplete="off"
                    />
                  </div>
                  {teacherPickerOpen && (
                    <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white divide-y shadow-sm">
                      {filteredTeachers.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-gray-500">
                          Öğretmen bulunamadı
                        </p>
                      ) : (
                        filteredTeachers.map((t) => {
                          const active = form.teacherId === t.id
                          return (
                            <button
                              key={t.id}
                              type="button"
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 ${
                                active ? "bg-indigo-50" : ""
                              }`}
                              onClick={() => {
                                setForm({ ...form, teacherId: t.id })
                                setTeacherPickerOpen(false)
                                setTeacherQuery("")
                              }}
                            >
                              <span className="font-medium text-gray-900">
                                {t.firstName} {t.lastName}
                              </span>
                              {t.subject ? (
                                <span className="text-gray-500"> ({t.subject})</span>
                              ) : null}
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Gün</Label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                >
                  {dayIndexes.map((d) => (
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
                placeholder="Örn: A101"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeModal} disabled={busy}>
                İptal
              </Button>
              <Button className="flex-1" onClick={() => void save()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Güncelle" : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Convenience hook-free reload helper types for parent pages */
export function useClassSchedules(classId: string | null) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!classId) {
      setSchedules([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/schedules?classId=${classId}`, { cache: "no-store" })
      if (!res.ok) throw new Error("fail")
      const data = await res.json()
      setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
    } catch {
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    void load()
  }, [load])

  return { schedules, loading, reload: load }
}
