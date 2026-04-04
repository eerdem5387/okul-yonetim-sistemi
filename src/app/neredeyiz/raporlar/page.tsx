"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToastContainer, useToast } from "@/components/ui/toast"
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Filter,
  X,
  CheckCircle2,
  Clock,
  Target,
  BookOpen,
} from "lucide-react"
import GanttChart from "@/components/neredeyiz/gantt-chart"
import TimelineView from "@/components/neredeyiz/timeline-view"
import CalendarView from "@/components/neredeyiz/calendar-view"
import KanbanView from "@/components/neredeyiz/kanban-view"
import { CLASS_COUNSELOR_DEPARTMENTS } from "@/lib/staff-counseling"

interface AcademicYear {
  id: string
  name: string
  isActive: boolean
}

interface Subject {
  id: string
  name: string
  grade: number
  section: string | null
}

interface ProgressReport {
  subjects: Array<{
    subjectName: string
    totalTopics: number
    completedTopics: number
    earlyTopics?: number
    lateCompletedTopics?: number
    inProgressTopics: number
    plannedTopics: number
    delayedTopics: number
    completionPercentage: number
  }>
  summary: {
    totalSubjects: number
    totalTopics: number
    completedTopics: number
    earlyTopics?: number
    lateCompletedTopics?: number
    averageCompletion: number
  }
}

interface DelayedTopic {
  id: string
  name: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  delayDays: number
  unit: {
    id: string
    name: string
  }
  subject: {
    id: string
    name: string
    grade: number
    section: string | null
  }
  progress: Array<{
    id: string
    status: string
    actualEndDate: string | null
  }>
}

interface DelayedTopicsReport {
  delayedTopics: DelayedTopic[]
  summary: {
    totalDelayed: number
    totalDelayDays: number
    averageDelayDays: number
  }
}

interface DisruptionReport {
  disruptions: Array<{
    type: string
    typeLabel: string
    count: number
    totalDays: number
    percentage: number
  }>
  summary: {
    totalDisruptions: number
    totalDays: number
    averageDaysPerDisruption: number
  }
}

