"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ToastContainer, useToast } from "@/components/ui/toast"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  Target,
  Plus,
  BookOpen,
  UserPlus,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react"

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 relative min-h-full bg-gradient-to-br from-gray-50 to-blue-50/30">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Yıllık Plan Takip ve İlerleme Yönetim Sistemi
            </p>
          </div>
        </div>
      </div>

      {/* Kısayol Butonları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Link href="/neredeyiz/yonetim">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-blue-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                    Ders Oluştur
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Yeni ders ekle
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/neredeyiz/yonetim">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-purple-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                    Öğretmen Ata
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Derse öğretmen atama
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/neredeyiz/aksamalar">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-orange-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                    Aksama Oluştur
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Plan dışı gelişme kaydet
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/neredeyiz/ilerleme">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-green-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                    İlerleme Takibi
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Konu durumlarını güncelle
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/neredeyiz/raporlar">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-indigo-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                    Raporlar
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Detaylı analiz görüntüle
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/neredeyiz/yonetim">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-gray-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                    Yönetim Paneli
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Tüm yönetim işlemleri
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Tamamlanma Oranı */}
          <Card className="relative overflow-hidden border-2 border-blue-200 hover:border-blue-400 transition-all duration-200 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Tamamlanma Oranı
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">
                %{stats.completionRate}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600">
                <span>{stats.completed} tamamlandı</span>
                <span>{stats.totalPlanned} toplam</span>
              </div>
            </CardContent>
          </Card>

          {/* Tamamlanan */}
          <Card className="relative overflow-hidden border-2 border-green-200 hover:border-green-400 transition-all duration-200 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Tamamlanan Konular
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
                {stats.totalPlanned > 0
                  ? `${Math.round((stats.completed / stats.totalPlanned) * 100)}% tamamlandı`
                  : "Henüz konu yok"}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Başarıyla tamamlandı</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Devam Ediyor */}
          <Card className="relative overflow-hidden border-2 border-yellow-200 hover:border-yellow-400 transition-all duration-200 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Devam Eden Konular
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
                {stats.totalPlanned > 0
                  ? `${Math.round((stats.inProgress / stats.totalPlanned) * 100)}% devam ediyor`
                  : "Henüz konu yok"}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span>İşlem devam ediyor</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gecikmeli */}
          <Card className="relative overflow-hidden border-2 border-red-200 hover:border-red-400 transition-all duration-200 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                  Gecikmeli Konular
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
                {stats.totalPlanned > 0
                  ? `${Math.round((stats.delayed / stats.totalPlanned) * 100)}% gecikme var`
                  : "Henüz konu yok"}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Dikkat gerekiyor</span>
                </div>
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
              {progressReport.subjects.map((subject, index) => {
                const plannedCount = subject.plannedTopics || 0
                const completionRate = subject.totalTopics > 0 
                  ? Math.round((subject.completedTopics / subject.totalTopics) * 100) 
                  : 0

                return (
                  <div
                    key={index}
                    className="border-l-4 border-l-blue-500 pl-4 sm:pl-6 py-4 bg-gradient-to-r from-gray-50 to-white rounded-r-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">
                            {subject.subjectName}
                          </h3>
                        </div>
                        
                        {/* Detaylı İstatistikler */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Toplam</div>
                            <div className="text-lg sm:text-xl font-bold text-gray-900">
                              {subject.totalTopics}
                            </div>
                            <div className="text-[10px] text-gray-400">konu</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-200">
                            <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Tamamlandı
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-green-600">
                              {subject.completedTopics}
                            </div>
                            <div className="text-[10px] text-green-600">
                              {subject.totalTopics > 0 
                                ? `${Math.round((subject.completedTopics / subject.totalTopics) * 100)}%`
                                : "0%"}
                            </div>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-2 sm:p-3 border border-yellow-200">
                            <div className="flex items-center gap-1 text-xs text-yellow-700 mb-1">
                              <Clock className="h-3 w-3" />
                              Devam Ediyor
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-yellow-600">
                              {subject.inProgressTopics}
                            </div>
                            <div className="text-[10px] text-yellow-600">
                              {subject.totalTopics > 0 
                                ? `${Math.round((subject.inProgressTopics / subject.totalTopics) * 100)}%`
                                : "0%"}
                            </div>
                          </div>
                          {subject.delayedTopics > 0 ? (
                            <div className="bg-red-50 rounded-lg p-2 sm:p-3 border border-red-200">
                              <div className="flex items-center gap-1 text-xs text-red-700 mb-1">
                                <AlertTriangle className="h-3 w-3" />
                                Gecikmeli
                              </div>
                              <div className="text-lg sm:text-xl font-bold text-red-600">
                                {subject.delayedTopics}
                              </div>
                              <div className="text-[10px] text-red-600">
                                {subject.totalTopics > 0 
                                  ? `${Math.round((subject.delayedTopics / subject.totalTopics) * 100)}%`
                                  : "0%"}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Planlandı</div>
                              <div className="text-lg sm:text-xl font-bold text-gray-600">
                                {plannedCount}
                              </div>
                              <div className="text-[10px] text-gray-500">bekliyor</div>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs sm:text-sm font-medium text-gray-700">
                              Genel İlerleme
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-blue-600">
                              %{completionRate}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                              style={{ width: `${completionRate}%` }}
                            >
                              {completionRate > 10 && (
                                <span className="text-[8px] text-white font-medium">
                                  %{completionRate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Circular Progress */}
                      <div className="flex-shrink-0 flex justify-center lg:justify-end">
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="50%"
                              cy="50%"
                              r="42%"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-gray-200"
                            />
                            <circle
                              cx="50%"
                              cy="50%"
                              r="42%"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              strokeDasharray={`${(completionRate / 100) * 264} 264`}
                              className={`transition-all duration-500 ${
                                completionRate === 100
                                  ? "text-green-500"
                                  : completionRate >= 75
                                  ? "text-blue-500"
                                  : completionRate >= 50
                                  ? "text-yellow-500"
                                  : "text-orange-500"
                              }`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className={`text-xl sm:text-2xl font-bold ${
                              completionRate === 100
                                ? "text-green-600"
                                : completionRate >= 75
                                ? "text-blue-600"
                                : completionRate >= 50
                                ? "text-yellow-600"
                                : "text-orange-600"
                            }`}>
                              %{completionRate}
                            </div>
                            <div className="text-[8px] sm:text-[10px] text-gray-500">
                              Tamamlanma
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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

