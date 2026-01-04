"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ToastContainer, useToast } from "@/components/ui/toast"
import NotificationBell from "@/components/notifications/notification-bell"
import {
  Loader2,
  AlertTriangle,
  ArrowRight,
  Target,
  TrendingUp,
  Clock,
  BookOpen,
  GraduationCap,
  Bell,
} from "lucide-react"
import Link from "next/link"

interface Subject {
  id: string
  name: string
  grade: number
  section: string | null
  academicYear: {
    id: string
    name: string
  }
  units?: Array<{
    id: string
    name: string
    topics?: Array<{
      id: string
      name: string
      plannedEndDate: string | null
      progress?: Array<{
        id: string
        status: string
        actualEndDate: string | null
      }>
    }>
  }>
}

interface DelayedTopic {
  id: string
  name: string
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
}

interface DelayedData {
  delayedTopics: DelayedTopic[]
  groupedBySubject: Array<{
    subject: {
      id: string
      name: string
      grade: number
      section: string | null
    }
    delayedTopics: DelayedTopic[]
    totalDelayDays: number
  }>
  summary: {
    totalDelayedTopics: number
    totalSubjects: number
    averageDelayDays: number
  }
}


export default function OgretmenPage() {
  const router = useRouter()
  const { toasts, error, removeToast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [delayedData, setDelayedData] = useState<DelayedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState<string>("")
  const [staffId, setStaffId] = useState<string | null>(null)
  const [staffSubject, setStaffSubject] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")
      const name = localStorage.getItem("staff_name")

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffName(name || "")
      setStaffId(id)
      fetchStaffInfo(id) // Öğretmen bilgilerini çek
      fetchAssignedSubjects(id)
      fetchDelayedTopics(id)

      // Sayfa focus olduğunda sadece kritik verileri yenile (5 dakika throttle)
      let lastFetch = Date.now()
      const handleFocus = () => {
        const now = Date.now()
        // En az 5 dakika geçmişse yenile
        if (now - lastFetch > 300000) {
          fetchAssignedSubjects(id)
          fetchDelayedTopics(id)
          lastFetch = now
        }
      }

      window.addEventListener("focus", handleFocus)

      return () => {
        window.removeEventListener("focus", handleFocus)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchStaffInfo = async (staffId: string) => {
    try {
      const response = await fetch(`/api/staff/${staffId}`)
      if (response.ok) {
        const data = await response.json()
        setStaffSubject(data.subject || null)
      }
    } catch (err) {
      console.error("Error fetching staff info:", err)
    }
  }


  const fetchAssignedSubjects = async (staffId: string) => {
    try {
      const response = await fetch(`/api/neredeyiz/subjects?staffId=${staffId}`)
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      } else {
        error("Dersler yüklenirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
      error("Dersler yüklenirken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  const fetchDelayedTopics = async (staffId: string) => {
    try {
      const response = await fetch(`/api/neredeyiz/teachers/delayed-topics?staffId=${staffId}`)
      if (response.ok) {
        const data = await response.json()
        setDelayedData(data)
      }
    } catch (err) {
      console.error("Error fetching delayed topics:", err)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Hoş Geldiniz, {staffName}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  {staffSubject && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white">
                      {staffSubject}
                    </span>
                  )}
                </div>
              </div>
              {staffId && (
                <div className="flex items-center gap-3">
                  <NotificationBell targetRole="OGRETMEN" targetUserId={staffId} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Hızlı Erişim Butonları */}
            {delayedData && delayedData.summary.totalDelayedTopics > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <Link href="/ogretmen/gecikmeler">
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base text-gray-900">
                          Gecikmeler
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {delayedData.summary.totalDelayedTopics} konu
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

            <Link href="/ogretmen/neredeyiz">
                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white cursor-pointer hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-gray-900">
                        İlerleme Takibi
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Neredeyiz?
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Gecikme Yaşanan Dersler - Öne Çıkan Kart */}
        {delayedData && delayedData.summary.totalDelayedTopics > 0 && (
          <Card className="mb-6 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-red-900">
                      Gecikme Yaşanan Dersler
                    </CardTitle>
                    <p className="text-sm text-red-700 mt-1">
                      {delayedData.summary.totalDelayedTopics} konu gecikme yaşıyor
                    </p>
                  </div>
                </div>
                <Link href="/ogretmen/gecikmeler">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    Detayları Gör
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-xs sm:text-sm font-medium text-gray-700">Gecikmeli Konu</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600">
                    {delayedData.summary.totalDelayedTopics}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <p className="text-xs sm:text-sm font-medium text-gray-700">Etkilenen Ders</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                    {delayedData.summary.totalSubjects}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <p className="text-xs sm:text-sm font-medium text-gray-700">Ortalama Gecikme</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                    {delayedData.summary.averageDelayDays} gün
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Yıllık Plan - Sınıf Bazında */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Yıllık Planım</h2>
              <p className="text-gray-600 text-sm sm:text-base">Sınıf bazında derslerinizi ve ilerleme durumunuzu görüntüleyin</p>
            </div>
          </div>

          {subjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">Size henüz ders atanmamış</p>
                <p className="text-gray-400 text-sm">Yönetici tarafından ders ataması yapıldığında burada görünecektir.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Sınıflara göre grupla */}
              {Array.from(new Set(subjects.map(s => `${s.grade}${s.section || ''}`))).sort().map((classKey) => {
                const classSubjects = subjects.filter(s => `${s.grade}${s.section || ''}` === classKey)
                const firstSubject = classSubjects[0]
                const className = `${firstSubject.grade}. Sınıf${firstSubject.section ? ` ${firstSubject.section} Şubesi` : ''}`
                
                // Bu sınıf için toplam istatistikler
                const allTopics = classSubjects.flatMap(s => (s.units || []).flatMap(u => u.topics || []))
                const totalTopics = allTopics.length
                const completedTopics = allTopics.filter(t => t.progress?.[0]?.status === "TAMAMLANDI").length
                const inProgressTopics = allTopics.filter(t => t.progress?.[0]?.status === "DEVAM_EDIYOR").length
                const pendingApprovalTopics = allTopics.filter(t => t.progress?.[0]?.status === "PENDING_APPROVAL").length
                const classDelayedCount = delayedData?.groupedBySubject
                  .filter(g => classSubjects.some(s => s.id === g.subject.id))
                  .reduce((sum, g) => sum + g.delayedTopics.length, 0) || 0
                const overallCompletionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

                return (
                  <Card key={classKey} className="border-2 border-blue-100 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                            {className}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {classSubjects.length} ders • {totalTopics} konu
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                            %{overallCompletionRate}
                          </div>
                          <p className="text-xs text-gray-600">Genel İlerleme</p>
                        </div>
                      </div>
                      {/* Sınıf Genel İlerleme Çubuğu */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              overallCompletionRate === 100
                                ? "bg-green-600"
                                : overallCompletionRate >= 75
                                ? "bg-blue-600"
                                : overallCompletionRate >= 50
                                ? "bg-yellow-600"
                                : "bg-orange-600"
                            }`}
                            style={{ width: `${overallCompletionRate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                          <span>{completedTopics}/{totalTopics} tamamlandı</span>
                          <div className="flex gap-3">
                            {inProgressTopics > 0 && (
                              <span className="text-yellow-600">• {inProgressTopics} devam ediyor</span>
                            )}
                            {pendingApprovalTopics > 0 && (
                              <span className="text-orange-600">• {pendingApprovalTopics} onay bekliyor</span>
                            )}
                            {classDelayedCount > 0 && (
                              <span className="text-red-600">• {classDelayedCount} gecikme</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classSubjects.map((subject) => {
              // Bu ders için gecikme sayısını bul
              const subjectDelayedCount =
                delayedData?.groupedBySubject.find((g) => g.subject.id === subject.id)
                  ?.delayedTopics.length || 0

              // Ders istatistiklerini hesapla
              const allTopics = (subject.units || []).flatMap((u) => u.topics || [])
              const totalTopics = allTopics.length
              const completedTopics = allTopics.filter((t) => t.progress?.[0]?.status === "TAMAMLANDI").length
              const pendingApprovalTopics = allTopics.filter((t) => t.progress?.[0]?.status === "PENDING_APPROVAL").length
              const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

              return (
                <Link key={subject.id} href={`/ogretmen/dersler/${subject.id}`}>
                  <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg h-full relative border-2 hover:border-blue-400">
                    {subjectDelayedCount > 0 && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 shadow-sm">
                          <AlertTriangle className="h-3 w-3" />
                          {subjectDelayedCount} gecikme
                        </span>
                      </div>
                    )}
                    {subjectDelayedCount > 0 && pendingApprovalTopics > 0 && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300 shadow-sm">
                          <Bell className="h-3 w-3" />
                          {pendingApprovalTopics} onay
                        </span>
                      </div>
                    )}
                    {subjectDelayedCount === 0 && pendingApprovalTopics > 0 && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300 shadow-sm">
                          <Bell className="h-3 w-3" />
                          {pendingApprovalTopics} onay bekliyor
                        </span>
                      </div>
                    )}
                    <CardHeader className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            subjectDelayedCount > 0
                              ? "bg-gradient-to-br from-red-600 to-orange-600"
                              : pendingApprovalTopics > 0
                              ? "bg-gradient-to-br from-orange-600 to-yellow-600"
                              : "bg-gradient-to-br from-blue-600 to-indigo-600"
                          }`}
                        >
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-bold text-gray-900 truncate">
                            {subject.name}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {subject.grade}. Sınıf
                            {subject.section && ` - ${subject.section} Şubesi`}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-xs text-gray-500 mb-3">{subject.academicYear.name}</p>
                      
                      {/* İlerleme Çubuğu */}
                      {totalTopics > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">İlerleme</span>
                            <span className="font-semibold text-gray-900">%{completionRate}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                completionRate === 100
                                  ? "bg-green-600"
                                  : completionRate >= 75
                                  ? "bg-blue-600"
                                  : completionRate >= 50
                                  ? "bg-yellow-600"
                                  : "bg-orange-600"
                              }`}
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                            <span>{completedTopics}/{totalTopics} tamamlandı</span>
                            {pendingApprovalTopics > 0 && (
                              <span className="text-orange-600 font-medium">
                                {pendingApprovalTopics} onay bekliyor
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {subjectDelayedCount > 0 && (
                        <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {subjectDelayedCount} konu gecikme yaşıyor
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