export default function RaporlarPage() {
  const { toasts, error, removeToast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [activeYearId, setActiveYearId] = useState<string>("")
  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null)
  const [delayedTopicsReport, setDelayedTopicsReport] = useState<DelayedTopicsReport | null>(null)
  const [disruptionReport, setDisruptionReport] = useState<DisruptionReport | null>(null)
  const [ganttTopics, setGanttTopics] = useState<Array<{
    id: string
    name: string
    plannedStartDate: string | null
    plannedEndDate: string | null
    status: "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "GECIKMELI" | "GECIKMELI_TAMAMLANDI"
    delayDays: number
    subject: {
      name: string
      grade: number
      section: string | null
    }
    unit: {
      name: string
    }
  }>>([])
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  
  // Filtreleme state'leri
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [dateRangeStart, setDateRangeStart] = useState<string>("")
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [disruptionTypeFilter, setDisruptionTypeFilter] = useState<string>("ALL")
  const [showFilters, setShowFilters] = useState(false)
  const [activeView, setActiveView] = useState<"gantt" | "timeline" | "calendar" | "kanban">("gantt")

  // Dashboard istatistikleri
  const [stats, setStats] = useState<{
    total: number
    completed: number
    early: number
    lateCompleted: number
    inProgress: number
    delayed: number
  }>({
    total: 0,
    completed: 0,
    early: 0,
    lateCompleted: 0,
    inProgress: 0,
    delayed: 0,
  })
  
  // Performans raporları
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])
  const [counselors, setCounselors] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])
  const [selectedTeacher, setSelectedTeacher] = useState<string>("")
  const [selectedCounselor, setSelectedCounselor] = useState<string>("")
  const [teacherPerformance, setTeacherPerformance] = useState<{
    teacher: { id: string; firstName: string; lastName: string }
    subjects: Array<{
      subjectId: string
      subjectName: string
      grade: number
      section: string | null
      totalTopics: number
      completedTopics: number
      inProgressTopics: number
      delayedTopics: number
      completionRate: number
    }>
    summary: {
      totalSubjects: number
      totalTopics: number
      completedTopics: number
      inProgressTopics: number
      delayedTopics: number
      completionRate: number
    }
  } | null>(null)
  const [counselorPerformance, setCounselorPerformance] = useState<{
    counselor: { id: string; firstName: string; lastName: string }
    subjects: Array<{
      subjectId: string
      subjectName: string
      grade: number
      section: string | null
      markedCount: number
      approvedCount: number
      reportedCount: number
    }>
    recentActivities: Array<{
      type: "marked" | "approved" | "reported"
      date: string | null
      topic: string
      unit: string
      subject: string
      grade: number
      section: string | null
    }>
    summary: {
      totalSubjects: number
      totalMarked: number
      totalApproved: number
      totalReported: number
      totalActivities: number
    }
  } | null>(null)
  const [loadingTeacherPerf, setLoadingTeacherPerf] = useState(false)
  const [loadingCounselorPerf, setLoadingCounselorPerf] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchAcademicYears()
    fetchStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeYearId) {
      fetchSubjects()
      fetchReports()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYearId, selectedGrade, selectedSection, selectedSubjectId, dateRangeStart, dateRangeEnd, statusFilter, disruptionTypeFilter])

  const fetchSubjects = async () => {
    if (!activeYearId) return

    try {
      // ✅ Rehberlik kullanıcısı kontrolü
      const role = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null
      const staffId = typeof window !== "undefined" ? localStorage.getItem("staff_id") : null
      
      let url = `/api/neredeyiz/subjects?academicYearId=${activeYearId}`
      if (selectedGrade) {
        url += `&grade=${selectedGrade}`
      }
      if (selectedSection) {
        url += `&section=${selectedSection}`
      }
      // ✅ Rehberlik kullanıcısı için: Sadece kendisine atanmış sınıfların derslerini göster
      if (role === "counselor" && staffId) {
        url += `&counselorId=${staffId}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
    }
  }

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch("/api/neredeyiz/academic-years")
      if (response.ok) {
        const data = await response.json()
        const active = data.find((year: AcademicYear) => year.isActive)
        if (active) {
          setActiveYearId(active.id)
        } else if (data.length > 0) {
          setActiveYearId(data[0].id)
        }
      }
    } catch (err) {
      console.error("Error fetching academic years:", err)
      error("Akademik yıllar yüklenirken hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/staff")
      if (response.ok) {
        const data = await response.json() as Array<{
          id: string
          firstName: string
          lastName: string
          department: string
        }>
        const teachersList = data.filter((s) => s.department === "OGRETMEN")
        const counselorsList = data.filter((s) =>
          (CLASS_COUNSELOR_DEPARTMENTS as readonly string[]).includes(s.department)
        )
        setTeachers(teachersList)
        setCounselors(counselorsList)
      }
    } catch (err) {
      console.error("Error fetching staff:", err)
    }
  }

  const fetchTeacherPerformance = async (teacherId: string) => {
    if (!teacherId) return
    setLoadingTeacherPerf(true)
    try {
      const url = `/api/neredeyiz/reports/teacher-performance?staffId=${teacherId}${activeYearId ? `&academicYearId=${activeYearId}` : ""}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTeacherPerformance(data)
      }
    } catch (err) {
      console.error("Error fetching teacher performance:", err)
    } finally {
      setLoadingTeacherPerf(false)
    }
  }

  const fetchCounselorPerformance = async (counselorId: string) => {
    if (!counselorId) return
    setLoadingCounselorPerf(true)
    try {
      const url = `/api/neredeyiz/reports/counselor-performance?staffId=${counselorId}${activeYearId ? `&academicYearId=${activeYearId}` : ""}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setCounselorPerformance(data)
      }
    } catch (err) {
      console.error("Error fetching counselor performance:", err)
    } finally {
      setLoadingCounselorPerf(false)
    }
  }

  const fetchReports = async () => {
    if (!activeYearId) return

    setReportsLoading(true)
    try {
      // İlerleme raporu
      let progressUrl = `/api/neredeyiz/reports/progress?academicYearId=${activeYearId}`
      if (selectedGrade) {
        progressUrl += `&grade=${selectedGrade}`
      }
      if (selectedSection) {
        progressUrl += `&section=${selectedSection}`
      }
      if (selectedSubjectId) {
        progressUrl += `&subjectId=${selectedSubjectId}`
      }
      
      const progressResponse = await fetch(progressUrl)
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        
        // Durum filtresini uygula
        let filteredSubjects = progressData.subjects
        if (statusFilter !== "ALL") {
          filteredSubjects = progressData.subjects.filter((subject: {
            completedTopics: number
            inProgressTopics: number
            delayedTopics: number
            plannedTopics: number
          }) => {
            if (statusFilter === "COMPLETED") return subject.completedTopics > 0
            if (statusFilter === "IN_PROGRESS") return subject.inProgressTopics > 0
            if (statusFilter === "DELAYED") return subject.delayedTopics > 0
            if (statusFilter === "PLANNED") return subject.plannedTopics > 0
            return true
          })
        }
        
        setProgressReport({
          ...progressData,
          subjects: filteredSubjects,
        })

        // Dashboard istatistiklerini hesapla
        const total = progressData.summary.totalTopics
        const completed = progressData.summary.completedTopics
        const early = progressData.summary.earlyTopics || 0
        const lateCompleted = progressData.summary.lateCompletedTopics || 0
        const inProgress = filteredSubjects.reduce(
          (sum: number, s: { inProgressTopics: number }) => sum + s.inProgressTopics,
          0
        )
        const delayed = filteredSubjects.reduce(
          (sum: number, s: { delayedTopics: number }) => sum + s.delayedTopics,
          0
        )

        setStats({
          total,
          completed,
          early,
          lateCompleted,
          inProgress,
          delayed,
        })
      }

      // Gecikmeli konular raporu
      let delayedUrl = `/api/neredeyiz/reports/delayed-topics?academicYearId=${activeYearId}`
      if (selectedGrade) {
        delayedUrl += `&grade=${selectedGrade}`
      }
      if (selectedSection) {
        delayedUrl += `&section=${selectedSection}`
      }
      if (selectedSubjectId) {
        delayedUrl += `&subjectId=${selectedSubjectId}`
      }

      const delayedResponse = await fetch(delayedUrl)
      if (delayedResponse.ok) {
        const delayedData = await delayedResponse.json()
        setDelayedTopicsReport(delayedData)
      }

      // Gantt verileri
      let ganttUrl = `/api/neredeyiz/reports/gantt-topics?academicYearId=${activeYearId}`
      if (selectedGrade) {
        ganttUrl += `&grade=${selectedGrade}`
      }
      if (selectedSection) {
        ganttUrl += `&section=${selectedSection}`
      }
      if (selectedSubjectId) {
        ganttUrl += `&subjectId=${selectedSubjectId}`
      }

      const ganttResponse = await fetch(ganttUrl)
      if (ganttResponse.ok) {
        const ganttData = await ganttResponse.json()
        setGanttTopics(ganttData.topics || [])
      }

      // Aksama raporu
      const disruptionUrl = `/api/neredeyiz/reports/disruptions?academicYearId=${activeYearId}`
      
      const disruptionResponse = await fetch(disruptionUrl)
      if (disruptionResponse.ok) {
        const disruptionData = await disruptionResponse.json()
        let disruptionsWithLabels = (disruptionData.disruptions || []).map((d: {
          type: string
          count: number
          totalDays: number
          percentage: number
        }) => ({
          ...d,
          typeLabel:
            d.type === "PLANLI_OKUL"
              ? "Planlı/Okul Kaynaklı"
              : d.type === "PLANDISI_DOGAL"
              ? "Plan Dışı/Doğal"
              : "Öğretmen Kaynaklı",
        }))
        
        if (disruptionTypeFilter !== "ALL") {
          disruptionsWithLabels = disruptionsWithLabels.filter(
            (d: { type: string }) => d.type === disruptionTypeFilter
          )
        }
        
        setDisruptionReport({
          ...disruptionData,
          disruptions: disruptionsWithLabels,
        })
      }
    } catch (err) {
      console.error("Error fetching reports:", err)
      error("Raporlar yüklenirken hata oluştu!")
    } finally {
      setReportsLoading(false)
    }
  }

  // Filtreleri sıfırla
  const resetFilters = () => {
    setSelectedGrade("")
    setSelectedSection("")
    setSelectedSubjectId("")
    setDateRangeStart("")
    setDateRangeEnd("")
    setStatusFilter("ALL")
    setDisruptionTypeFilter("ALL")
  }

  // Aktif filtre sayısı
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedGrade) count++
    if (selectedSection) count++
    if (selectedSubjectId) count++
    if (dateRangeStart || dateRangeEnd) count++
    if (statusFilter !== "ALL") count++
    if (disruptionTypeFilter !== "ALL") count++
    return count
  }, [selectedGrade, selectedSection, selectedSubjectId, dateRangeStart, dateRangeEnd, statusFilter, disruptionTypeFilter])

  // Şubeler listesi
  const sections = useMemo(() => {
    const filtered = subjects.filter((s) => {
      if (selectedGrade && s.grade.toString() !== selectedGrade) return false
      return true
    })
    return Array.from(
      new Set(
        filtered
          .map((s) => s.section)
          .filter((s): s is string => s !== null && s !== "")
          .sort()
      )
    )
  }, [subjects, selectedGrade])

  // Sınıflar listesi (5-12)
  const grades = Array.from({ length: 8 }, (_, i) => i + 5)

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Raporlar ve Analizler
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Detaylı ilerleme ve aksama analizleri
            </p>
          </div>
        </div>
      </div>

      {/* Sınıf Seçimi Kutucukları */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Sınıf Seçimi</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs sm:text-sm"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Filtreler
              {activeFilterCount > 0 && (
                <span className="ml-1 sm:ml-2 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] sm:text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
            {grades.map((grade) => {
              const isSelected = selectedGrade === grade.toString()
              return (
                <button
                  key={grade}
                  onClick={() => {
                    setSelectedGrade(isSelected ? "" : grade.toString())
                    setSelectedSection("")
                  }}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-md"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <div className="text-lg sm:text-xl font-bold">{grade}</div>
                  <div className="text-xs text-gray-500 mt-1">Sınıf</div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gelişmiş Filtreler */}
      {showFilters && (
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                Gelişmiş Filtreler
              </CardTitle>
              <div className="flex gap-2">
                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="text-xs sm:text-sm"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Filtreleri Temizle
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  className="text-xs sm:text-sm"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Şube Filtresi */}
              <div>
                <Label htmlFor="section" className="text-xs sm:text-sm mb-2 block">
                  Şube
                </Label>
                <select
                  id="section"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={selectedGrade === ""}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Tüm Şubeler</option>
                  <option value="null">Şube Yok</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section} Şubesi
                    </option>
                  ))}
                </select>
              </div>

              {/* Ders Filtresi */}
              <div>
                <Label htmlFor="subject" className="text-xs sm:text-sm mb-2 block">
                  Ders
                </Label>
                <select
                  id="subject"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Dersler</option>
                  {subjects
                    .filter((s) => {
                      if (selectedGrade && s.grade.toString() !== selectedGrade) return false
                      if (selectedSection) {
                        if (selectedSection === "null") return s.section === null
                        return s.section === selectedSection
                      }
                      return true
                    })
                    .map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} - {subject.grade}. Sınıf
                        {subject.section && ` - ${subject.section} Şubesi`}
                      </option>
                    ))}
                </select>
              </div>

              {/* Tarih Aralığı Başlangıç */}
              <div>
                <Label htmlFor="dateStart" className="text-xs sm:text-sm mb-2 block">
                  Başlangıç Tarihi
                </Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="h-10 text-xs sm:text-sm"
                />
              </div>

              {/* Tarih Aralığı Bitiş */}
              <div>
                <Label htmlFor="dateEnd" className="text-xs sm:text-sm mb-2 block">
                  Bitiş Tarihi
                </Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="h-10 text-xs sm:text-sm"
                />
              </div>

              {/* Durum Filtresi */}
              <div>
                <Label htmlFor="status" className="text-xs sm:text-sm mb-2 block">
                  Durum (İlerleme)
                </Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="COMPLETED">Tamamlanan</option>
                  <option value="IN_PROGRESS">Devam Ediyor</option>
                  <option value="DELAYED">Gecikmeli</option>
                  <option value="PLANNED">Planlandı</option>
                </select>
              </div>

              {/* Aksama Tipi Filtresi */}
              <div>
                <Label htmlFor="disruptionType" className="text-xs sm:text-sm mb-2 block">
                  Aksama Tipi
                </Label>
                <select
                  id="disruptionType"
                  value={disruptionTypeFilter}
                  onChange={(e) => setDisruptionTypeFilter(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tüm Tipler</option>
                  <option value="PLANLI_OKUL">Planlı/Okul Kaynaklı</option>
                  <option value="PLANDISI_DOGAL">Plan Dışı/Doğal</option>
                  <option value="OGRETMEN_KAYNAKLI">Öğretmen Kaynaklı</option>
                </select>
              </div>
            </div>

            {/* Aktif Filtreler Özeti */}
            {activeFilterCount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="font-medium text-gray-700">Aktif Filtreler:</span>
                  {selectedGrade && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {selectedGrade}. Sınıf
                    </span>
                  )}
                  {selectedSection && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {selectedSection === "null" ? "Şube Yok" : `${selectedSection} Şubesi`}
                    </span>
                  )}
                  {selectedSubjectId && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {subjects.find((s) => s.id === selectedSubjectId)?.name}
                    </span>
                  )}
                  {(dateRangeStart || dateRangeEnd) && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {dateRangeStart || "..."} - {dateRangeEnd || "..."}
                    </span>
                  )}
                  {statusFilter !== "ALL" && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {statusFilter === "COMPLETED" && "Tamamlanan"}
                      {statusFilter === "IN_PROGRESS" && "Devam Ediyor"}
                      {statusFilter === "DELAYED" && "Gecikmeli"}
                      {statusFilter === "PLANNED" && "Planlandı"}
                    </span>
                  )}
                  {disruptionTypeFilter !== "ALL" && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                      {disruptionTypeFilter === "PLANLI_OKUL" && "Planlı/Okul Kaynaklı"}
                      {disruptionTypeFilter === "PLANDISI_DOGAL" && "Plan Dışı/Doğal"}
                      {disruptionTypeFilter === "OGRETMEN_KAYNAKLI" && "Öğretmen Kaynaklı"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Yükleniyor Göstergesi */}
      {reportsLoading && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">Raporlar yükleniyor...</p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard İstatistikleri */}
      {!reportsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 sm:gap-6">
          {/* Toplam Konular */}
          <Card className="relative overflow-hidden border-2 border-blue-200 hover:border-blue-400 transition-all duration-200 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Toplam Konular
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">
                {stats.total}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Tüm konular
              </div>
            </CardContent>
          </Card>

          {/* Tamamlanan */}
          <Link href="/neredeyiz/ilerleme?status=TAMAMLANDI">
            <Card className="relative overflow-hidden border-2 border-green-200 hover:border-green-400 transition-all duration-200 hover:shadow-xl cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Tamamlanan
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
              <div className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">
                {stats.completed}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">
                {stats.total > 0
                  ? `${Math.round((stats.completed / stats.total) * 100)}% normal tamamlandı`
                  : "Henüz konu yok"}
              </div>
            </CardContent>
          </Card>
          </Link>

          {/* Erken Tamamlanan */}
          <Link href="/neredeyiz/ilerleme?status=ERKEN_TAMAMLANDI">
            <Card className="relative overflow-hidden border-2 border-emerald-200 hover:border-emerald-400 transition-all duration-200 hover:shadow-xl cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Erken Tamamlanan
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
              <div className="text-3xl sm:text-4xl font-bold text-emerald-600 mb-2">
                {stats.early || 0}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">
                {stats.total > 0
                  ? `${Math.round(((stats.early || 0) / stats.total) * 100)}% erken`
                  : "Henüz konu yok"}
              </div>
            </CardContent>
          </Card>
          </Link>

          {/* Geç Tamamlanan */}
          <Link href="/neredeyiz/ilerleme?status=GECIKMELI_TAMAMLANDI">
            <Card className="relative overflow-hidden border-2 border-orange-200 hover:border-orange-400 transition-all duration-200 hover:shadow-xl cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Geç Tamamlanan
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
              <div className="text-3xl sm:text-4xl font-bold text-orange-600 mb-2">
                {stats.lateCompleted || 0}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">
                {stats.total > 0
                  ? `${Math.round(((stats.lateCompleted || 0) / stats.total) * 100)}% geç tamamlandı`
                  : "Henüz konu yok"}
              </div>
            </CardContent>
          </Card>
          </Link>

          {/* Devam Ediyor */}
          <Card className="relative overflow-hidden border-2 border-yellow-200 hover:border-yellow-400 transition-all duration-200 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Devam Ediyor
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
              <div className="text-3xl sm:text-4xl font-bold text-yellow-600 mb-2">
                {stats.inProgress}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">
                {stats.total > 0
                  ? `${Math.round((stats.inProgress / stats.total) * 100)}% devam ediyor`
                  : "Henüz konu yok"}
              </div>
            </CardContent>
          </Card>

          {/* Gecikmeli */}
          <Card className="relative overflow-hidden border-2 border-red-200 hover:border-red-400 transition-all duration-200 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Gecikmeli
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
              <div className="text-3xl sm:text-4xl font-bold text-red-600 mb-2">
                {stats.delayed}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">
                {stats.total > 0
                  ? `${Math.round((stats.delayed / stats.total) * 100)}% gecikme var`
                  : "Henüz konu yok"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gecikmeli Konular Detay Listesi */}
      {!reportsLoading && delayedTopicsReport && delayedTopicsReport.delayedTopics.length > 0 && (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              Gecikmeli Konular Detayı
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="font-semibold text-red-800">Toplam Gecikmeli:</span>{" "}
                  <span className="text-red-600">{delayedTopicsReport.summary.totalDelayed}</span>
                </div>
                <div>
                  <span className="font-semibold text-red-800">Toplam Gecikme Günü:</span>{" "}
                  <span className="text-red-600">{delayedTopicsReport.summary.totalDelayDays}</span>
                </div>
                <div>
                  <span className="font-semibold text-red-800">Ortalama Gecikme:</span>{" "}
                  <span className="text-red-600">
                    {delayedTopicsReport.summary.averageDelayDays} gün
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {(() => {
                const totalPages = Math.ceil(delayedTopicsReport.delayedTopics.length / itemsPerPage)
                const startIndex = (currentPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedTopics = delayedTopicsReport.delayedTopics.slice(startIndex, endIndex)

                return (
                  <>
                    {paginatedTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="border-l-4 border-l-red-500 p-3 sm:p-4 bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="h-4 w-4 text-gray-500" />
                              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                                {topic.name}
                              </h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Ders:</span> {topic.subject.name}
                              </div>
                              <div>
                                <span className="font-medium">Sınıf:</span> {topic.subject.grade}. Sınıf
                                {topic.subject.section && ` - ${topic.subject.section} Şubesi`}
                              </div>
                              <div>
                                <span className="font-medium">Ünite:</span> {topic.unit.name}
                              </div>
                            </div>
                            {topic.plannedEndDate && (
                              <div className="mt-2 text-xs text-gray-500">
                                Planlanan Bitiş:{" "}
                                {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR")}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xl sm:text-2xl font-bold text-red-600">
                                {topic.delayDays}
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-500">Gün Gecikme</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
                        <div className="text-xs sm:text-sm text-gray-600">
                          Sayfa {currentPage} / {totalPages} (Toplam {delayedTopicsReport.delayedTopics.length} konu)
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="text-xs sm:text-sm"
                          >
                            Önceki
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number
                              if (totalPages <= 5) {
                                pageNum = i + 1
                              } else if (currentPage <= 3) {
                                pageNum = i + 1
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i
                              } else {
                                pageNum = currentPage - 2 + i
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="text-xs sm:text-sm min-w-[2rem]"
                                >
                                  {pageNum}
                                </Button>
                              )
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="text-xs sm:text-sm"
                          >
                            Sonraki
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Görünüm Seçimi - Tab Sistemi */}
      {!reportsLoading && ganttTopics.length > 0 && (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 pb-0">
            {/* Desktop Tab Navigation */}
            <div className="hidden sm:flex gap-2 border-b border-gray-200 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6">
              <button
                onClick={() => setActiveView("gantt")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeView === "gantt"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Gantt
              </button>
              <button
                onClick={() => setActiveView("timeline")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeView === "timeline"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Timeline
              </button>
              <button
                onClick={() => setActiveView("calendar")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeView === "calendar"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Target className="h-4 w-4 inline mr-2" />
                Takvim
              </button>
              <button
                onClick={() => setActiveView("kanban")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeView === "kanban"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <BookOpen className="h-4 w-4 inline mr-2" />
                Kanban
              </button>
            </div>

            {/* Mobile Dropdown Navigation */}
            <div className="sm:hidden">
              <select
                value={activeView}
                onChange={(e) => setActiveView(e.target.value as typeof activeView)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="gantt">📊 Gantt</option>
                <option value="timeline">⏱️ Timeline</option>
                <option value="calendar">📅 Takvim</option>
                <option value="kanban">📋 Kanban</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 pt-3 sm:pt-4 lg:pt-6">
            {/* Active View Content with Filtering */}
            {(() => {
              // Apply filters to ganttTopics
              const filteredGanttTopics = ganttTopics.filter((topic) => {
                // Sınıf filtresi (ortaokul/lise desteği ile)
                if (selectedGrade) {
                  if (selectedGrade === "5-8") {
                    // Ortaokul: 5,6,7,8
                    if (![5, 6, 7, 8].includes(topic.subject.grade)) return false
                  } else if (selectedGrade === "9-12") {
                    // Lise: 9,10,11,12
                    if (![9, 10, 11, 12].includes(topic.subject.grade)) return false
                  } else {
                    // Tekil sınıf seçimi
                    if (topic.subject.grade !== parseInt(selectedGrade)) return false
                  }
                }
                
                // Şube filtresi
                if (selectedSection && topic.subject.section !== selectedSection) return false
                
                // Ders filtresi
                if (selectedSubjectId) {
                  const matchingSubject = subjects.find(
                    (s) => s.name === topic.subject.name && 
                           s.grade === topic.subject.grade && 
                           s.section === topic.subject.section
                  )
                  if (matchingSubject?.id !== selectedSubjectId) return false
                }
                
                // Durum filtresi
                if (statusFilter !== "ALL") {
                  if (statusFilter === "COMPLETED" && topic.status !== "TAMAMLANDI") return false
                  if (statusFilter === "IN_PROGRESS" && topic.status !== "DEVAM_EDIYOR") return false
                  if (statusFilter === "DELAYED" && topic.status !== "GECIKMELI" && topic.status !== "GECIKMELI_TAMAMLANDI") return false
                  if (statusFilter === "PLANNED" && topic.status !== "PLANLANDI") return false
                }
                
                // Tarih aralığı filtresi
                if (dateRangeStart || dateRangeEnd) {
                  const start = dateRangeStart ? new Date(dateRangeStart) : null
                  const end = dateRangeEnd ? new Date(dateRangeEnd) : null
                  const topicStart = topic.plannedStartDate ? new Date(topic.plannedStartDate) : null
                  const topicEnd = topic.plannedEndDate ? new Date(topic.plannedEndDate) : null
                  
                  if (start && topicEnd && topicEnd < start) return false
                  if (end && topicStart && topicStart > end) return false
                }
                
                return true
              })

              if (filteredGanttTopics.length === 0) {
                return (
                  <div className="py-12 text-center">
                    <p className="text-gray-500 text-sm sm:text-base">
                      Seçili filtrelere uygun konu bulunamadı.
                    </p>
                  </div>
                )
              }

              return (
                <>
                  {activeView === "gantt" && (
                    <GanttChart
                      topics={filteredGanttTopics}
                      onTopicClick={(topic) => {
                        console.log("Topic clicked:", topic)
                      }}
                    />
                  )}
                  {activeView === "timeline" && (
                    <TimelineView
                      topics={filteredGanttTopics}
                      onTopicClick={(topic) => {
                        console.log("Topic clicked:", topic)
                      }}
                    />
                  )}
                  {activeView === "calendar" && (
                    <CalendarView
                      topics={filteredGanttTopics}
                      onTopicClick={(topic) => {
                        console.log("Topic clicked:", topic)
                      }}
                    />
                  )}
                  {activeView === "kanban" && (
                    <KanbanView
                      topics={filteredGanttTopics}
                      onTopicClick={(topic) => {
                        console.log("Topic clicked:", topic)
                      }}
                    />
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Genel İlerleme Durumu Raporu */}
      {!reportsLoading && progressReport && (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                Genel İlerleme Durumu Raporu
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {/* Özet */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {progressReport.summary.totalSubjects}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Toplam Ders</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-gray-600">
                  {progressReport.summary.totalTopics}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Toplam Konu</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {progressReport.summary.completedTopics}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Tamamlanan</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">
                  %{progressReport.summary.averageCompletion}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Ortalama Tamamlanma</div>
              </div>
            </div>

            {/* Ders Bazında Detay */}
            {progressReport.subjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Seçilen filtre kriterlerine uygun ders bulunamadı.
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {progressReport.subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-l-blue-500 p-3 sm:p-4 bg-gray-50 rounded-r-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                            {subject.subjectName}
                          </h3>
                          {(() => {
                            const foundSubject = subjects.find((s) => s.name === subject.subjectName)
                            return foundSubject ? (
                              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
                                {foundSubject.grade}. Sınıf
                                {foundSubject.section && ` - ${foundSubject.section} Şubesi`}
                              </span>
                            ) : null
                          })()}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div>
                            <span className="text-gray-600">Toplam:</span>{" "}
                            <span className="font-medium">{subject.totalTopics}</span>
                          </div>
                          <div>
                            <span className="text-green-600">Tamamlanan:</span>{" "}
                            <span className="font-medium">{subject.completedTopics}</span>
                          </div>
                          <div>
                            <span className="text-yellow-600">Devam Ediyor:</span>{" "}
                            <span className="font-medium">{subject.inProgressTopics}</span>
                          </div>
                          <div>
                            <span className="text-red-600">Gecikmeli:</span>{" "}
                            <span className="font-medium">{subject.delayedTopics}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xl sm:text-2xl font-bold text-blue-600">
                            %{subject.completionPercentage}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            Tamamlanma
                          </div>
                        </div>
                        <div className="w-16 sm:w-20 h-16 sm:w-20 relative">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="50%"
                              cy="50%"
                              r="40%"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-gray-200"
                            />
                            <circle
                              cx="50%"
                              cy="50%"
                              r="40%"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${(subject.completionPercentage / 100) * 251.2} 251.2`}
                              className="text-blue-600 transition-all"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Aksama Sebep Analizi */}
      {!reportsLoading && disruptionReport && disruptionReport.disruptions.length > 0 && (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              Aksama Sebep Analizi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {disruptionReport.disruptions.map((disruption, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                      {disruption.typeLabel}
                    </h3>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {disruption.count} aksama • {disruption.totalDays} gün kayıp
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold text-orange-600">
                        %{disruption.percentage}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        Toplam aksamadan
                      </div>
                    </div>
                    <div className="w-24 sm:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${disruption.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-3 sm:pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                  <span className="font-medium text-gray-700">
                    Toplam: {disruptionReport.summary.totalDisruptions} aksama
                  </span>
                  <span className="text-gray-600">
                    {disruptionReport.summary.totalDays} gün kayıp • Ortalama{" "}
                    {disruptionReport.summary.averageDaysPerDisruption} gün/aksama
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boş Durum */}
      {!activeYearId && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
              Rapor görüntülemek için aktif akademik yıl bulunamadı
            </p>
          </CardContent>
        </Card>
      )}

      {/* Performans Raporları */}
      {activeYearId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Öğretmen Performansı */}
          <Card>
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                👨‍🏫 Öğretmen Performans Raporu
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Öğretmen Seç</Label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => {
                    setSelectedTeacher(e.target.value)
                    fetchTeacherPerformance(e.target.value)
                  }}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">Seçiniz...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {loadingTeacherPerf && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              )}

              {teacherPerformance && !loadingTeacherPerf && (
                <div className="space-y-4">
                  {/* Özet */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-blue-700">
                        {teacherPerformance.summary.totalSubjects}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600">Atanmış Ders</div>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-700">
                        %{teacherPerformance.summary.completionRate}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600">Tamamlanma</div>
                    </div>
                    <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-yellow-700">
                        {teacherPerformance.summary.inProgressTopics}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600">Devam Eden</div>
                    </div>
                    <div className="p-2 sm:p-3 bg-red-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-red-700">
                        {teacherPerformance.summary.delayedTopics}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600">Gecikmeli</div>
                    </div>
                  </div>

                  {/* Dersler */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Atanmış Dersler</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {teacherPerformance.subjects.map((subject) => (
                        <div key={subject.subjectId} className="p-2 sm:p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-xs sm:text-sm">
                              {subject.subjectName} - {subject.grade}. Sınıf
                              {subject.section && ` - ${subject.section}`}
                            </div>
                            <span className="text-xs font-medium text-blue-600">
                              %{subject.completionRate}
                            </span>
                          </div>
                          <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-600">
                            <span>✓ {subject.completedTopics}</span>
                            <span>⏳ {subject.inProgressTopics}</span>
                            <span className="text-red-600">⚠ {subject.delayedTopics}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rehberlik Performansı */}
          <Card>
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                📋 Rehberlik Performans Raporu
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Rehberlik Danışmanı Seç</Label>
                <select
                  value={selectedCounselor}
                  onChange={(e) => {
                    setSelectedCounselor(e.target.value)
                    fetchCounselorPerformance(e.target.value)
                  }}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">Seçiniz...</option>
                  {counselors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {loadingCounselorPerf && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              )}

              {counselorPerformance && !loadingCounselorPerf && (
                <div className="space-y-4">
                  {/* Özet */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-blue-700">
                        {counselorPerformance.summary.totalMarked}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-gray-600">İşaretlenen</div>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-green-700">
                        {counselorPerformance.summary.totalApproved}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-gray-600">Onaylanan</div>
                    </div>
                    <div className="p-2 sm:p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-purple-700">
                        {counselorPerformance.summary.totalReported}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-gray-600">Bildirilen</div>
                    </div>
                  </div>

                  {/* Dersler */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">İşlem Yapılan Dersler</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {counselorPerformance.subjects.map((subject) => (
                        <div key={subject.subjectId} className="p-2 sm:p-3 border rounded-lg bg-gray-50">
                          <div className="font-medium text-xs sm:text-sm mb-1">
                            {subject.subjectName} - {subject.grade}. Sınıf
                            {subject.section && ` - ${subject.section}`}
                          </div>
                          <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-600">
                            <span className="text-blue-600">✎ {subject.markedCount}</span>
                            <span className="text-green-600">✓ {subject.approvedCount}</span>
                            <span className="text-purple-600">📝 {subject.reportedCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Son Aktiviteler */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Son Aktiviteler</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {counselorPerformance.recentActivities.map((activity, idx) => (
                        <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                          <span className={`font-medium ${
                            activity.type === "marked" ? "text-blue-600" :
                            activity.type === "approved" ? "text-green-600" : "text-purple-600"
                          }`}>
                            {activity.type === "marked" ? "✎ İşaretledi" :
                             activity.type === "approved" ? "✓ Onayladı" : "📝 Bildirdi"}
                          </span>
                          {" - "}
                          <span className="text-gray-700">{activity.topic}</span>
                          <div className="text-gray-500 text-[10px] mt-0.5">
                            {activity.subject} - {activity.grade}. Sınıf
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
