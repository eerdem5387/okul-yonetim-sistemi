"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ToastContainer, useToast } from "@/components/ui/toast"
import NotificationBell from "@/components/notifications/notification-bell"
import {
  BookOpen,
  Loader2,
  LogOut,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Bell,
  BarChart3,
  Hourglass,
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

interface DashboardData {
  stats: {
    totalTopics: number
    completedTopics: number
    earlyTopics?: number
    lateCompletedTopics?: number
    inProgressTopics: number
    plannedTopics: number
    delayedTopics: number
    pendingApprovalTopics: number
    completionPercentage: number
  }
  upcomingDeadlines: Array<{
    id: string
    name: string
    plannedEndDate: string
    daysUntil: number
    subject: {
      id: string
      name: string
      grade: number
      section: string | null
    }
    unit: {
      id: string
      name: string
    }
  }>
  recentCompletions: Array<{
    id: string
    name: string
    completedDate: string
    isEarly?: boolean
    isLate?: boolean
    daysDifference?: number
    subject: {
      id: string
      name: string
      grade: number
      section: string | null
    }
    unit: {
      id: string
      name: string
    }
  }>
}

export default function OgretmenPage() {
  const router = useRouter()
  const { toasts, error, removeToast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [delayedData, setDelayedData] = useState<DelayedData | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState<string>("")
  const [staffId, setStaffId] = useState<string | null>(null)
  const [staffSubject, setStaffSubject] = useState<string | null>(null)
interface MyScheduleItem {
  id: string;
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  class: {
    id: string;
    name: string;
    grade: number;
    section: string;
  };
}

  const [mySchedule, setMySchedule] = useState<MyScheduleItem[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")
      const name = localStorage.getItem("staff_name")
      
      fetchMySchedule(id)

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffName(name || "")
      setStaffId(id)
      fetchStaffInfo(id) // Öğretmen bilgilerini çek
      fetchAssignedSubjects(id)
      fetchDelayedTopics(id)
      fetchDashboardData(id)

      // Sayfa focus olduğunda sadece kritik verileri yenile (5 dakika throttle)
      let lastFetch = Date.now()
      const handleFocus = () => {
        const now = Date.now()
        // En az 5 dakika geçmişse yenile
        if (now - lastFetch > 300000) {
          fetchAssignedSubjects(id)
          fetchDelayedTopics(id)
          fetchDashboardData(id)
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

  const fetchMySchedule = async (teacherId: string | null) => {
    if (!teacherId) return
    try {
      setScheduleLoading(true)
      const response = await fetch(`/api/schedules/teacher?teacherId=${teacherId}`)
      if (response.ok) {
        const data = await response.json()
        setMySchedule(data.schedules || [])
      }
    } catch (err) {
      console.error("Error fetching schedule:", err)
    } finally {
      setScheduleLoading(false)
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

  const fetchDashboardData = async (staffId: string) => {
    try {
      const response = await fetch(`/api/neredeyiz/teachers/dashboard?staffId=${staffId}`)
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      } else {
        error("Dashboard verileri yüklenirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      error("Dashboard verileri yüklenirken bir hata oluştu!")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_role")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("staff_id")
    localStorage.removeItem("staff_name")
    localStorage.removeItem("staff_department")
    router.push("/login")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Öğretmen Bilgileri */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-lg">
                <span className="text-white font-bold text-xl">
                  {staffName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold mb-1">{staffName}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full font-medium">
                    Öğretmen
                  </span>
                  {staffSubject && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full font-medium">
                      {staffSubject}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Aksiyonlar */}
            <div className="flex items-center gap-3">
              {staffId && (
                <NotificationBell targetRole="OGRETMEN" targetUserId={staffId} />
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
        {/* Haftalık Ders Programım */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Haftalık Ders Programım
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : mySchedule.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Henüz ders programınız oluşturulmamış</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-xs font-semibold text-gray-700 w-32">
                        Ders
                      </th>
                      {["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"].map((day) => (
                        <th key={day} className="border border-gray-300 p-2 text-xs font-semibold text-gray-700">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 1, label: "1. Ders", startTime: "08:00" },
                      { id: 2, label: "2. Ders", startTime: "09:00" },
                      { id: 3, label: "3. Ders", startTime: "10:00" },
                      { id: 4, label: "4. Ders", startTime: "11:00" },
                      { id: 5, label: "5. Ders", startTime: "12:00" },
                      { id: 6, label: "6. Ders", startTime: "13:00" },
                      { id: 7, label: "7. Ders", startTime: "14:00" },
                      { id: 8, label: "8. Ders", startTime: "15:00" },
                      { id: 9, label: "1. Etüt", startTime: "16:00" },
                      { id: 10, label: "2. Etüt", startTime: "17:00" },
                    ].map((lesson) => (
                      <tr key={lesson.id}>
                        <td className="border border-gray-300 p-2 text-xs font-semibold text-gray-700 bg-gray-50">
                          {lesson.label}
                        </td>
                        {[1, 2, 3, 4, 5].map((dayIndex) => {
                          const schedule = mySchedule.find(
                            (s) => s.dayOfWeek === dayIndex && s.startTime === lesson.startTime
                          );
                          return (
                            <td
                              key={`${dayIndex}-${lesson.id}`}
                              className={`border border-gray-300 p-2 ${
                                schedule ? "bg-gradient-to-br from-blue-50 to-indigo-50" : "bg-white"
                              }`}
                            >
                              {schedule ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-900 truncate">
                                    {schedule.subjectName}
                                  </p>
                                  <p className="text-[10px] text-blue-600 font-medium truncate">
                                    {schedule.class?.name || `${schedule.class?.grade}-${schedule.class?.section}`}
                                  </p>
                                  {schedule.room && (
                                    <p className="text-[10px] text-gray-500">{schedule.room}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-gray-300">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Dashboard İstatistikleri */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3 sm:p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dashboardData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-gray-600">Toplam Konu</p>
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {dashboardData.stats.totalTopics}
                </p>
              </CardContent>
            </Card>

            <Link href="/ogretmen?filter=completed">
              <Card className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm text-gray-600">Tamamlanan</p>
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {dashboardData.stats.completedTopics}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    %{dashboardData.stats.completionPercentage}
                  </p>
                </CardContent>
              </Card>
            </Link>

            {dashboardData.stats.earlyTopics !== undefined && dashboardData.stats.earlyTopics > 0 && (
              <Link href="/ogretmen?filter=early">
                <Card className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm text-gray-600">Erken Tamamlanan</p>
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                      {dashboardData.stats.earlyTopics}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Planın önünde
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

            {dashboardData.stats.lateCompletedTopics !== undefined && dashboardData.stats.lateCompletedTopics > 0 && (
              <Link href="/ogretmen?filter=late">
                <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm text-gray-600">Geç Tamamlanan</p>
                      <Hourglass className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      {dashboardData.stats.lateCompletedTopics}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Gecikmeli tamamlandı
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

            <Link href="/ogretmen?filter=inProgress">
              <Card className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm text-gray-600">Devam Ediyor</p>
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {dashboardData.stats.inProgressTopics}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/ogretmen/gecikmeler">
              <Card className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm text-gray-600">Gecikmeli</p>
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">
                    {dashboardData.stats.delayedTopics}
                  </p>
                </CardContent>
              </Card>
            </Link>

            {dashboardData.stats.pendingApprovalTopics > 0 && (
              <Link href="/ogretmen?filter=pending">
                <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm text-gray-600">Onay Bekliyor</p>
                      <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      {dashboardData.stats.pendingApprovalTopics}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

            <Link href="/ogretmen?filter=planned">
              <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm text-gray-600">Planlandı</p>
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {dashboardData.stats.plannedTopics}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        ) : null}

        {/* Hızlı Erişim Butonları */}
        {dashboardData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {delayedData && delayedData.summary.totalDelayedTopics > 0 && (
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
            )}

            {dashboardData.stats.pendingApprovalTopics > 0 && (
              <Link href={`/ogretmen/dersler/${subjects[0]?.id || ""}`}>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base text-gray-900">
                          Onay Bekleyen
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {dashboardData.stats.pendingApprovalTopics} konu
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {dashboardData.upcomingDeadlines.length > 0 && (
              <Link href="/ogretmen?filter=upcoming">
                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white cursor-pointer hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base text-gray-900">
                          Yaklaşan Tarihler
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {dashboardData.upcomingDeadlines.length} konu
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            <Link href="/ogretmen?filter=all">
              <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white cursor-pointer hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-gray-900">
                        İlerleme
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        %{dashboardData?.stats.completionPercentage || 0}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Yaklaşan Tarihler ve Son Tamamlananlar */}
        {dashboardData && (dashboardData.upcomingDeadlines.length > 0 || dashboardData.recentCompletions.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Yaklaşan Tarihler */}
            {dashboardData.upcomingDeadlines.length > 0 && (
              <Card>
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base sm:text-lg">Yaklaşan Tarihler (7 Gün)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-2 sm:space-y-3">
                    {dashboardData.upcomingDeadlines.slice(0, 5).map((deadline) => (
                      <Link
                        key={deadline.id}
                        href={`/ogretmen/dersler/${deadline.subject.id}`}
                        className="block"
                      >
                        <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                                {deadline.name}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                {deadline.subject.name} - {deadline.unit.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {deadline.subject.grade}. Sınıf
                                {deadline.subject.section && ` - ${deadline.subject.section} Şubesi`}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  deadline.daysUntil <= 2
                                    ? "bg-red-100 text-red-800"
                                    : deadline.daysUntil <= 4
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {deadline.daysUntil === 0
                                  ? "Bugün"
                                  : deadline.daysUntil === 1
                                  ? "Yarın"
                                  : `${deadline.daysUntil} gün`}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(deadline.plannedEndDate).toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {dashboardData.upcomingDeadlines.length > 5 && (
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      +{dashboardData.upcomingDeadlines.length - 5} daha fazla
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Son Tamamlananlar */}
            {dashboardData.recentCompletions.length > 0 && (
              <Card>
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base sm:text-lg">Son Tamamlananlar</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-2 sm:space-y-3">
                    {dashboardData.recentCompletions.map((completion) => (
                      <Link
                        key={completion.id}
                        href={`/ogretmen/dersler/${completion.subject.id}`}
                        className="block"
                      >
                        <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                                  {completion.name}
                                </p>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {completion.subject.name} - {completion.unit.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {completion.subject.grade}. Sınıf
                                {completion.subject.section && ` - ${completion.subject.section} Şubesi`}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-500">
                                {new Date(completion.completedDate).toLocaleDateString("tr-TR")}
                              </p>
                              {completion.isEarly && completion.daysDifference && (
                                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center justify-end gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {completion.daysDifference} gün erken
                                </p>
                              )}
                              {completion.isLate && completion.daysDifference && (
                                <p className="text-xs text-orange-600 font-medium mt-1 flex items-center justify-end gap-1">
                                  <Hourglass className="h-3 w-3" />
                                  {completion.daysDifference} gün geç
                                </p>
                              )}
                              {!completion.isEarly && !completion.isLate && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {Math.floor(
                                    (new Date().getTime() -
                                      new Date(completion.completedDate).getTime()) /
                                      (1000 * 60 * 60 * 24)
                                  )}{" "}
                                  gün önce
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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

        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Atanmış Derslerim</h2>
          <p className="text-gray-600 text-sm sm:text-base">Size atanmış dersleri ve yıllık planlarınızı görüntüleyebilirsiniz.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => {
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
        )}
      </div>
    </div>
  )
}

