"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  User,
  X,
  Save,
  FileText,
  Users,
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
  }
}

export default function VeliGorusmeleriPage() {
  const [meetings, setMeetings] = useState<ParentMeeting[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<ParentMeeting | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalMeetings, setTotalMeetings] = useState(0)

  const [formData, setFormData] = useState({
    studentId: "",
    meetingDate: new Date().toISOString().split("T")[0],
    notes: "",
    counselorName: "",
  })

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students?limit=1000")
      if (response.ok) {
        const data = await response.json()
        setStudents(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
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

      const response = await fetch(`/api/parent-meetings?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setMeetings(data.meetings || [])
        setTotalMeetings(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error("Error fetching meetings:", error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedStudentId, startDate, endDate])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return students.slice(0, 10)
    const search = studentSearchTerm.toLowerCase()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingMeeting
        ? `/api/parent-meetings/${editingMeeting.id}`
        : "/api/parent-meetings"
      const method = editingMeeting ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchMeetings()
        setShowForm(false)
        setEditingMeeting(null)
        setFormData({
          studentId: "",
          meetingDate: new Date().toISOString().split("T")[0],
          notes: "",
          counselorName: "",
        })
        setSelectedStudentId("")
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Görüşme kaydedilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving meeting:", error)
      alert("Görüşme kaydedilirken hata oluştu!")
    }
  }

  const handleEdit = (meeting: ParentMeeting) => {
    setEditingMeeting(meeting)
    setFormData({
      studentId: meeting.studentId,
      meetingDate: meeting.meetingDate.split("T")[0],
      notes: meeting.notes,
      counselorName: meeting.counselorName || "",
    })
    setSelectedStudentId(meeting.studentId)
    setShowForm(true)
  }

  const handleDelete = async (meetingId: string) => {
    if (!confirm("Bu görüşmeyi silmek istediğinizden emin misiniz?")) {
      return
    }

    try {
      const response = await fetch(`/api/parent-meetings/${meetingId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchMeetings()
      } else {
        alert("Görüşme silinirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error deleting meeting:", error)
      alert("Görüşme silinirken hata oluştu!")
    }
  }

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    setFormData({ ...formData, studentId })
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
            Veli Görüşmeleri
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
            Rehberlik danışmanı görüşme kayıtları
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingMeeting(null)
            setFormData({
              studentId: "",
              meetingDate: new Date().toISOString().split("T")[0],
              notes: "",
              counselorName: "",
            })
            setSelectedStudentId("")
          }}
          size="sm"
          className="w-full sm:w-auto text-xs sm:text-sm"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Yeni Görüşme Ekle
        </Button>
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
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            Filtreleme
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
          {(selectedStudentId || startDate || endDate) && (
            <div className="mt-3 sm:mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStudentId("")
                  setStartDate("")
                  setEndDate("")
                  setStudentSearchTerm("")
                }}
                className="text-xs sm:text-sm"
              >
                Filtreleri Temizle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Görüşme Formu Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  {editingMeeting ? "Görüşme Düzenle" : "Yeni Görüşme Ekle"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setEditingMeeting(null)
                    setFormData({
                      studentId: "",
                      meetingDate: new Date().toISOString().split("T")[0],
                      notes: "",
                      counselorName: "",
                    })
                    setSelectedStudentId("")
                    setStudentSearchTerm("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Öğrenci Seçimi */}
                <div className="relative">
                  <Label htmlFor="studentSearch" className="text-xs sm:text-sm">
                    Öğrenci Seçin *
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    <Input
                      id="studentSearch"
                      placeholder="Öğrenci adı, soyadı veya TC ile ara..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="pl-8 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                      required={!selectedStudentId}
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
                    <div className="mt-2 p-2 sm:p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs sm:text-sm font-medium text-blue-900">
                        Seçilen Öğrenci: {selectedStudent.firstName} {selectedStudent.lastName} - {selectedStudent.grade}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="meetingDate" className="text-xs sm:text-sm">
                      Görüşme Tarihi *
                    </Label>
                    <Input
                      id="meetingDate"
                      type="date"
                      value={formData.meetingDate}
                      onChange={(e) =>
                        setFormData({ ...formData, meetingDate: e.target.value })
                      }
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="counselorName" className="text-xs sm:text-sm">
                      Rehberlik Danışmanı (Opsiyonel)
                    </Label>
                    <Input
                      id="counselorName"
                      value={formData.counselorName}
                      onChange={(e) =>
                        setFormData({ ...formData, counselorName: e.target.value })
                      }
                      placeholder="Danışman adı..."
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-xs sm:text-sm">
                    Görüşme Notları *
                  </Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    required
                    rows={8}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Görüşme detaylarını buraya yazın..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button type="submit" size="sm" className="flex-1 sm:flex-initial text-xs sm:text-sm">
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {editingMeeting ? "Güncelle" : "Kaydet"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(false)
                      setEditingMeeting(null)
                      setFormData({
                        studentId: "",
                        meetingDate: new Date().toISOString().split("T")[0],
                        notes: "",
                        counselorName: "",
                      })
                      setSelectedStudentId("")
                      setStudentSearchTerm("")
                    }}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Görüşme Listesi */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Görüşme Kayıtları
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          {loading ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-xs sm:text-sm">
              Yükleniyor...
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-xs sm:text-sm px-4">
              Henüz görüşme kaydı bulunmamaktadır.
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {meetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                          <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900">
                            {meeting.student.firstName} {meeting.student.lastName}
                          </h3>
                          <span className="text-xs sm:text-sm text-gray-500">
                            ({meeting.student.grade})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            {new Date(meeting.meetingDate).toLocaleDateString("tr-TR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                          {meeting.counselorName && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                              {meeting.counselorName}
                            </div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                          {meeting.notes}
                        </p>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(meeting)}
                          className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Düzenle</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(meeting.id)}
                          className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Sil</span>
                        </Button>
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

