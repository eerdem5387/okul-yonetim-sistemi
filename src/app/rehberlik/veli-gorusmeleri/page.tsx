"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToastContainer, useToast } from "@/components/ui/toast"
import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"
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
  CheckCircle2,
  AlertCircle,
  Loader2,
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
  const { toasts, success, error, removeToast } = useToast()
  const [meetings, setMeetings] = useState<ParentMeeting[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
        // API response format: { students: [...], pagination: {...} }
        if (data.students && Array.isArray(data.students)) {
          setStudents(data.students)
        } else if (Array.isArray(data)) {
          // Fallback: eski format (array)
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
    // Arama yapılmadığında boş liste döndür (kullanıcı arama yapana kadar öğrenci listesi gösterilmemeli)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validasyon
    if (!formData.studentId) {
      error("Lütfen bir öğrenci seçin!")
      return
    }
    if (!formData.notes.trim()) {
      error("Görüşme notları boş bırakılamaz!")
      return
    }
    if (!formData.meetingDate) {
      error("Görüşme tarihi seçilmelidir!")
      return
    }

    setSubmitting(true)
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
        const isEdit = !!editingMeeting
        success(
          isEdit
            ? "Görüşme başarıyla güncellendi!"
            : "Görüşme başarıyla kaydedildi!"
        )
        await fetchMeetings()
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
      } else {
        const errorData = await response.json()
        error(errorData.error || "Görüşme kaydedilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error saving meeting:", err)
      error("Görüşme kaydedilirken bir hata oluştu!")
    } finally {
      setSubmitting(false)
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
    const meeting = meetings.find((m) => m.id === meetingId)
    const studentName = meeting
      ? `${meeting.student.firstName} ${meeting.student.lastName}`
      : ""

    if (
      !confirm(
        `"${studentName}" öğrencisi ile yapılan görüşmeyi silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`
      )
    ) {
      return
    }

    setDeletingId(meetingId)
    try {
      const response = await fetch(`/api/parent-meetings/${meetingId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        success("Görüşme başarıyla silindi!")
        await fetchMeetings()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Görüşme silinirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error deleting meeting:", err)
      error("Görüşme silinirken bir hata oluştu!")
    } finally {
      setDeletingId(null)
    }
  }

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    setFormData({ ...formData, studentId })
    setStudentSearchTerm("") // Arama terimini temizle ki dropdown kapansın
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
                    <div className="mt-2 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs sm:text-sm font-medium text-blue-900">
                        <span className="font-semibold">Seçilen Öğrenci:</span> {selectedStudent.firstName} {selectedStudent.lastName} - {selectedStudent.grade}
                      </p>
                    </div>
                  )}
                  {studentSearchTerm && filteredStudents.length === 0 && (
                    <div className="mt-2 p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-yellow-800">
                        Arama kriterinize uygun öğrenci bulunamadı.
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
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {editingMeeting ? "Güncelle" : "Kaydet"}
                      </>
                    )}
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
            <div className="text-center py-8 sm:py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500 text-xs sm:text-sm">Yükleniyor...</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-xs sm:text-sm font-medium">
                Henüz görüşme kaydı bulunmamaktadır.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Yeni görüşme eklemek için &quot;Yeni Görüşme Ekle&quot; butonuna tıklayın.
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
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
                          {meeting.counselorName && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                              <Users className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-purple-700">
                                {meeting.counselorName}
                              </span>
                            </div>
                          )}
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

                      {/* İşlem Butonları */}
                      <div className="flex sm:flex-col gap-2 flex-shrink-0 sm:pt-0 pt-2 border-t sm:border-t-0 border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(meeting)}
                          className="text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 flex-1 sm:flex-initial hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          <span>Düzenle</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(meeting.id)}
                          disabled={deletingId === meeting.id}
                          className="text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 flex-1 sm:flex-initial"
                        >
                          {deletingId === meeting.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                              <span>Siliniyor...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1.5" />
                              <span>Sil</span>
                            </>
                          )}
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
      </main>
    </div>
  )
}

