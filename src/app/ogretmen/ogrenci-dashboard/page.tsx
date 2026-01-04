"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  User,
  BookOpen,
  Calendar,
  FileText,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Loader2,
  BarChart3,
  Plus,
  Search,
  Users,
  MapPin,
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
    totalActivities: number
    verifiedActivities: number
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

export default function OgretmenOgrenciDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState("")
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
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")
      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }
      setStaffId(id)
      fetchClasses(id)
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

  const fetchClasses = async (teacherId: string) => {
    try {
      const response = await fetch(`/api/teachers/${teacherId}/classes`)
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <User className="h-8 w-8 text-blue-600" />
              Öğrenci Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Öğrenci performansını ve gelişimini görüntüleyin
            </p>
          </div>

          {/* Öğrenci Seçimi */}
          <Card className="border-2 border-blue-100 shadow-sm">
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
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
          )}

          {dashboardData && !loading && (
            <>
              {/* Öğrenci Bilgi Kartı ve Hızlı Erişim */}
              <Card className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center shadow-lg">
                        <User className="h-10 w-10" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold mb-1">
                          {dashboardData.student.firstName}{" "}
                          {dashboardData.student.lastName}
                        </h2>
                        <div className="flex items-center gap-4 text-blue-100">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Sınıf: {dashboardData.student.grade}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            TC: {dashboardData.student.tcNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/ogretmen/odevler?studentId=${selectedStudentId}`)}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ödev Ver
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/ogretmen/yoklama?studentId=${selectedStudentId}`)}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Yoklama Al
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/ogretmen/gorusler?studentId=${selectedStudentId}`)}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Görüş Ekle
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* İstatistik Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ödev Tamamlama */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      Ödev Tamamlama
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-blue-600">
                        %{dashboardData.statistics.homeworkCompletionRate}
                      </div>
                      {dashboardData.statistics.homeworkCompletionRate >= 80 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : dashboardData.statistics.homeworkCompletionRate >= 50 ? (
                        <Clock className="h-5 w-5 text-orange-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${dashboardData.statistics.homeworkCompletionRate}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {dashboardData.statistics.completedHomeworks}/{dashboardData.statistics.totalHomeworks} ödev tamamlandı
                    </p>
                    {dashboardData.statistics.pendingHomeworks > 0 && (
                      <p className="text-xs text-orange-600 mt-1 font-medium">
                        {dashboardData.statistics.pendingHomeworks} ödev bekliyor
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Devam Oranı */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      Devam Oranı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-green-600">
                        %{dashboardData.statistics.attendanceRate}
                      </div>
                      {dashboardData.statistics.attendanceRate >= 90 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : dashboardData.statistics.attendanceRate >= 70 ? (
                        <Clock className="h-5 w-5 text-orange-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${dashboardData.statistics.attendanceRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-green-700">{dashboardData.statistics.presentCount}</span> geldi
                      </p>
                      <div className="flex gap-2 text-xs">
                        {dashboardData.statistics.absentCount > 0 && (
                          <span className="text-red-600">
                            {dashboardData.statistics.absentCount} gelmedi
                          </span>
                        )}
                        {dashboardData.statistics.lateCount > 0 && (
                          <span className="text-orange-600">
                            {dashboardData.statistics.lateCount} geç
                          </span>
                        )}
                        {dashboardData.statistics.excusedCount > 0 && (
                          <span className="text-blue-600">
                            {dashboardData.statistics.excusedCount} izinli
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sınav Ortalaması */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Sınav Ortalaması
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-purple-600">
                        {dashboardData.statistics.averageScore > 0 ? dashboardData.statistics.averageScore : "-"}
                      </div>
                      {dashboardData.statistics.averageScore >= 80 ? (
                        <Award className="h-5 w-5 text-yellow-600" />
                      ) : dashboardData.statistics.averageScore >= 60 ? (
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      ) : dashboardData.statistics.averageScore > 0 ? (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {dashboardData.statistics.totalExams} sınav sonucu
                    </p>
                    {dashboardData.statistics.averageScore > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(dashboardData.statistics.averageScore / 100) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Görüşler */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-orange-600" />
                      Görüşler
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 items-baseline">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {dashboardData.statistics.positiveComments}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Olumlu</p>
                      </div>
                      <div className="h-8 w-px bg-gray-300" />
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {dashboardData.statistics.negativeComments}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Gelişmeli</p>
                      </div>
                    </div>
                    {dashboardData.statistics.totalComments > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex gap-2">
                          <div
                            className="h-2 bg-green-500 rounded-full"
                            style={{
                              width: `${(dashboardData.statistics.positiveComments / dashboardData.statistics.totalComments) * 100}%`
                            }}
                          />
                          <div
                            className="h-2 bg-orange-500 rounded-full"
                            style={{
                              width: `${(dashboardData.statistics.negativeComments / dashboardData.statistics.totalComments) * 100}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Toplam {dashboardData.statistics.totalComments} görüş
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* IB Faaliyetleri */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Award className="h-4 w-4 text-purple-600" />
                      IB Faaliyetleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {dashboardData.statistics.totalActivities}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {dashboardData.statistics.verifiedActivities} doğrulanmış
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detaylı Bilgiler - Tabs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Son Ödevler */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        Son Ödevler
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/ogretmen/odevler?studentId=${selectedStudentId}`)}
                        className="text-xs"
                      >
                        Tümünü Gör
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    {dashboardData.recentData.homeworks.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Henüz ödev yok</p>
                      </div>
                    ) : (
                      dashboardData.recentData.homeworks.slice(0, 5).map((hw) => {
                        const isOverdue = new Date(hw.homework.dueDate) < new Date() && !hw.isCompleted
                        return (
                          <div
                            key={hw.id}
                            className={`flex items-start gap-3 p-3 border-2 rounded-lg transition-all hover:shadow-sm ${
                              isOverdue ? "border-red-200 bg-red-50" : "border-gray-200 hover:border-blue-200"
                            }`}
                          >
                            {hw.isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900">{hw.homework.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {hw.homework.subject || "Genel"}
                                </span>
                                <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                                  Son: {new Date(hw.homework.dueDate).toLocaleDateString("tr-TR")}
                                </span>
                              </div>
                              {hw.isCompleted && hw.completedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ {new Date(hw.completedAt).toLocaleDateString("tr-TR")} tamamlandı
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Son Yoklamalar */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5 text-green-600" />
                        Son Yoklamalar
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/ogretmen/yoklama?studentId=${selectedStudentId}`)}
                        className="text-xs"
                      >
                        Tümünü Gör
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    {dashboardData.recentData.attendances.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Henüz yoklama yok</p>
                      </div>
                    ) : (
                      dashboardData.recentData.attendances.slice(0, 5).map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-green-200 transition-all hover:shadow-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{att.lessonName}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(att.date).toLocaleDateString("tr-TR", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(
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
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Son Sınav Sonuçları
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/rehberlik/sinavlar?studentId=${selectedStudentId}`)}
                        className="text-xs"
                      >
                        Tümünü Gör
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    {dashboardData.recentData.examResults.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Henüz sınav sonucu yok</p>
                      </div>
                    ) : (
                      dashboardData.recentData.examResults.slice(0, 5).map((exam) => {
                        const score = exam.totalScore || 0
                        const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-purple-600" : "text-red-600"
                        return (
                          <div
                            key={exam.id}
                            className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-purple-200 transition-all hover:shadow-sm"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">{exam.exam.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                  {exam.exam.examType}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {new Date(exam.exam.examDate).toLocaleDateString("tr-TR")}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className={`text-2xl font-bold ${scoreColor}`}>
                                {exam.totalScore || "-"}
                              </div>
                              {exam.ranking && (
                                <div className="text-xs text-gray-600 mt-1">
                                  <Award className="h-3 w-3 inline mr-1" />
                                  #{exam.ranking}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Son Görüşler */}
                <Card className="hover:shadow-md transition-shadow lg:col-span-2">
                  <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageSquare className="h-5 w-5 text-orange-600" />
                        Son Görüşler
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/ogretmen/gorusler?studentId=${selectedStudentId}`)}
                        className="text-xs"
                      >
                        Tümünü Gör
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    {dashboardData.recentData.comments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Henüz görüş yok</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dashboardData.recentData.comments.slice(0, 6).map((comment) => (
                          <div
                            key={comment.id}
                            className={`p-4 border-l-4 rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                              comment.isPositive
                                ? "border-l-green-500 bg-green-50 hover:bg-green-100"
                                : "border-l-orange-500 bg-orange-50 hover:bg-orange-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {comment.isPositive ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="text-xs font-semibold text-gray-700">
                                {comment.staff.firstName} {comment.staff.lastName}
                              </span>
                              <span className="text-xs text-gray-500">
                                • {new Date(comment.createdAt).toLocaleDateString("tr-TR")}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {comment.content}
                            </p>
                            <div className="mt-2">
                              <span className="text-xs px-2 py-0.5 bg-white/50 rounded text-gray-600">
                                {comment.commentType === "ACADEMIC" ? "Akademik" : comment.commentType === "BEHAVIORAL" ? "Davranış" : "Genel"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* IB Faaliyetleri */}
                <Card className="hover:shadow-md transition-shadow lg:col-span-2">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5 text-purple-600" />
                      IB Faaliyetleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    {dashboardData.recentData.activities.length === 0 ? (
                      <div className="text-center py-8">
                        <Award className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Henüz IB faaliyet kaydı yok</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dashboardData.recentData.activities.slice(0, 6).map((activity) => {
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
                              className={`p-4 border-l-4 rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                                activity.isVerified
                                  ? "border-l-purple-500 bg-purple-50 hover:bg-purple-100"
                                  : "border-l-gray-300 bg-gray-50 hover:bg-gray-100"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Award className={`h-4 w-4 ${activity.isVerified ? "text-purple-600" : "text-gray-400"}`} />
                                <span className="text-xs font-semibold text-gray-900 flex-1">
                                  {activity.title}
                                </span>
                                {activity.isVerified && (
                                  <div title="Doğrulanmış">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                  {activityTypeLabels[activity.type] || activity.type}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(activity.activityDate).toLocaleDateString("tr-TR")}
                                </span>
                              </div>
                              {activity.description && (
                                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                                  {activity.description}
                                </p>
                              )}
                              {(activity.location || activity.organizer) && (
                                <div className="flex items-center gap-3 text-xs text-gray-500">
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
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
    </div>
  )
}

