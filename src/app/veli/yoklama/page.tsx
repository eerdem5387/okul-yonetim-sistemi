"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react"

interface Attendance {
  id: string
  date: string
  lessonName: string
  startTime: string
  endTime: string
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
  note?: string
  teacher: {
    firstName: string
    lastName: string
  }
}

export default function VeliYoklamaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [studentName, setStudentName] = useState("")
  const [selectedDate, setSelectedDate] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const parentId = localStorage.getItem("parent_id")
      const savedStudentName = localStorage.getItem("student_name")

      if (role !== "parent" || !parentId) {
        router.push("/veli-login")
        return
      }

      setStudentName(savedStudentName || "Öğrenci")
      fetchAttendances(parentId)
    }
  }, [router])

  const fetchAttendances = async (parentId: string, date?: string) => {
    try {
      // Önce öğrenci ID'sini al
      const studentsResponse = await fetch(`/api/parents/my-students?parentId=${parentId}`)
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        const student = studentsData.students[0]
        
        if (student) {
          // Öğrencinin yoklamalarını getir
          let url = `/api/attendance?studentId=${student.id}`
          if (date) {
            url += `&date=${date}`
          }
          
          const attendanceResponse = await fetch(url)
          if (attendanceResponse.ok) {
            const attendanceData = await attendanceResponse.json()
            setAttendances(attendanceData.attendances || [])
          }
        }
      }
    } catch (error) {
      console.error("Error fetching attendances:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (date: string) => {
    setSelectedDate(date)
    const parentId = localStorage.getItem("parent_id")
    if (parentId) {
      setLoading(true)
      fetchAttendances(parentId, date || undefined)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "ABSENT":
        return <XCircle className="h-6 w-6 text-red-600" />
      case "LATE":
        return <Clock className="h-6 w-6 text-yellow-600" />
      case "EXCUSED":
        return <AlertCircle className="h-6 w-6 text-blue-600" />
      default:
        return <CheckCircle className="h-6 w-6 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Geldi
          </span>
        )
      case "ABSENT":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            Gelmedi
          </span>
        )
      case "LATE":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            Geç Kaldı
          </span>
        )
      case "EXCUSED":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            İzinli
          </span>
        )
      default:
        return null
    }
  }

  const stats = {
    total: attendances.length,
    present: attendances.filter((a) => a.status === "PRESENT").length,
    absent: attendances.filter((a) => a.status === "ABSENT").length,
    late: attendances.filter((a) => a.status === "LATE").length,
    excused: attendances.filter((a) => a.status === "EXCUSED").length,
  }

  const attendanceRate =
    stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 100

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              {studentName} - Yoklama
            </h1>
            <p className="text-gray-600 mt-1">Öğrencinizin devam durumunu takip edin</p>
          </div>

          {/* Filtre */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <label htmlFor="dateFilter" className="text-sm font-medium">
                  Tarih Filtresi:
                </label>
                <input
                  id="dateFilter"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateFilter(e.target.value)}
                  className="p-2 border rounded-md"
                />
                {selectedDate && (
                  <button
                    onClick={() => handleDateFilter("")}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Filtreyi Temizle
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-gray-600">Toplam Ders</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{attendanceRate}%</div>
                <div className="text-xs text-gray-600">Devam Oranı</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                <div className="text-xs text-gray-600">Geldi</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <div className="text-xs text-gray-600">Gelmedi</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                <div className="text-xs text-gray-600">Geç Kaldı</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
                <div className="text-xs text-gray-600">İzinli</div>
              </CardContent>
            </Card>
          </div>

          {/* Yoklama Listesi */}
          <div className="space-y-4">
            {attendances.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Henüz yoklama kaydı bulunmuyor
                  </h3>
                  <p className="text-gray-600">
                    Öğretmenler yoklama aldıkça burada görüntülenecektir
                  </p>
                </CardContent>
              </Card>
            ) : (
              attendances.map((attendance) => (
                <Card key={attendance.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(attendance.status)}
                        <div>
                          <CardTitle className="text-lg">{attendance.lessonName}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            Öğretmen: {attendance.teacher.firstName} {attendance.teacher.lastName}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(attendance.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(attendance.date).toLocaleDateString("tr-TR", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-gray-600 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {attendance.startTime} - {attendance.endTime}
                      </span>
                    </div>
                    {attendance.note && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <strong>Not:</strong> {attendance.note}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
    </div>
  )
}

