"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar, Users, CheckCircle, XCircle, Clock, Loader2, BookOpen } from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
}

interface Schedule {
  id: string
  subjectName: string
  startTime: string
  endTime: string
  dayOfWeek: number
  class: {
    id: string
    name: string
    grade: number
    section: string
  }
}

interface AttendanceRecord {
  studentId: string
  status: "PRESENT" | "ABSENT"
  note?: string
}

export default function TeacherAttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState("")
  
  // Form durumu
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  
  // Öğrenciler ve yoklama
  const [students, setStudents] = useState<Student[]>([])
  const [attendances, setAttendances] = useState<Record<string, AttendanceRecord>>({})
  
  // Sınıflar ve ders programı
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
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
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Tarih değiştiğinde ders programını getir
  useEffect(() => {
    if (selectedDate && staffId && selectedClass) {
      fetchDaySchedule(selectedDate, staffId, selectedClass)
    } else {
      setSchedules([])
      setSelectedSchedule(null)
    }
  }, [selectedDate, staffId, selectedClass])

  // Ders seçildiğinde öğrencileri getir
  useEffect(() => {
    if (selectedSchedule && selectedClass) {
      fetchStudents(selectedClass)
    } else {
      setStudents([])
      setAttendances({})
    }
  }, [selectedSchedule, selectedClass])

  const fetchClasses = async (teacherId: string) => {
    try {
      const response = await fetch(`/api/teachers/${teacherId}/classes`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        setClasses([])
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      setClasses([])
    }
  }

  const fetchDaySchedule = async (date: string, teacherId: string, classId: string) => {
    setLoadingSchedules(true)
    try {
      // Tarihin haftanın hangi günü olduğunu bul (1=Pazartesi, 7=Pazar)
      const dateObj = new Date(date)
      const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay() // Pazar = 7, Pazartesi = 1

      // Öğretmenin o günkü ders programını getir (sadece seçilen sınıf için)
      const response = await fetch(`/api/schedules?teacherId=${teacherId}&dayOfWeek=${dayOfWeek}`)
      if (response.ok) {
        const data = await response.json()
        // Sadece seçilen sınıfa ait dersleri filtrele
        const classSchedules = (data.schedules || []).filter(
          (s: Schedule) => s.class.id === classId
        )
        setSchedules(classSchedules)
      } else {
        setSchedules([])
      }
    } catch (error) {
      console.error("Error fetching schedule:", error)
      setSchedules([])
    } finally {
      setLoadingSchedules(false)
    }
  }

  const fetchStudents = async (classId: string) => {
    setLoadingStudents(true)
    try {
      const response = await fetch(`/api/classes/${classId}/students`)
      if (response.ok) {
        const data = await response.json()
        const studentList = data.students || []
        setStudents(studentList)
        // Varsayılan durum yok - öğretmen her öğrenci için manuel olarak seçim yapacak
        setAttendances({})
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    setSelectedSchedule(null)
    setStudents([])
    setAttendances({})
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setSelectedSchedule(null)
      setStudents([])
      setAttendances({})
    }

  const handleScheduleSelect = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
  }

  const handleStatusChange = (studentId: string, status: "PRESENT" | "ABSENT") => {
    setAttendances({
      ...attendances,
      [studentId]: {
        ...attendances[studentId],
        status,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedClass || !selectedDate || !selectedSchedule) {
      alert("Lütfen sınıf, tarih ve ders seçimini yapın")
      return
    }

    if (students.length === 0) {
      alert("Öğrenci listesi yüklenemedi")
      return
    }

    setLoading(true)

    try {
      const attendanceList = Object.values(attendances)
      
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selectedSchedule.id,
          classId: selectedClass,
          teacherId: staffId,
          date: selectedDate,
          lessonName: selectedSchedule.subjectName,
          startTime: selectedSchedule.startTime,
          endTime: selectedSchedule.endTime,
          attendances: attendanceList,
        }),
      })

      if (response.ok) {
        alert("Yoklama başarıyla kaydedildi!")
        // Formu sıfırla
        setSelectedSchedule(null)
        setStudents([])
        setAttendances({})
      } else {
        const error = await response.json()
        alert(error.error || "Bir hata oluştu")
      }
    } catch (error) {
      console.error("Error saving attendance:", error)
      alert("Yoklama kaydedilirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const getStats = () => {
    const total = students.length
    const present = Object.values(attendances).filter((a) => a.status === "PRESENT").length
    const absent = Object.values(attendances).filter((a) => a.status === "ABSENT").length
    return { total, present, absent }
  }

  const stats = getStats()
  const dayNames = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
  const selectedDateObj = selectedDate ? new Date(selectedDate) : new Date()
  const dayOfWeek = selectedDateObj.getDay() === 0 ? 7 : selectedDateObj.getDay()
  const dayName = dayNames[dayOfWeek]

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
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pl-16 lg:pl-4 sm:pl-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
                <Calendar className="h-7 w-7 sm:h-8 sm:w-8" />
                Yoklama Yönetimi
              </h1>
              <p className="text-blue-100 text-sm sm:text-base">Öğrenci devam durumunu kaydedin ve takip edin</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sınıf ve Tarih Seçimi */}
            <Card>
              <CardHeader>
              <CardTitle>Yoklama Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">Sınıf *</Label>
                    <select
                      id="class"
                      value={selectedClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Sınıf Seçin</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Tarih *</Label>
                    <input
                      id="date"
                      type="date"
                      value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  {selectedDate && (
                    <p className="text-sm text-gray-600 mt-1">
                      {dayName} günü
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ders Programı */}
          {selectedClass && selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>Ders Programı - {dayName}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSchedules ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Ders programı yükleniyor...</span>
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Bu tarihte bu sınıf için ders bulunmamaktadır.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-4">
                      Yoklama almak istediğiniz ders saatini seçin:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {schedules.map((schedule) => (
                        <button
                          key={schedule.id}
                          type="button"
                          onClick={() => handleScheduleSelect(schedule)}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            selectedSchedule?.id === schedule.id
                              ? "border-blue-500 bg-blue-50 shadow-md"
                              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-gray-900">
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-blue-600">
                            {schedule.subjectName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {schedule.class.name}
                          </div>
                        </button>
                      ))}
                  </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Öğrenci Listesi ve Yoklama */}
          {selectedSchedule && (
              <>
                {/* İstatistikler */}
              <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <div className="text-xs text-gray-600">Toplam</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                    <div className="text-xs text-gray-600">Katıldı</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                    <div className="text-xs text-gray-600">Katılmadı</div>
                    </CardContent>
                  </Card>
                </div>

              {/* Seçilen Ders Bilgisi */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-900">
                        {selectedSchedule.subjectName}
                      </p>
                      <p className="text-sm text-blue-700">
                        {selectedSchedule.startTime} - {selectedSchedule.endTime}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

                {/* Yoklama Tablosu */}
              {loadingStudents ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Öğrenciler yükleniyor...</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Öğrenci Listesi ({students.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {students.map((student, index) => {
                        const attendanceStatus = attendances[student.id]?.status
                        return (
                        <div
                          key={student.id}
                            className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors ${
                              attendanceStatus === "PRESENT"
                                ? "bg-green-50 border-green-200"
                                : attendanceStatus === "ABSENT"
                                ? "bg-red-50 border-red-200"
                                : "bg-white border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 font-mono w-8">{index + 1}.</span>
                              <div>
                                <span className="font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </span>
                                {student.grade && (
                                  <span className="text-sm text-gray-500 ml-2">({student.grade})</span>
                                )}
                                {!attendanceStatus && (
                                  <span className="text-xs text-gray-400 ml-2 italic">(İşlem yapılmadı)</span>
                                )}
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, "PRESENT")}
                                className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                                  attendanceStatus === "PRESENT"
                                    ? "bg-green-600 text-white border-green-700 shadow-sm font-semibold"
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                                }`}
                              >
                                <CheckCircle className="h-4 w-4 inline mr-1" />
                                Katıldı
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, "ABSENT")}
                                className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                                  attendanceStatus === "ABSENT"
                                    ? "bg-red-600 text-white border-red-700 shadow-sm font-semibold"
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                                }`}
                              >
                                <XCircle className="h-4 w-4 inline mr-1" />
                                Katılmadı
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

                {/* Kaydet Butonu */}
              {students.length > 0 && (
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={loading || Object.keys(attendances).length === 0} 
                    className="min-w-[200px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      "Yoklamayı Kaydet"
                    )}
                  </Button>
                  {Object.keys(attendances).length === 0 && (
                    <p className="text-sm text-gray-500 mt-2 text-right w-full">
                      Lütfen en az bir öğrenci için yoklama durumu seçin
                    </p>
                  )}
                </div>
              )}
              </>
            )}
          </form>
        </div>
    </div>
  )
}
