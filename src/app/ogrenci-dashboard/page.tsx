"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { StudentSearch } from "@/components/ui/student-search"
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
  }
  recentData: {
    homeworks: Array<{
      id: string
      isCompleted: boolean
      completedAt: string | null
      homework: {
        title: string
        dueDate: string
        subject: string | null
      }
    }>
    attendances: Array<{
      id: string
      status: string
      date: string
      lessonName: string
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
  }
}

export default function OgrenciDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [period, setPeriod] = useState("30days")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      // Admin, Principal, Student Affairs için erişim
      if (role !== "admin" && role !== "principal" && role !== "student_affairs") {
        router.push("/login")
        return
      }
      fetchStudents()
    }
  }, [router])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students/public")
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboard = async (studentId: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/students/${studentId}/dashboard?period=${period}`
      )
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      } else {
        alert("Dashboard verileri alınamadı")
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error)
      alert("Bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId)
    if (studentId) {
      fetchDashboard(studentId)
    } else {
      setDashboardData(null)
    }
  }

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    if (selectedStudentId) {
      fetchDashboard(selectedStudentId)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-100 text-green-700"
      case "ABSENT":
        return "bg-red-100 text-red-700"
      case "LATE":
        return "bg-orange-100 text-orange-700"
      case "EXCUSED":
        return "bg-blue-100 text-blue-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "Geldi"
      case "ABSENT":
        return "Gelmedi"
      case "LATE":
        return "Geç Kaldı"
      case "EXCUSED":
        return "İzinli"
      default:
        return status
    }
  }

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
                <User className="h-7 w-7 sm:h-8 sm:w-8" />
                Öğrenci Dashboard
              </h1>
              <p className="text-blue-100 text-sm sm:text-base">
                Öğrencilerin ödev, yoklama, sınav ve görüş verilerini görüntüleyin
              </p>
            </div>
          </div>
        </div>

        {/* Öğrenci Seçimi */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Öğrenci Seçimi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="student">Öğrenci Ara</Label>
                <StudentSearch
                  students={students}
                  selectedStudentId={selectedStudentId}
                  onSelect={handleStudentChange}
                  placeholder="Öğrenci adı, soyadı veya TC ile ara..."
                />
              </div>
              {selectedStudentId && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={period === "30days" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePeriodChange("30days")}
                  >
                    Son 30 Gün
                  </Button>
                  <Button
                    variant={period === "thisMonth" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePeriodChange("thisMonth")}
                  >
                    Bu Ay
                  </Button>
                  <Button
                    variant={period === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePeriodChange("all")}
                  >
                    Tümü
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard İçeriği */}
        {loading && dashboardData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : dashboardData ? (
          <>
            {/* Öğrenci Bilgileri */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Öğrenci Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Ad Soyad</p>
                    <p className="text-lg font-semibold">
                      {dashboardData.student.firstName} {dashboardData.student.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sınıf</p>
                    <p className="text-lg font-semibold">{dashboardData.student.grade}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">TC Kimlik No</p>
                    <p className="text-lg font-semibold">{dashboardData.student.tcNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefon</p>
                    <p className="text-lg font-semibold">
                      {dashboardData.student.phone || "Belirtilmemiş"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ödev İstatistikleri */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Ödev Tamamlama</p>
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    %{dashboardData.statistics.homeworkCompletionRate}
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">
                    {dashboardData.statistics.completedHomeworks} / {dashboardData.statistics.totalHomeworks} tamamlandı
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${dashboardData.statistics.homeworkCompletionRate}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Yoklama İstatistikleri */}
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Yoklama Oranı</p>
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    %{dashboardData.statistics.attendanceRate}
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">
                    {dashboardData.statistics.presentCount} / {dashboardData.statistics.totalAttendances} devam
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${dashboardData.statistics.attendanceRate}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sınav İstatistikleri */}
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Ortalama Puan</p>
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

              {/* Görüş İstatistikleri */}
              <Card className="border-l-4 border-l-orange-500">
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
            </div>

            {/* Son Ödevler */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Son Ödevler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.recentData.homeworks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Henüz ödev kaydı bulunmuyor</p>
                ) : (
                  <div className="space-y-2">
                    {dashboardData.recentData.homeworks.map((hw) => (
                      <div
                        key={hw.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{hw.homework.title}</p>
                          <p className="text-sm text-gray-600">
                            {hw.homework.subject && `${hw.homework.subject} • `}
                            Teslim: {new Date(hw.homework.dueDate).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hw.isCompleted ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Tamamlandı
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Bekliyor
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Son Yoklamalar */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Son Yoklamalar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.recentData.attendances.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Henüz yoklama kaydı bulunmuyor</p>
                ) : (
                  <div className="space-y-2">
                    {dashboardData.recentData.attendances.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{att.lessonName}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(att.date).toLocaleDateString("tr-TR", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            att.status
                          )}`}
                        >
                          {getStatusLabel(att.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sınav Sonuçları */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Sınav Sonuçları
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.recentData.examResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Henüz sınav sonucu bulunmuyor</p>
                ) : (
                  <div className="space-y-2">
                    {dashboardData.recentData.examResults.map((exam) => (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{exam.exam.name}</p>
                          <p className="text-sm text-gray-600">
                            {exam.exam.examType} •{" "}
                            {new Date(exam.exam.examDate).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          {exam.totalScore !== null && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-purple-600">
                                {exam.totalScore}
                              </p>
                              {exam.ranking && (
                                <p className="text-xs text-gray-500">Sıralama: {exam.ranking}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Son Görüşler */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                  Son Görüşler
                </CardTitle>
              </CardHeader>
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
          </>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">Öğrenci seçin</p>
              <p className="text-gray-400 text-sm">
                Dashboard verilerini görüntülemek için bir öğrenci seçin
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

