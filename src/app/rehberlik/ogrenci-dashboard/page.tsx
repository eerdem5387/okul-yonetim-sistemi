"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/sidebar"
import {
  User,
  BookOpen,
  Calendar,
  FileText,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
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

export default function RehberlikOgrenciDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [period, setPeriod] = useState("30days")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      if (role !== "counselor") {
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
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <User className="h-8 w-8 text-purple-600" />
              Öğrenci Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Öğrenci performansını ve gelişimini görüntüleyin
            </p>
          </div>

          {/* Öğrenci Seçimi ve Filtre */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentSelect">Öğrenci Seçin</Label>
                  <select
                    id="studentSelect"
                    value={selectedStudentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Bir öğrenci seçin...</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} ({student.grade})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodSelect">Zaman Periyodu</Label>
                  <select
                    id="periodSelect"
                    value={period}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    disabled={!selectedStudentId}
                  >
                    <option value="30days">Son 30 Gün</option>
                    <option value="thisMonth">Bu Ay</option>
                    <option value="all">Tüm Zamanlar</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {!selectedStudentId && (
            <Card>
              <CardContent className="p-12 text-center">
                <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Öğrenci Seçin
                </h3>
                <p className="text-gray-600">
                  Dashboard görüntülemek için yukarıdan bir öğrenci seçin
                </p>
              </CardContent>
            </Card>
          )}

          {loading && selectedStudentId && (
            <div className="flex justify-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            </div>
          )}

          {dashboardData && !loading && (
            <>
              {/* Öğrenci Bilgi Kartı */}
              <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {dashboardData.student.firstName}{" "}
                        {dashboardData.student.lastName}
                      </h2>
                      <p className="text-purple-100">
                        Sınıf: {dashboardData.student.grade}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* İstatistik Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ödev Tamamlama */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-purple-600" />
                      Ödev Tamamlama
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      %{dashboardData.statistics.homeworkCompletionRate}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {dashboardData.statistics.completedHomeworks}/{dashboardData.statistics.totalHomeworks} ödev
                    </p>
                  </CardContent>
                </Card>

                {/* Devam Oranı */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      Devam Oranı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      %{dashboardData.statistics.attendanceRate}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {dashboardData.statistics.presentCount}/{dashboardData.statistics.totalAttendances} ders
                    </p>
                  </CardContent>
                </Card>

                {/* Sınav Ortalaması */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Sınav Ortalaması
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {dashboardData.statistics.averageScore}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {dashboardData.statistics.totalExams} sınav
                    </p>
                  </CardContent>
                </Card>

                {/* Görüşler */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-orange-600" />
                      Görüşler
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 items-baseline">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardData.statistics.positiveComments}
                      </div>
                      <span className="text-gray-400">/</span>
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboardData.statistics.negativeComments}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Olumlu / Gelişmeli
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detaylı Bilgiler */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Son Ödevler */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Son Ödevler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardData.recentData.homeworks.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Henüz ödev yok
                      </p>
                    ) : (
                      dashboardData.recentData.homeworks.slice(0, 5).map((hw) => (
                        <div
                          key={hw.id}
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
                          {hw.isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{hw.homework.title}</p>
                            <p className="text-xs text-gray-600">
                              {hw.homework.subject || "Genel"} • Son:{" "}
                              {new Date(hw.homework.dueDate).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Son Yoklamalar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                      Son Yoklamalar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardData.recentData.attendances.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Henüz yoklama yok
                      </p>
                    ) : (
                      dashboardData.recentData.attendances.slice(0, 5).map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{att.lessonName}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(att.date).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              att.status
                            )}`}
                          >
                            {getStatusLabel(att.status)}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Son Sınav Sonuçları */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Son Sınav Sonuçları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardData.recentData.examResults.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Henüz sınav sonucu yok
                      </p>
                    ) : (
                      dashboardData.recentData.examResults.slice(0, 5).map((exam) => (
                        <div
                          key={exam.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{exam.exam.name}</p>
                            <p className="text-xs text-gray-600">
                              {exam.exam.examType} •{" "}
                              {new Date(exam.exam.examDate).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {exam.totalScore || "-"}
                            </div>
                            {exam.ranking && (
                              <div className="text-xs text-gray-600">
                                #{exam.ranking}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Son Görüşler */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-orange-600" />
                      Son Görüşler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardData.recentData.comments.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Henüz görüş yok
                      </p>
                    ) : (
                      dashboardData.recentData.comments.slice(0, 5).map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-3 border-l-4 rounded-lg ${
                            comment.isPositive ? "border-l-green-500 bg-green-50" : "border-l-orange-500 bg-orange-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {comment.isPositive ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-orange-600" />
                            )}
                            <span className="text-xs font-medium text-gray-600">
                              {comment.staff.firstName} {comment.staff.lastName}
                            </span>
                            <span className="text-xs text-gray-500">
                              • {new Date(comment.createdAt).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

