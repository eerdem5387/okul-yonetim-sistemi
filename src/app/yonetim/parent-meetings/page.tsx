"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Search,
  Calendar,
  User,
  Users,
  Filter,
  X,
  Loader2,
  MessageSquare,
} from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
}

interface ParentMeeting {
  id: string
  studentId: string
  meetingDate: string
  notes: string
  counselorName: string | null
  createdAt: string
  updatedAt: string
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber: string
    motherName: string
    fatherName: string
  }
}

export default function YonetimParentMeetingsPage() {
  const [meetings, setMeetings] = useState<ParentMeeting[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [counselors, setCounselors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedCounselor, setSelectedCounselor] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalMeetings, setTotalMeetings] = useState(0)

  // Kullanıcı rolü kontrolü - sadece admin, principal, student_affairs erişebilir
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      if (role !== "admin" && role !== "principal" && role !== "student_affairs") {
        // Yetkisiz erişim - ana sayfaya yönlendir
        window.location.href = "/"
      }
    }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students?limit=1000")
      if (response.ok) {
        const data = await response.json()
        if (data.students && Array.isArray(data.students)) {
          setStudents(data.students)
        } else if (Array.isArray(data)) {
          setStudents(data)
        } else {
          setStudents([])
        }
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    }
  }, [])

  const fetchCounselors = useCallback(async () => {
    try {
      const response = await fetch("/api/staff?department=REHBERLIK&limit=1000")
      if (response.ok) {
        const data = await response.json()
        const staffArray = Array.isArray(data.staff) ? data.staff : (Array.isArray(data) ? data : [])
        // Rehberlik uzmanlarının isimlerini çıkar
        const counselorNames = staffArray
          .filter((s: { department: string }) => s.department === "REHBERLIK")
          .map((s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`)
          .filter(Boolean)
        setCounselors([...new Set(counselorNames)].sort())
      }
    } catch (error) {
      console.error("Error fetching counselors:", error)
      // Hata durumunda görüşmelerden çıkarmaya devam et
    }
  }, [])

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
      })

      if (selectedStudentId) params.append("studentId", selectedStudentId)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      console.log("[Parent Meetings] Fetching with params:", params.toString())
      const response = await fetch(`/api/parent-meetings?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("[Parent Meetings] API Response:", data)
        
        let fetchedMeetings = data.meetings || []
        
        // Rehberlik uzmanı filtresi (frontend'de)
        if (selectedCounselor) {
          fetchedMeetings = fetchedMeetings.filter((m: ParentMeeting) => 
            m.counselorName === selectedCounselor
          )
        }
        
        console.log("[Parent Meetings] Filtered meetings:", fetchedMeetings.length)
        setMeetings(fetchedMeetings)
        
        // Rehberlik uzmanı filtresi uygulanmışsa total'i güncelle
        const total = selectedCounselor 
          ? fetchedMeetings.length 
          : (data.pagination?.total || fetchedMeetings.length)
        
        setTotalMeetings(total)
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        console.error("[Parent Meetings] API Error:", response.status, await response.text())
        setMeetings([])
        setTotalMeetings(0)
        setTotalPages(1)
      }
    } catch (error) {
      console.error("Error fetching meetings:", error)
      setMeetings([])
      setTotalMeetings(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedStudentId, startDate, endDate, selectedCounselor])

  useEffect(() => {
    fetchStudents()
    fetchCounselors()
  }, [fetchStudents, fetchCounselors])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Rehberlik uzmanlarını görüşmelerden de ekle (API'den gelenlerle birleştir)
  useEffect(() => {
    const uniqueCounselorsFromMeetings = Array.from(new Set(meetings.map(m => m.counselorName).filter(Boolean))) as string[]
    if (uniqueCounselorsFromMeetings.length > 0) {
      setCounselors(prev => {
        const combined = [...new Set([...prev, ...uniqueCounselorsFromMeetings])]
        return combined.sort()
      })
    }
  }, [meetings])

  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return []
    const search = studentSearchTerm.toLowerCase().trim()
    return students
      .filter(
        (student) =>
          student.firstName.toLowerCase().includes(search) ||
          student.lastName.toLowerCase().includes(search) ||
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(search) ||
          student.tcNumber.includes(search) ||
          student.grade.toLowerCase().includes(search)
      )
      .slice(0, 10)
  }, [students, studentSearchTerm])

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    setStudentSearchTerm("")
  }

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId)
  }, [students, selectedStudentId])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total: totalMeetings,
      thisMonth: meetings.filter((m) => {
        const meetingDate = new Date(m.meetingDate)
        return (
          meetingDate.getMonth() === now.getMonth() &&
          meetingDate.getFullYear() === now.getFullYear()
        )
      }).length,
      thisYear: meetings.filter((m) => {
        const meetingDate = new Date(m.meetingDate)
        return meetingDate.getFullYear() === now.getFullYear()
      }).length,
    }
  }, [meetings, totalMeetings])

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Veli Görüşmeleri Yönetimi
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
            Rehberlik danışmanlarının gerçekleştirdiği veli görüşmelerini görüntüleyin ve takip edin
          </p>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              Toplam Görüşme
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              Bu Ay
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {stats.thisMonth}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              Bu Yıl
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {stats.thisYear}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Detaylı Filtreleme
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Label htmlFor="studentFilter" className="text-xs sm:text-sm">
                Öğrenci Ara
              </Label>
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  id="studentFilter"
                  placeholder="Öğrenci adı, soyadı veya TC..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              {studentSearchTerm && filteredStudents.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleStudentSelect(student.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs sm:text-sm"
                    >
                      {student.firstName} {student.lastName} - {student.grade} ({student.tcNumber})
                    </button>
                  ))}
                </div>
              )}
              {selectedStudent && (
                <div className="mt-2 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm font-medium text-blue-900">
                    <span className="font-semibold">Seçilen Öğrenci:</span> {selectedStudent.firstName} {selectedStudent.lastName} - {selectedStudent.grade}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStudentId("")
                      setStudentSearchTerm("")
                    }}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="counselorFilter" className="text-xs sm:text-sm">
                Rehberlik Uzmanı
              </Label>
              <select
                id="counselorFilter"
                value={selectedCounselor}
                onChange={(e) => setSelectedCounselor(e.target.value)}
                className="w-full h-9 sm:h-10 px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm bg-white"
              >
                <option value="">Tüm Rehberlik Uzmanları</option>
                {counselors.map((counselor) => (
                  <option key={counselor} value={counselor}>
                    {counselor}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="startDate" className="text-xs sm:text-sm">
                Başlangıç Tarihi
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs sm:text-sm">
                Bitiş Tarihi
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </div>
          {(selectedStudentId || startDate || endDate || selectedCounselor) && (
            <div className="mt-3 sm:mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStudentId("")
                  setStartDate("")
                  setEndDate("")
                  setSelectedCounselor("")
                  setStudentSearchTerm("")
                }}
                className="text-xs sm:text-sm"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Filtreleri Temizle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Görüşme Listesi */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            Görüşme Kayıtları ({totalMeetings})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500 text-xs sm:text-sm">Yükleniyor...</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-xs sm:text-sm font-medium">
                Henüz görüşme kaydı bulunmamaktadır.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {meetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Öğrenci Bilgisi */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1">
                              {meeting.student.firstName} {meeting.student.lastName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                                {meeting.student.grade}
                              </span>
                              <span className="text-gray-500">
                                TC: {meeting.student.tcNumber}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Görüşme Detayları */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                            <Calendar className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-700">
                              {new Date(meeting.meetingDate).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          {/* Görüşmeyi Gerçekleştiren Rehberlik Uzmanı */}
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                            <Users className="h-4 w-4 text-purple-600" />
                            <span className="font-medium text-purple-700">
                              Görüşmeyi gerçekleştiren: {meeting.counselorName || "Bilinmiyor"}
                            </span>
                          </div>
                          {/* Veli Bilgisi */}
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-700">
                              Veli: {meeting.student.motherName || meeting.student.fatherName || "Bilinmiyor"}
                              {meeting.student.motherName && meeting.student.fatherName && (
                                <span className="text-green-600 ml-1">
                                  ({meeting.student.motherName} / {meeting.student.fatherName})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Görüşme Notları */}
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1.5">
                            Görüşme Notları:
                          </p>
                          <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {meeting.notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Sayfa <span className="font-medium">{currentPage}</span> /{" "}
            <span className="font-medium">{totalPages}</span> ({totalMeetings} görüşme)
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-xs sm:text-sm"
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="text-xs sm:text-sm"
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

