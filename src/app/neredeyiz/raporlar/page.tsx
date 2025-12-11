"use client"

import { useState, useEffect, useMemo } from "react"
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
} from "lucide-react"

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
    inProgressTopics: number
    plannedTopics: number
    delayedTopics: number
    completionPercentage: number
  }>
  summary: {
    totalSubjects: number
    totalTopics: number
    completedTopics: number
    averageCompletion: number
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
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null)
  const [disruptionReport, setDisruptionReport] = useState<DisruptionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  
  // Filtreleme state'leri
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [dateRangeStart, setDateRangeStart] = useState<string>("")
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL") // ALL, COMPLETED, IN_PROGRESS, DELAYED, PLANNED
  const [disruptionTypeFilter, setDisruptionTypeFilter] = useState<string>("ALL") // ALL, PLANLI_OKUL, PLANDISI_DOGAL, OGRETMEN_KAYNAKLI
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchAcademicYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedYearId) {
      fetchSubjects()
      fetchReports()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId, selectedGrade, selectedSection, selectedSubjectId, dateRangeStart, dateRangeEnd, statusFilter, disruptionTypeFilter])

  const fetchSubjects = async () => {
    if (!selectedYearId) return

    try {
      let url = `/api/neredeyiz/subjects?academicYearId=${selectedYearId}`
      if (selectedGrade) {
        url += `&grade=${selectedGrade}`
      }
      if (selectedSection) {
        url += `&section=${selectedSection}`
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
        setAcademicYears(data)
        const active = data.find((year: AcademicYear) => year.isActive)
        if (active) {
          setSelectedYearId(active.id)
        } else if (data.length > 0) {
          setSelectedYearId(data[0].id)
        }
      }
    } catch (err) {
      console.error("Error fetching academic years:", err)
      error("Akademik yıllar yüklenirken hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    if (!selectedYearId) return

    setReportsLoading(true)
    try {
      // İlerleme raporu
      let progressUrl = `/api/neredeyiz/reports/progress?academicYearId=${selectedYearId}`
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
        
        // Tarih aralığı filtresini uygula (eğer API'de desteklenirse, şimdilik frontend'de filtreleme yapmıyoruz)
        
        setProgressReport({
          ...progressData,
          subjects: filteredSubjects,
        })
      }

      // Aksama raporu
      const disruptionUrl = `/api/neredeyiz/reports/disruptions?academicYearId=${selectedYearId}`
      
      const disruptionResponse = await fetch(disruptionUrl)
      if (disruptionResponse.ok) {
        const disruptionData = await disruptionResponse.json()
        // Aksama tipi etiketlerini ekle
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
        
        // Aksama tipi filtresini uygula
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

  // Şubeler listesi (filtrelenmiş derslerden)
  const sections = useMemo(() => {
    const filtered = subjects.filter((s) => {
      if (selectedGrade && s.grade.toString() !== selectedGrade) return false
      return true
    })
    return Array.from(
      new Set(
        filtered
          .map((s) => s.section)
          .filter((s): s is string => s !== null)
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

      {/* Akademik Yıl Seçimi ve Filtreler */}
      <div className="space-y-4">
        {academicYears.length > 0 && (
          <Card>
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Akademik Yıl Seç</CardTitle>
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
              <select
                value={selectedYearId}
                onChange={(e) => {
                  setSelectedYearId(e.target.value)
                  resetFilters()
                }}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              >
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.isActive && "(Aktif)"}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

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
                {/* Sınıf Filtresi */}
                <div>
                  <Label htmlFor="grade" className="text-xs sm:text-sm mb-2 block">
                    Sınıf
                  </Label>
                  <select
                    id="grade"
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value)
                      setSelectedSection("") // Sınıf değiştiğinde şube filtresini sıfırla
                    }}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tüm Sınıflar</option>
                    {grades.map((grade) => (
                      <option key={grade} value={grade.toString()}>
                        {grade}. Sınıf
                      </option>
                    ))}
                  </select>
                </div>

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

                {/* Durum Filtresi (İlerleme Raporu) */}
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
      </div>

      {/* Yükleniyor Göstergesi */}
      {reportsLoading && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">Raporlar yükleniyor...</p>
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
      {!selectedYearId && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
              Rapor görüntülemek için akademik yıl seçin
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

