"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Calendar,
  ClipboardList,
  Clock,
  Loader2,
  Maximize2,
  Minimize2,
  School,
  Search,
  User,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  ClassScheduleGrid,
  useClassSchedules,
  type ScheduleRow,
} from "@/components/schedules/class-schedule-grid"
import { StudyGroupsPanel } from "@/components/schedules/study-groups-panel"
import { ClubSchedulesPanel } from "@/components/schedules/club-schedules-panel"
import { DayTemplateEditorDialog } from "@/components/schedules/day-template-editor-dialog"
import { ScheduleCoursesDialog } from "@/components/schedules/schedule-courses-dialog"
import { TeacherScheduleGrid } from "@/components/schedules/teacher-schedule-grid"
import { getAuthHeaders } from "@/components/hr/hr-utils"
import {
  DEFAULT_LESSON_SLOTS,
  DEFAULT_SATURDAY_SLOTS,
  gradeBandFor,
  gradesForBand,
  type ClassSaturdayMode,
  type GradeBand,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"
import type { SlotKind } from "@/lib/schedules/day-templates"

type ClassItem = {
  id: string
  name: string
  grade: number
  section: string
  saturdayEnabled?: boolean
  saturdayMode?: ClassSaturdayMode
  _count?: { students?: number; schedules?: number }
}

type TeacherItem = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

type TeacherScheduleRow = ScheduleRow & {
  class?: { id: string; name: string; grade?: number; section?: string }
}

type ViewMode = "class" | "teacher" | "study" | "club"

export default function DersProgramiPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [loading, setLoading] = useState(true)
  const [band, setBand] = useState<GradeBand>("all")
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all")
  const [search, setSearch] = useState("")
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("class")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherScheduleRow[]>([])
  const [teacherStudyItems, setTeacherStudyItems] = useState<
    Array<{
      id: string
      classId: string
      className: string
      subjectName: string
      dayOfWeek: number
      startTime: string
      endTime: string
      room: string | null
    }>
  >([])
  const [teacherLoading, setTeacherLoading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [coursesOpen, setCoursesOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [saturdaySaving, setSaturdaySaving] = useState(false)
  const [slotMap, setSlotMap] = useState<{
    ortaokul: Array<LessonSlot & { kind?: SlotKind }>
    lise: Array<LessonSlot & { kind?: SlotKind }>
    ortaokulSaturday: Array<LessonSlot & { kind?: SlotKind }>
    liseSaturday: Array<LessonSlot & { kind?: SlotKind }>
  }>({
    ortaokul: DEFAULT_LESSON_SLOTS,
    lise: DEFAULT_LESSON_SLOTS,
    ortaokulSaturday: DEFAULT_SATURDAY_SLOTS,
    liseSaturday: DEFAULT_SATURDAY_SLOTS,
  })

  const { schedules, loading: scheduleLoading, reload } = useClassSchedules(
    viewMode === "class" ? selectedClassId : null
  )

  const loadDayTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules/day-templates?band=all&scope=both", {
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      const templates = Array.isArray(data.templates) ? data.templates : []
      const next = {
        ortaokul: DEFAULT_LESSON_SLOTS as Array<LessonSlot & { kind?: SlotKind }>,
        lise: DEFAULT_LESSON_SLOTS as Array<LessonSlot & { kind?: SlotKind }>,
        ortaokulSaturday: DEFAULT_SATURDAY_SLOTS as Array<LessonSlot & { kind?: SlotKind }>,
        liseSaturday: DEFAULT_SATURDAY_SLOTS as Array<LessonSlot & { kind?: SlotKind }>,
      }
      for (const t of templates) {
        const scope = t.scope === "saturday" ? "saturday" : "weekday"
        if (t.band === "ortaokul") {
          if (scope === "saturday") {
            next.ortaokulSaturday = Array.isArray(t.slots) ? t.slots : next.ortaokulSaturday
          } else {
            next.ortaokul = Array.isArray(t.slots) ? t.slots : next.ortaokul
          }
        } else if (t.band === "lise") {
          if (scope === "saturday") {
            next.liseSaturday = Array.isArray(t.slots) ? t.slots : next.liseSaturday
          } else {
            next.lise = Array.isArray(t.slots) ? t.slots : next.lise
          }
        }
      }
      setSlotMap(next)
    } catch {
      /* keep defaults */
    }
  }, [])

  const loadClasses = useCallback(async () => {
    setLoading(true)
    try {
      const role = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null
      const staffId = typeof window !== "undefined" ? localStorage.getItem("staff_id") : null
      setUserRole(role)
      let url = "/api/classes"
      if (role === "counselor" && staffId) {
        url += `?counselorId=${staffId}`
      }
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error("fail")
      const data = await res.json()
      setClasses(Array.isArray(data.classes) ? data.classes : [])
    } catch {
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadClasses()
    void loadDayTemplates()
    fetch("/api/staff/pickers?type=teachers", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : { staff: [] }))
      .then((data) => setTeachers(Array.isArray(data.staff) ? data.staff : []))
      .catch(() => setTeachers([]))
  }, [loadClasses, loadDayTemplates])

  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [fullscreen])

  const filteredClasses = useMemo(() => {
    const bandGrades = gradesForBand(band)
    const q = search.trim().toLocaleLowerCase("tr-TR")
    return classes
      .filter((c) => {
        if (bandGrades && !bandGrades.includes(c.grade)) return false
        if (gradeFilter !== "all" && c.grade !== gradeFilter) return false
        if (!q) return true
        return c.name.toLocaleLowerCase("tr-TR").includes(q)
      })
      .sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section, "tr"))
  }, [classes, band, gradeFilter, search])

  const gradeOptions = useMemo(() => {
    const bandGrades = gradesForBand(band)
    const set = new Set(classes.map((c) => c.grade))
    return [...set]
      .filter((g) => !bandGrades || bandGrades.includes(g))
      .sort((a, b) => a - b)
  }, [classes, band])

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  )

  const activeSlots = useMemo(() => {
    const band = selectedClass ? gradeBandFor(selectedClass.grade) : null
    if (band === "lise") return slotMap.lise
    return slotMap.ortaokul
  }, [selectedClass, slotMap])

  const activeSaturdaySlots = useMemo(() => {
    const band = selectedClass ? gradeBandFor(selectedClass.grade) : null
    if (band === "lise") return slotMap.liseSaturday
    return slotMap.ortaokulSaturday
  }, [selectedClass, slotMap])

  const updateSaturdaySettings = async (patch: {
    saturdayEnabled?: boolean
    saturdayMode?: ClassSaturdayMode
  }) => {
    if (!selectedClassId) return
    setSaturdaySaving(true)
    try {
      const res = await fetch(`/api/classes/${selectedClassId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Cumartesi ayarı kaydedilemedi")
        return
      }
      setClasses((prev) =>
        prev.map((c) =>
          c.id === selectedClassId
            ? {
                ...c,
                saturdayEnabled:
                  patch.saturdayEnabled !== undefined
                    ? patch.saturdayEnabled
                    : c.saturdayEnabled,
                saturdayMode:
                  patch.saturdayMode !== undefined ? patch.saturdayMode : c.saturdayMode,
              }
            : c
        )
      )
    } finally {
      setSaturdaySaving(false)
    }
  }

  useEffect(() => {
    if (filteredClasses.length === 0) {
      setSelectedClassId(null)
      return
    }
    if (!selectedClassId || !filteredClasses.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0].id)
    }
  }, [filteredClasses, selectedClassId])

  useEffect(() => {
    if (viewMode !== "teacher" || !selectedTeacherId) {
      setTeacherSchedules([])
      setTeacherStudyItems([])
      return
    }
    let cancelled = false
    setTeacherLoading(true)
    Promise.all([
      fetch(`/api/schedules?teacherId=${selectedTeacherId}`, { cache: "no-store" }),
      fetch(`/api/study-groups?teacherId=${selectedTeacherId}`, { cache: "no-store" }),
    ])
      .then(async ([schedRes, groupRes]) => {
        const schedData = schedRes.ok ? await schedRes.json() : { schedules: [] }
        const groupData = groupRes.ok ? await groupRes.json() : { groups: [] }
        if (cancelled) return
        setTeacherSchedules(Array.isArray(schedData.schedules) ? schedData.schedules : [])
        const groups = Array.isArray(groupData.groups) ? groupData.groups : []
        setTeacherStudyItems(
          groups.map(
            (g: {
              id: string
              name: string
              subjectName?: string | null
              dayOfWeek: number
              startTime: string
              endTime: string
              room?: string | null
            }) => ({
              id: `sg-${g.id}`,
              classId: "",
              className: `Özel: ${g.name}`,
              subjectName: g.subjectName || g.name,
              dayOfWeek: g.dayOfWeek,
              startTime: g.startTime,
              endTime: g.endTime,
              room: g.room ?? null,
            })
          )
        )
      })
      .catch(() => {
        if (!cancelled) {
          setTeacherSchedules([])
          setTeacherStudyItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setTeacherLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [viewMode, selectedTeacherId])

  const teacherCalendarItems = useMemo(
    () => [
      ...teacherSchedules.map((s) => ({
        id: s.id,
        className: s.class?.name || "Sınıf",
        subjectName: s.subjectName,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        kind: "class" as const,
      })),
      ...teacherStudyItems.map((g) => ({
        id: g.id,
        className: g.className,
        subjectName: g.subjectName,
        dayOfWeek: g.dayOfWeek,
        startTime: g.startTime,
        endTime: g.endTime,
        room: g.room,
        kind: "study" as const,
      })),
    ],
    [teacherSchedules, teacherStudyItems]
  )

  const teacherWeekdaySlots = useMemo(() => {
    const map = new Map<string, LessonSlot & { kind?: SlotKind; band?: "ortaokul" | "lise" }>()
    for (const s of slotMap.ortaokul) {
      if ((s.kind ?? "LESSON") === "ETUT") continue
      if (!map.has(s.startTime)) map.set(s.startTime, { ...s, band: "ortaokul" })
    }
    for (const s of slotMap.lise) {
      if ((s.kind ?? "LESSON") === "ETUT") continue
      if (!map.has(s.startTime)) map.set(s.startTime, { ...s, band: "lise" })
    }
    return [...map.values()].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [slotMap])

  const teacherSaturdaySlots = useMemo(() => {
    const map = new Map<string, LessonSlot & { kind?: SlotKind; band?: "ortaokul" | "lise" }>()
    for (const s of slotMap.ortaokulSaturday) {
      if ((s.kind ?? "LESSON") === "ETUT") continue
      if (!map.has(s.startTime)) map.set(s.startTime, { ...s, band: "ortaokul" })
    }
    for (const s of slotMap.liseSaturday) {
      if ((s.kind ?? "LESSON") === "ETUT") continue
      if (!map.has(s.startTime)) map.set(s.startTime, { ...s, band: "lise" })
    }
    return [...map.values()].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [slotMap])

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) ?? null,
    [teachers, selectedTeacherId]
  )

  const stats = useMemo(() => {
    const total = filteredClasses.length
    const withSchedule = filteredClasses.filter((c) => (c._count?.schedules ?? 0) > 0).length
    const lessonCount = filteredClasses.reduce((sum, c) => sum + (c._count?.schedules ?? 0), 0)
    return { total, withSchedule, empty: total - withSchedule, lessonCount }
  }, [filteredClasses])

  const viewModeButtons = (
    <>
      <Button
        size="sm"
        variant={viewMode === "class" ? "default" : "outline"}
        onClick={() => setViewMode("class")}
      >
        <School className="h-4 w-4 mr-1" />
        Sınıf
      </Button>
      <Button
        size="sm"
        variant={viewMode === "teacher" ? "default" : "outline"}
        onClick={() => setViewMode("teacher")}
      >
        <User className="h-4 w-4 mr-1" />
        Öğretmen
      </Button>
      <Button
        size="sm"
        variant={viewMode === "study" ? "default" : "outline"}
        onClick={() => setViewMode("study")}
      >
        <Users className="h-4 w-4 mr-1" />
        Özel Çalışma
      </Button>
      <Button
        size="sm"
        variant={viewMode === "club" ? "default" : "outline"}
        onClick={() => setViewMode("club")}
      >
        <Users className="h-4 w-4 mr-1" />
        Kulüp
      </Button>
    </>
  )

  const workspace = (
    <>
      {viewMode === "study" ? (
        <Card className={`border-0 shadow-sm ${fullscreen ? "h-full overflow-y-auto" : ""}`}>
          <CardContent className="p-4 sm:p-6">
            <StudyGroupsPanel />
          </CardContent>
        </Card>
      ) : viewMode === "club" ? (
        <Card className={`border-0 shadow-sm ${fullscreen ? "h-full overflow-y-auto" : ""}`}>
          <CardContent className="p-4 sm:p-6">
            <ClubSchedulesPanel />
          </CardContent>
        </Card>
      ) : viewMode === "class" ? (
        <div
          className={
            fullscreen
              ? "h-full min-h-0 grid gap-4 lg:grid-cols-[260px_1fr] overflow-hidden"
              : "grid gap-4 lg:grid-cols-[280px_1fr]"
          }
        >
          <Card
            className={`border-0 shadow-sm ${
              fullscreen ? "h-full overflow-hidden flex flex-col" : "h-fit lg:sticky lg:top-4"
            }`}
          >
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base">Sınıflar</CardTitle>
              <CardDescription>Program düzenlemek için seçin</CardDescription>
            </CardHeader>
            <CardContent className={`space-y-3 ${fullscreen ? "flex-1 min-h-0 flex flex-col" : ""}`}>
              <div className="relative shrink-0">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Sınıf ara"
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <select
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shrink-0"
                value={gradeFilter === "all" ? "all" : String(gradeFilter)}
                onChange={(e) =>
                  setGradeFilter(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))
                }
              >
                <option value="all">Tüm düzeyler</option>
                {gradeOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}. Sınıf
                  </option>
                ))}
              </select>

              {loading ? (
                <div className="flex justify-center py-8 text-gray-500 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yükleniyor...
                </div>
              ) : filteredClasses.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">Sınıf bulunamadı</p>
              ) : (
                <div
                  className={`overflow-y-auto space-y-1 pr-1 ${
                    fullscreen ? "flex-1 min-h-0" : "max-h-[28rem]"
                  }`}
                >
                  {filteredClasses.map((c) => {
                    const active = c.id === selectedClassId
                    const bandLabel = gradeBandFor(c.grade) === "ortaokul" ? "Ortaokul" : "Lise"
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClassId(c.id)}
                        className={`w-full text-left rounded-lg px-3 py-2.5 border transition ${
                          active
                            ? "border-indigo-400 bg-indigo-50 shadow-sm"
                            : "border-transparent hover:bg-gray-50 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-900">{c.name}</span>
                          <span className="text-[10px] text-gray-500">{bandLabel}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c._count?.schedules ?? 0} ders · {c._count?.students ?? 0} öğrenci
                          {c.saturdayEnabled ? " · Cumartesi" : ""}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className={`border-0 shadow-sm ${
              fullscreen ? "h-full overflow-hidden flex flex-col" : ""
            }`}
          >
            <CardHeader className="pb-3 shrink-0">
              <div className="min-w-0 space-y-3">
                <div>
                  <CardTitle className="text-lg">
                    {selectedClass ? `${selectedClass.name} programı` : "Sınıf seçin"}
                  </CardTitle>
                  <CardDescription>
                    {selectedClass
                      ? `${selectedClass.grade}. sınıf · hücreye tıklayın veya özel saat ekleyin`
                      : "Sol listeden bir sınıf seçerek programı düzenleyin"}
                  </CardDescription>
                </div>
                {selectedClass && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2.5">
                    <label className="inline-flex items-center gap-2 text-sm text-violet-950 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!selectedClass.saturdayEnabled}
                        disabled={saturdaySaving}
                        onChange={(e) =>
                          void updateSaturdaySettings({ saturdayEnabled: e.target.checked })
                        }
                      />
                      Cumartesi programı açık
                    </label>
                    {selectedClass.saturdayEnabled && (
                      <select
                        className="rounded-md border border-violet-200 bg-white px-2 py-1.5 text-sm"
                        value={selectedClass.saturdayMode === "EXAM_ONLY" ? "EXAM_ONLY" : "FULL"}
                        disabled={saturdaySaving}
                        onChange={(e) =>
                          void updateSaturdaySettings({
                            saturdayMode: e.target.value as ClassSaturdayMode,
                          })
                        }
                      >
                        <option value="FULL">Normal dersler</option>
                        <option value="EXAM_ONLY">Yalnızca deneme sınavı</option>
                      </select>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className={fullscreen ? "flex-1 min-h-0 overflow-y-auto" : ""}>
              {!selectedClassId ? (
                <p className="text-sm text-gray-500 py-16 text-center">Sınıf seçilmedi</p>
              ) : scheduleLoading ? (
                <div className="flex justify-center py-16 text-gray-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Program yükleniyor...
                </div>
              ) : (
                <ClassScheduleGrid
                  classId={selectedClassId}
                  className={selectedClass?.name}
                  schedules={schedules}
                  onChanged={() => {
                    void reload()
                    void loadClasses()
                  }}
                  slots={activeSlots}
                  saturdayEnabled={!!selectedClass?.saturdayEnabled}
                  saturdayMode={
                    selectedClass?.saturdayMode === "EXAM_ONLY" ? "EXAM_ONLY" : "FULL"
                  }
                  saturdaySlots={activeSaturdaySlots}
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className={`border-0 shadow-sm ${fullscreen ? "h-full overflow-y-auto" : ""}`}>
          <CardHeader>
            <CardTitle className="text-lg">Öğretmen programı</CardTitle>
            <CardDescription>Öğretmen seçerek haftalık yükünü görüntüleyin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              className="w-full max-w-md rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
            >
              <option value="">Öğretmen seçiniz</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                  {t.subject ? ` (${t.subject})` : ""}
                </option>
              ))}
            </select>
            {!selectedTeacherId ? (
              <p className="text-sm text-gray-500 py-10 text-center">Öğretmen seçin</p>
            ) : teacherLoading ? (
              <div className="flex justify-center py-16 text-gray-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Yükleniyor...
              </div>
            ) : teacherCalendarItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">Bu öğretmene atanmış ders yok.</p>
            ) : (
              <TeacherScheduleGrid
                items={teacherCalendarItems}
                weekdaySlots={teacherWeekdaySlots}
                saturdaySlots={teacherSaturdaySlots}
                title={
                  selectedTeacher
                    ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
                    : undefined
                }
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  )

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {!fullscreen && (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-7 w-7 text-indigo-600" />
                Ders Programı
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Ortaokul ve lise sınıflarının haftalık programını buradan yönetin
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setCoursesOpen(true)}>
                <BookOpen className="h-4 w-4 mr-2" />
                Ders tanımları
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHoursOpen(true)}>
                <Clock className="h-4 w-4 mr-2" />
                Ders saatleri
              </Button>
              {(userRole === "admin" || userRole === "principal") && (
                <Link href="/onay-paneli">
                  <Button variant="outline" size="sm">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Onay Paneli
                  </Button>
                </Link>
              )}
              <Link href="/sinif-yonetimi">
                <Button variant="outline" size="sm">
                  <School className="h-4 w-4 mr-2" />
                  Sınıf Yönetimi
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Sınıf</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Programı olan</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.withSchedule}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Boş program</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.empty}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Toplam ders satırı</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.lessonCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {(
              [
                { id: "all" as const, label: "Tümü" },
                { id: "ortaokul" as const, label: "Ortaokul (5–8)" },
                { id: "lise" as const, label: "Lise (9–12)" },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.id}
                size="sm"
                variant={band === opt.id ? "default" : "outline"}
                onClick={() => {
                  setBand(opt.id)
                  setGradeFilter("all")
                }}
              >
                {opt.label}
              </Button>
            ))}
            <div className="w-px bg-gray-200 mx-1 hidden sm:block self-stretch" />
            {viewModeButtons}
            <div className="w-px bg-gray-200 mx-1 hidden sm:block self-stretch" />
            <Button size="sm" variant="outline" onClick={() => setFullscreen(true)}>
              <Maximize2 className="h-4 w-4 mr-1" />
              Tam ekran
            </Button>
          </div>

          {workspace}
        </>
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-[60] bg-slate-100 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b bg-white shrink-0">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                Ders programı — tam ekran
                {viewMode === "class" && selectedClass ? ` · ${selectedClass.name}` : ""}
                {viewMode === "teacher" ? " · Öğretmen" : ""}
                {viewMode === "study" ? " · Özel Çalışma" : ""}
                {viewMode === "club" ? " · Kulüp" : ""}
              </p>
              <p className="text-xs text-gray-500">Esc ile çıkabilirsiniz</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {viewModeButtons}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFullscreen(false)}
                title="Tam ekrandan çık"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                Küçült
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-4">{workspace}</div>
        </div>
      )}

      <DayTemplateEditorDialog
        open={hoursOpen}
        onOpenChange={setHoursOpen}
        onSaved={() => void loadDayTemplates()}
      />
      <ScheduleCoursesDialog open={coursesOpen} onOpenChange={setCoursesOpen} />
    </div>
  )
}
