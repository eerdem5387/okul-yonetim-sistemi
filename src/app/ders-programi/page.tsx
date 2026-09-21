"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  ClipboardList,
  Clock,
  Loader2,
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
import { DayTemplateEditorDialog } from "@/components/schedules/day-template-editor-dialog"
import { WeeklyScheduleCalendar } from "@/components/hr/WeeklyScheduleCalendar"
import { getAuthHeaders } from "@/components/hr/hr-utils"
import {
  DEFAULT_LESSON_SLOTS,
  gradeBandFor,
  gradesForBand,
  type GradeBand,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"

type ClassItem = {
  id: string
  name: string
  grade: number
  section: string
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

type ViewMode = "class" | "teacher" | "study"

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
  const [slotMap, setSlotMap] = useState<{
    ortaokul: Array<LessonSlot & { kind?: "LESSON" | "BREAK" }>
    lise: Array<LessonSlot & { kind?: "LESSON" | "BREAK" }>
  }>({ ortaokul: DEFAULT_LESSON_SLOTS, lise: DEFAULT_LESSON_SLOTS })

  const { schedules, loading: scheduleLoading, reload } = useClassSchedules(
    viewMode === "class" ? selectedClassId : null
  )

  const loadDayTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules/day-templates?band=all", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      const templates = Array.isArray(data.templates) ? data.templates : []
      const next = {
        ortaokul: DEFAULT_LESSON_SLOTS as Array<LessonSlot & { kind?: "LESSON" | "BREAK" }>,
        lise: DEFAULT_LESSON_SLOTS as Array<LessonSlot & { kind?: "LESSON" | "BREAK" }>,
      }
      for (const t of templates) {
        if (t.band === "ortaokul") {
          next.ortaokul = Array.isArray(t.slots) ? t.slots : next.ortaokul
        } else if (t.band === "lise") {
          next.lise = Array.isArray(t.slots) ? t.slots : next.lise
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
        classId: s.class?.id || "",
        className: s.class?.name || "Sınıf",
        subjectName: s.subjectName,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
      })),
      ...teacherStudyItems,
    ],
    [teacherSchedules, teacherStudyItems]
  )

  const stats = useMemo(() => {
    const total = filteredClasses.length
    const withSchedule = filteredClasses.filter((c) => (c._count?.schedules ?? 0) > 0).length
    const lessonCount = filteredClasses.reduce((sum, c) => sum + (c._count?.schedules ?? 0), 0)
    return { total, withSchedule, empty: total - withSchedule, lessonCount }
  }, [filteredClasses])

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
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

      <div className="flex flex-wrap gap-2">
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
        <div className="w-px bg-gray-200 mx-1 hidden sm:block" />
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
      </div>

      {viewMode === "study" ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <StudyGroupsPanel />
          </CardContent>
        </Card>
      ) : viewMode === "class" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="border-0 shadow-sm h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sınıflar</CardTitle>
              <CardDescription>Program düzenlemek için seçin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Sınıf ara"
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <select
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
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
                <div className="max-h-[28rem] overflow-y-auto space-y-1 pr-1">
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
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {selectedClass ? `${selectedClass.name} programı` : "Sınıf seçin"}
              </CardTitle>
              <CardDescription>
                {selectedClass
                  ? `${selectedClass.grade}. sınıf · hücreye tıklayın veya özel saat ekleyin`
                  : "Sol listeden bir sınıf seçerek programı düzenleyin"}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  slots={activeSlots}
                  onChanged={() => {
                    void reload()
                    void loadClasses()
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
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
              <WeeklyScheduleCalendar items={teacherCalendarItems} />
            )}
          </CardContent>
        </Card>
      )}

      <DayTemplateEditorDialog
        open={hoursOpen}
        onOpenChange={setHoursOpen}
        onSaved={() => void loadDayTemplates()}
      />
    </div>
  )
}
