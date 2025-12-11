"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToastContainer, useToast } from "@/components/ui/toast"
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react"

interface AcademicYear {
  id: string
  name: string
  isActive: boolean
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
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null)
  const [disruptionReport, setDisruptionReport] = useState<DisruptionReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAcademicYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedYearId) {
      fetchReports()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId])

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

    try {
      // İlerleme raporu
      const progressResponse = await fetch(
        `/api/neredeyiz/reports/progress?academicYearId=${selectedYearId}`
      )
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setProgressReport(progressData)
      }

      // Aksama raporu
      const disruptionResponse = await fetch(
        `/api/neredeyiz/reports/disruptions?academicYearId=${selectedYearId}`
      )
      if (disruptionResponse.ok) {
        const disruptionData = await disruptionResponse.json()
        // Aksama tipi etiketlerini ekle
        const disruptionsWithLabels = disruptionData.disruptions.map((d: {
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
        setDisruptionReport({
          ...disruptionData,
          disruptions: disruptionsWithLabels,
        })
      }
    } catch (err) {
      console.error("Error fetching reports:", err)
      error("Raporlar yüklenirken hata oluştu!")
    }
  }

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

      {/* Akademik Yıl Seçimi */}
      {academicYears.length > 0 && (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg">Akademik Yıl Seç</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
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

      {/* Genel İlerleme Durumu Raporu */}
      {progressReport && (
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
            <div className="space-y-3 sm:space-y-4">
              {progressReport.subjects.map((subject, index) => (
                <div
                  key={index}
                  className="border-l-4 border-l-blue-500 p-3 sm:p-4 bg-gray-50 rounded-r-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-2">
                        {subject.subjectName}
                      </h3>
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
          </CardContent>
        </Card>
      )}

      {/* Aksama Sebep Analizi */}
      {disruptionReport && disruptionReport.disruptions.length > 0 && (
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

