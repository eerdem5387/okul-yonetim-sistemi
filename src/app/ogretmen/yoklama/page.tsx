"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
}

interface AttendanceRecord {
  studentId: string
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
  note: string
}

export default function TeacherAttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState("")
  
  // Form durumu
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [lessonName, setLessonName] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  
  // Öğrenciler ve yoklama
  const [students, setStudents] = useState<Student[]>([])
  const [attendances, setAttendances] = useState<Record<string, AttendanceRecord>>({})
  
  // Sınıflar
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffId(id)
      fetchClasses()
      setLoading(false)
    }
  }, [router])

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes")
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
    }
  }

  const fetchStudents = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}`)
      if (response.ok) {
        const data = await response.json()
        const studentList = data.class.students?.map((s: { student: Student }) => s.student) || []
        setStudents(studentList)
        
        // Tüm öğrenciler için varsayılan olarak "PRESENT" durumunu ayarla
        const defaultAttendances: Record<string, AttendanceRecord> = {}
        studentList.forEach((student: Student) => {
          defaultAttendances[student.id] = {
            studentId: student.id,
            status: "PRESENT",
            note: "",
          }
        })
        setAttendances(defaultAttendances)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    if (classId) {
      fetchStudents(classId)
    } else {
      setStudents([])
      setAttendances({})
    }
  }

  const handleStatusChange = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") => {
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
    
    if (!selectedClass || !lessonName || !startTime || !endTime) {
      alert("Lütfen tüm alanları doldurun")
      return
    }

    setLoading(true)

    try {
      const attendanceList = Object.values(attendances)
      
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass,
          teacherId: staffId,
          date: selectedDate,
          lessonName,
          startTime,
          endTime,
          attendances: attendanceList,
        }),
      })

      if (response.ok) {
        alert("Yoklama başarıyla kaydedildi!")
        // Formu sıfırla
        setSelectedClass("")
        setLessonName("")
        setStartTime("")
        setEndTime("")
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-100 text-green-800 border-green-300"
      case "ABSENT":
        return "bg-red-100 text-red-800 border-red-300"
      case "LATE":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "EXCUSED":
        return "bg-blue-100 text-blue-800 border-blue-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getStats = () => {
    const total = students.length
    const present = Object.values(attendances).filter((a) => a.status === "PRESENT").length
    const absent = Object.values(attendances).filter((a) => a.status === "ABSENT").length
    const late = Object.values(attendances).filter((a) => a.status === "LATE").length
    const excused = Object.values(attendances).filter((a) => a.status === "EXCUSED").length
    return { total, present, absent, late, excused }
  }

  const stats = getStats()

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
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ders Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lesson">Ders Adı *</Label>
                    <input
                      id="lesson"
                      type="text"
                      value={lessonName}
                      onChange={(e) => setLessonName(e.target.value)}
                      placeholder="Örn: Matematik"
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Başlangıç Saati *</Label>
                    <input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Bitiş Saati *</Label>
                    <input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Öğrenci Listesi */}
            {students.length > 0 && (
              <>
                {/* İstatistikler */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

                {/* Yoklama Tablosu */}
                <Card>
                  <CardHeader>
                    <CardTitle>Öğrenci Listesi ({students.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {students.map((student, index) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 font-mono w-8">{index + 1}.</span>
                            <span className="font-medium">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-sm text-gray-500">({student.grade})</span>
                          </div>
                          <div className="flex gap-2">
                            {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(student.id, status)}
                                className={`px-3 py-1 rounded-md text-sm font-medium border transition-all ${
                                  attendances[student.id]?.status === status
                                    ? getStatusColor(status)
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {status === "PRESENT" && "Geldi"}
                                {status === "ABSENT" && "Gelmedi"}
                                {status === "LATE" && "Geç Kaldı"}
                                {status === "EXCUSED" && "İzinli"}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Kaydet Butonu */}
                <div className="flex justify-end">
                  <Button type="submit" size="lg" disabled={loading}>
                    Yoklamayı Kaydet
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
    </div>
  )
}

