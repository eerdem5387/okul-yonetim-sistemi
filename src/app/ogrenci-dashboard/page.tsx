"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  Search,
  Award,
  MapPin,
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

export default function OgrenciDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const directStudentId = params.get("studentId")
      if (directStudentId) {
        router.replace(`/students/${directStudentId}`)
        return
      }

      const role = localStorage.getItem("auth_role")
      // Admin, Principal, Student Affairs için erişim
      if (role !== "admin" && role !== "principal" && role !== "student_affairs") {
        router.push("/login")
        return
      }
      fetchClasses()
    }
  }, [router])

  // Sınıf değiştiğinde öğrencileri getir
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId)
    } else {
      setStudents([])
      setFilteredStudents([])
      setSelectedStudentId("")
      setDashboardData(null)
    }
  }, [selectedClassId])

  // Arama terimi değiştiğinde öğrencileri filtrele
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredStudents(students)
    } else {
      const searchLower = searchTerm.toLowerCase()
      const filtered = students.filter(
        (student) =>
          student.firstName.toLowerCase().includes(searchLower) ||
          student.lastName.toLowerCase().includes(searchLower) ||
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower)
      )
      setFilteredStudents(filtered)
    }
  }, [searchTerm, students])

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes")
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        console.error("Failed to fetch classes:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async (classId: string) => {
    setLoadingStudents(true)
    try {
      const response = await fetch(`/api/classes/${classId}/students`)
      if (response.ok) {
        const data = await response.json()
        const studentsList = data.students || []
        setStudents(studentsList)
        setFilteredStudents(studentsList)
      } else {
        console.error("Failed to fetch students:", response.statusText)
        setStudents([])
        setFilteredStudents([])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
      setFilteredStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchDashboard = async (studentId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/students/${studentId}/dashboard`)
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

  if (loading && classes.length === 0) {
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
              {/* Sınıf Seçimi */}
              <div className="space-y-2">
                <Label htmlFor="class">Sınıf *</Label>
                <select
                  id="class"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Sınıf Seçin</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Öğrenci Seçimi ve Arama */}
              {selectedClassId && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="search">Öğrenci Ara (Ad Soyad)</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Öğrenci adı veya soyadı ile ara..."
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student">Öğrenci Seç *</Label>
                    {loadingStudents ? (
                      <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Öğrenciler yükleniyor...
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      <select
                        id="student"
                        value={selectedStudentId}
                        onChange={(e) => handleStudentChange(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Öğrenci Seçin</option>
                        {filteredStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.firstName} {student.lastName}
                            {student.grade && ` (${student.grade})`}
                          </option>
                        ))}
                      </select>
                    ) : searchTerm ? (
                      <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-sm">
                        Arama kriterlerinize uygun öğrenci bulunamadı.
                      </div>
                    ) : (
                      <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-sm">
                        Bu sınıfta öğrenci bulunmamaktadır.
                      </div>
                    )}
                </div>
                </>
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

              {/* IB Faaliyet İstatistikleri */}
              <Card className="border-l-4 border-l-purple-500">
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
                        <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                hw.isCompleted 
                                  ? "bg-green-100" 
                                  : isOverdue
                                  ? "bg-red-100"
                                  : "bg-blue-100"
                              }`}>
                                {hw.isCompleted ? (
                                  <CheckCircle className={`h-5 w-5 ${
                                    hw.isCompleted ? "text-green-600" : "text-blue-600"
                                  }`} />
                                ) : (
                                  <BookOpen className={`h-5 w-5 ${
                                    isOverdue ? "text-red-600" : "text-blue-600"
                                  }`} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 mb-1">{hw.homework.title}</p>
                                <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-1">
                                  {hw.homework.subject && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                      {hw.homework.subject}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    👤 {hw.homework.teacher.firstName} {hw.homework.teacher.lastName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className={`flex items-center gap-1 ${
                                    isOverdue ? "text-red-600 font-medium" : "text-gray-600"
                                  }`}>
                                    <Calendar className="h-3 w-3" />
                            Teslim: {new Date(hw.homework.dueDate).toLocaleDateString("tr-TR")}
                                    {isOverdue && " (Geçti)"}
                                  </span>
                                  {hw.isCompleted && hw.completedAt && (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      {new Date(hw.completedAt).toLocaleDateString("tr-TR")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                        </div>
                          <div className="flex items-center gap-2 ml-4">
                          {hw.isCompleted ? (
                              <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                              <CheckCircle className="h-4 w-4" />
                              Tamamlandı
                            </span>
                          ) : (
                              <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${
                                isOverdue 
                                  ? "bg-red-100 text-red-700" 
                                  : "bg-orange-100 text-orange-700"
                              }`}>
                              <Clock className="h-4 w-4" />
                                {isOverdue ? "Gecikti" : "Bekliyor"}
                            </span>
                          )}
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
                        className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            att.status === "PRESENT" 
                              ? "bg-green-100" 
                              : att.status === "ABSENT"
                              ? "bg-red-100"
                              : att.status === "LATE"
                              ? "bg-orange-100"
                              : "bg-blue-100"
                          }`}>
                            <Calendar className={`h-5 w-5 ${
                              att.status === "PRESENT" 
                                ? "text-green-600" 
                                : att.status === "ABSENT"
                                ? "text-red-600"
                                : att.status === "LATE"
                                ? "text-orange-600"
                                : "text-blue-600"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 mb-1">{att.lessonName}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                👤 {att.teacher.firstName} {att.teacher.lastName}
                              </span>
                              <span className="flex items-center gap-1">
                                📅 {new Date(att.date).toLocaleDateString("tr-TR", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${getStatusColor(
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

            {/* IB Faaliyetleri */}
            <Card className="border-0 shadow-lg">
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

