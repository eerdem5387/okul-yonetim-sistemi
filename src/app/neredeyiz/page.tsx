"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ToastContainer, useToast } from "@/components/ui/toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  Settings,
  Loader2,
  BarChart3,
} from "lucide-react"
import Link from "next/link"

interface AcademicYear {
  id: string
  name: string
  startDate: string
  endDate: string
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

export default function NeredeyizPage() {
  const { toasts, error, removeToast } = useToast()
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null)
  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null)
  const [disruptionReport, setDisruptionReport] = useState<DisruptionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)

  useEffect(() => {
    fetchAcademicYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeYear) {
      fetchReports()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear])

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch("/api/neredeyiz/academic-years")
      if (response.ok) {
        const data = await response.json()
        setAcademicYears(data)
        const active = data.find((year: AcademicYear) => year.isActive)
        if (active) {
          setActiveYear(active)
        } else if (data.length > 0) {
          setActiveYear(data[0])
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
    if (!activeYear) return

    setReportsLoading(true)
    try {
      // İlerleme raporu
      const progressResponse = await fetch(
        `/api/neredeyiz/reports/progress?academicYearId=${activeYear.id}`
      )
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setProgressReport(progressData)
      }

      // Aksama raporu
      const disruptionResponse = await fetch(
        `/api/neredeyiz/reports/disruptions?academicYearId=${activeYear.id}`
      )
      if (disruptionResponse.ok) {
        const disruptionData = await disruptionResponse.json()
        setDisruptionReport(disruptionData)
      }
    } catch (err) {
      console.error("Error fetching reports:", err)
      error("Raporlar yüklenirken hata oluştu!")
    } finally {
      setReportsLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!progressReport) return null

    const { summary } = progressReport
    const totalPlanned = summary.totalTopics
    const completed = summary.completedTopics
    const inProgress = progressReport.subjects.reduce(
      (sum, s) => sum + s.inProgressTopics,
      0
    )
    const delayed = progressReport.subjects.reduce(
      (sum, s) => sum + s.delayedTopics,
      0
    )

    return {
      totalPlanned,
      completed,
      inProgress,
      delayed,
      completionRate: summary.averageCompletion,
    }
  }, [progressReport])

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Neredeyiz?
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
            Yıllık Plan Takip ve İlerleme Yönetim Sistemi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/neredeyiz/yonetim">
            <Button size="sm" variant="outline" className="text-xs sm:text-sm">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Yönetim
            </Button>
          </Link>
          <Link href="/neredeyiz/ilerleme">
            <Button size="sm" variant="outline" className="text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              İlerleme Takibi
            </Button>
          </Link>
          <Link href="/neredeyiz/aksamalar">
            <Button size="sm" variant="outline" className="text-xs sm:text-sm">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Aksamalar
            </Button>
          </Link>
          <Link href="/neredeyiz/raporlar">
            <Button size="sm" variant="outline" className="text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Raporlar
            </Button>
          </Link>
        </div>
      </div>

      {/* Akademik Yıl Seçimi */}
      {academicYears.length > 0 && (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Akademik Yıl Seçimi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="flex flex-wrap gap-2">
              {academicYears.map((year) => (
                <Button
                  key={year.id}
                  variant={activeYear?.id === year.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveYear(year)}
                  className="text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                >
                  {year.name}
                  {year.isActive && (
                    <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-medium">
                      Aktif
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Genel İstatistikler */}
      {reportsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Tamamlanma Oranı
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                %{stats.completionRate}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Tamamlanan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {stats.completed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Devam Ediyor
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                {stats.inProgress}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Gecikmeli
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {stats.delayed}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Ders Bazında İlerleme */}
      {reportsLoading ? (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : progressReport && progressReport.subjects.length > 0 ? (
        <>
      {/* Ders Bazında İlerleme */}
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Ders Bazında İlerleme Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {progressReport.subjects.map((subject, index) => (
                <div
                  key={index}
                  className="border-l-4 border-l-blue-500 pl-3 sm:pl-4 py-2 bg-gray-50 rounded-r-lg transition-all duration-200 hover:shadow-md hover:bg-gray-100"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                        {subject.subjectName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-gray-600">
                        <span>Toplam: {subject.totalTopics}</span>
                        <span className="text-green-600">
                          ✓ {subject.completedTopics}
                        </span>
                        <span className="text-yellow-600">
                          ⏳ {subject.inProgressTopics}
                        </span>
                        {subject.delayedTopics > 0 && (
                          <span className="text-red-600">
                            ⚠ {subject.delayedTopics} gecikmeli
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold text-blue-600">
                          %{subject.completionPercentage}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500">
                          Tamamlanma
                        </div>
                      </div>
                      <div className="w-16 sm:w-24 h-16 sm:h-24 relative">
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
        </>
      ) : null}

      {/* Aksama Analizi */}
      {reportsLoading ? (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : disruptionReport && disruptionReport.disruptions.length > 0 ? (
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
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                      {disruption.typeLabel}
                    </h3>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                      {disruption.count} aksama • {disruption.totalDays} gün
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-bold text-orange-600">
                        %{disruption.percentage}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        Toplam aksamadan
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 sm:pt-3 border-t border-gray-200">
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
      ) : null}

      {/* Boş Durum */}
      {!activeYear && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
              Henüz akademik yıl tanımlanmamış
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              Yönetim sayfasından yeni akademik yıl ekleyebilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

