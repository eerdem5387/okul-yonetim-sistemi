"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  User,
  BookOpen,
  Calendar,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Loader2,
  BarChart3,
  Award,
  MapPin,
  FileText,
  ChevronRight,
} from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
  phone?: string
  email?: string
}

interface DashboardData {
  student: Student
  statistics: {
    homeworkCompletionRate: number
    totalHomeworks: number
    completedHomeworks: number
    pendingHomeworks: number
    attendanceRate: number
    totalAttendances: number
    presentCount: number
    absentCount: number
    lateCount: number
    excusedCount: number
    averageScore: number
    totalExams: number
    totalComments: number
    positiveComments: number
    negativeComments: number
    totalActivities: number
    verifiedActivities: number
  }
  recentData: {
    homeworks: Array<{
      id: string
      isCompleted: boolean
      completedAt: string | null
      homework: {
        id: string
        title: string
        description: string
        dueDate: string
        subject: string | null
        teacher: {
          firstName: string
          lastName: string
        }
      }
    }>
    attendances: Array<{
      id: string
      status: string
      date: string
      lessonName: string
      teacher: {
        firstName: string
        lastName: string
      }
    }>
    examResults: Array<{
      id: string
      totalScore: number | null
      ranking: number | null
      exam: {
        name: string
        examType: string
        examDate: string
      }
    }>
    comments: Array<{
      id: string
      commentType: string
      content: string
      isPositive: boolean
      createdAt: string
      staff: {
        firstName: string
        lastName: string
        department: string
      }
    }>
    activities: Array<{
      id: string
      type: string
      title: string
      description: string | null
      activityDate: string
      location: string | null
      organizer: string | null
      isVerified: boolean
      verifiedAt: string | null
    }>
  }
}

export default function VeliPanelPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState("")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const savedStudentId = localStorage.getItem("student_id")

      if (role !== "parent" || !savedStudentId) {
        router.push("/veli-login")
        return
      }

      setStudentId(savedStudentId)
      fetchDashboard(savedStudentId)
    }
  }, [router])

  const fetchDashboard = async (studentId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/students/${studentId}/dashboard`)
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      } else {
        console.error("Failed to fetch dashboard:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Öğrenci bilgisi bulunamadı
            </h3>
            <p className="text-gray-600">
              Lütfen okul idaresi ile iletişime geçiniz
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">
                {dashboardData.student.firstName[0]}{dashboardData.student.lastName[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
                <User className="h-7 w-7 sm:h-8 sm:w-8" />
                {dashboardData.student.firstName} {dashboardData.student.lastName}
              </h1>
              <p className="text-green-100 text-sm sm:text-base">
                {dashboardData.student.grade} • Öğrenci Dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* İstatistikler */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Ödev Tamamlama */}
          <Link href="/veli/odevler">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Ödevler</p>
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  %{dashboardData.statistics.homeworkCompletionRate}
                </div>
                <div className="mt-2 text-xs sm:text-sm text-gray-600">
                  {dashboardData.statistics.completedHomeworks} / {dashboardData.statistics.totalHomeworks} tamamlandı
                </div>
                <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{
                      width: `${dashboardData.statistics.homeworkCompletionRate}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Devam Durumu */}
          <Link href="/veli/yoklama">
            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Devamsızlık</p>
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  %{dashboardData.statistics.attendanceRate}
                </div>
                <div className="mt-2 text-xs sm:text-sm text-gray-600">
                  {dashboardData.statistics.presentCount} / {dashboardData.statistics.totalAttendances} devam
                </div>
                <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${dashboardData.statistics.attendanceRate}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Sınav Ortalaması */}
          <Link href="/veli/sinavlar">
            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Ortalama</p>
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dashboardData.statistics.averageScore}
                </div>
                <div className="mt-2 text-xs sm:text-sm text-gray-600">
                  {dashboardData.statistics.totalExams} sınav
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Görüş İstatistikleri */}
          <Link href="/veli/gorusler">
            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Görüşler</p>
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dashboardData.statistics.totalComments}
                </div>
                <div className="mt-2 text-xs sm:text-sm text-gray-600">
                  {dashboardData.statistics.positiveComments} olumlu, {dashboardData.statistics.negativeComments} gelişmeli
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* IB Faaliyet İstatistikleri */}
          <Card 
            className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all cursor-pointer hover:scale-105"
            onClick={() => {
              document.getElementById("ib-faaliyetleri")?.scrollIntoView({ behavior: "smooth" })
            }}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">IB Faaliyetleri</p>
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {dashboardData.statistics.totalActivities}
              </div>
              <div className="mt-2 text-xs sm:text-sm text-gray-600">
                {dashboardData.statistics.verifiedActivities} doğrulanmış
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Son Ödevler */}
        <Card className="border-0 shadow-lg">
          <Link href="/veli/odevler">
            <CardHeader className="hover:bg-blue-50/50 transition-colors cursor-pointer rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Son Ödevler
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardTitle>
            </CardHeader>
          </Link>
          <CardContent>
            {dashboardData.recentData.homeworks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz ödev kaydı bulunmuyor</p>
            ) : (
              <div className="space-y-2">
                {dashboardData.recentData.homeworks.map((hw) => {
                  const isOverdue = new Date(hw.homework.dueDate) < new Date() && !hw.isCompleted
                  return (
                    <div
                      key={hw.id}
                      className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all ${
                        isOverdue 
                          ? "border-red-200 bg-red-50/50 hover:bg-red-50" 
                          : hw.isCompleted
                          ? "border-green-200 bg-green-50/50 hover:bg-green-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {hw.isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : isOverdue ? (
                          <Clock className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{hw.homework.title}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            {hw.homework.subject && (
                              <span className="flex items-center gap-1">
                                📚 {hw.homework.subject}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              👤 {hw.homework.teacher.firstName} {hw.homework.teacher.lastName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Teslim: {new Date(hw.homework.dueDate).toLocaleDateString("tr-TR")}
                          </p>
                          {hw.isCompleted && hw.completedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Tamamlandı: {new Date(hw.completedAt).toLocaleDateString("tr-TR")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Son Yoklamalar */}
        <Card className="border-0 shadow-lg">
          <Link href="/veli/yoklama">
            <CardHeader className="hover:bg-green-50/50 transition-colors cursor-pointer rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Son Yoklamalar
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardTitle>
            </CardHeader>
          </Link>
          <CardContent>
            {dashboardData.recentData.attendances.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz yoklama kaydı bulunmuyor</p>
            ) : (
              <div className="space-y-2">
                {dashboardData.recentData.attendances.map((att) => (
                  <div
                    key={att.id}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg ${
                      att.status === "PRESENT"
                        ? "border-green-200 bg-green-50/50"
                        : att.status === "ABSENT"
                        ? "border-red-200 bg-red-50/50"
                        : "border-gray-200 bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {att.status === "PRESENT" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{att.lessonName}</p>
                        <p className="text-sm text-gray-600">
                          {att.teacher.firstName} {att.teacher.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {att.status === "PRESENT" ? "Katıldı" : att.status === "ABSENT" ? "Katılmadı" : att.status}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(att.date).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Son Sınavlar */}
        <Card className="border-0 shadow-lg">
          <Link href="/veli/sinavlar">
            <CardHeader className="hover:bg-purple-50/50 transition-colors cursor-pointer rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Son Sınavlar
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardTitle>
            </CardHeader>
          </Link>
          <CardContent>
            {dashboardData.recentData.examResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz sınav kaydı bulunmuyor</p>
            ) : (
              <div className="space-y-2">
                {dashboardData.recentData.examResults.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{exam.exam.name}</p>
                      <p className="text-sm text-gray-600">
                        {exam.exam.examType} •{" "}
                        {new Date(exam.exam.examDate).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    {exam.totalScore !== null && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">
                          {exam.totalScore}
                        </p>
                        {exam.ranking && (
                          <p className="text-xs text-gray-500">Sıralama: {exam.ranking}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Son Görüşler */}
        <Card className="border-0 shadow-lg">
          <Link href="/veli/gorusler">
            <CardHeader className="hover:bg-orange-50/50 transition-colors cursor-pointer rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                  Son Görüşler
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardTitle>
            </CardHeader>
          </Link>
          <CardContent>
            {dashboardData.recentData.comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz görüş kaydı bulunmuyor</p>
            ) : (
              <div className="space-y-2">
                {dashboardData.recentData.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 border rounded-lg ${
                      comment.isPositive
                        ? "bg-green-50 border-green-200"
                        : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {comment.isPositive ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                        )}
                        <p className="font-medium text-sm">
                          {comment.staff.firstName} {comment.staff.lastName}
                        </p>
                        <span className="text-xs text-gray-500">
                          ({comment.staff.department})
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: {comment.commentType === "ACADEMIC" ? "Akademik" : comment.commentType === "BEHAVIORAL" ? "Davranışsal" : "Genel"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* IB Faaliyetleri */}
        <Card className="border-0 shadow-lg" id="ib-faaliyetleri">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              IB Faaliyetleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recentData.activities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz IB faaliyet kaydı bulunmuyor</p>
            ) : (
              <div className="space-y-2">
                {dashboardData.recentData.activities.map((activity) => {
                  const activityTypeLabels: Record<string, string> = {
                    ETKINLIK: "Etkinlik",
                    GEZI: "Gezi",
                    PROJE: "Proje",
                    SINAV: "Sınav",
                    YARISMA: "Yarışma",
                    SEMINER: "Seminer",
                    WORKSHOP: "Workshop",
                    SPORT: "Spor",
                    SANAT: "Sanat",
                    SOSYAL: "Sosyal Sorumluluk",
                    DIL: "Dil Faaliyeti",
                    BILIM: "Bilim",
                    DEGER: "Değerler Eğitimi",
                    DIGER: "Diğer",
                  }
                  return (
                    <div
                      key={activity.id}
                      className={`p-3 border rounded-lg ${
                        activity.isVerified
                          ? "bg-purple-50 border-purple-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Award className={`h-4 w-4 ${activity.isVerified ? "text-purple-600" : "text-gray-400"}`} />
                          <p className="font-medium text-sm">{activity.title}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {activityTypeLabels[activity.type] || activity.type}
                          </span>
                          {activity.isVerified && (
                            <div title="Doğrulanmış">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.activityDate).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-gray-700 mb-1">{activity.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        {activity.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.location}
                          </span>
                        )}
                        {activity.organizer && (
                          <span>Organizatör: {activity.organizer}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
