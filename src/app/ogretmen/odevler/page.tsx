"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Plus, Calendar, Users, CheckCircle, XCircle, Loader2, Edit, Trash2, X, Clock } from "lucide-react"

interface Homework {
  id: string
  title: string
  description: string
  dueDate: string
  subject?: string
  teacher: {
    firstName: string
    lastName: string
  }
  class?: {
    name: string
  }
  assignments: Array<{
    id: string
    isCompleted: boolean
    completedAt: string | null
    completedBy: string | null
    student: {
      id: string
      firstName: string
      lastName: string
    }
  }>
}

export default function TeacherHomeworkPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [staffId, setStaffId] = useState("")
  
  // Yeni ödev formu
  const [showForm, setShowForm] = useState(false)
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    subject: "",
    classId: "",
  })
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [assignToAllClass, setAssignToAllClass] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [deletingHomeworkId, setDeletingHomeworkId] = useState<string | null>(null)
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [updatingAssignmentId, setUpdatingAssignmentId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffId(id)
      fetchHomeworks(id)
      fetchClasses(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Sınıf değiştiğinde öğrencileri getir
  useEffect(() => {
    if (formData.classId) {
      fetchStudents(formData.classId)
    } else {
      setStudents([])
      setSelectedStudentIds([])
    }
  }, [formData.classId])

  const fetchHomeworks = async (teacherId: string) => {
    try {
      const response = await fetch(`/api/homework?teacherId=${teacherId}`)
      if (response.ok) {
        const data = await response.json()
        setHomeworks(data.homeworks || [])
      }
    } catch (error) {
      console.error("Error fetching homeworks:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async (teacherId: string) => {
    try {
      // Öğretmenin atandığı sınıfları getir
      const response = await fetch(`/api/teachers/${teacherId}/classes`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        // Fallback: Eğer API yoksa boş liste
        setClasses([])
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      setClasses([])
    }
  }

  const fetchStudents = async (classId: string) => {
    setLoadingStudents(true)
    try {
      const response = await fetch(`/api/classes/${classId}/students`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
        // Tüm sınıf seçiliyse, tüm öğrencileri seç
        if (assignToAllClass) {
          setSelectedStudentIds(data.students?.map((s: { id: string }) => s.id) || [])
        }
      } else {
        setStudents([])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleEdit = async (homeworkId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/homework/${homeworkId}`)
      if (response.ok) {
        const data = await response.json()
        const homework = data.homework
        
        // Form verilerini doldur
        setFormData({
          title: homework.title,
          description: homework.description,
          dueDate: new Date(homework.dueDate).toISOString().split('T')[0],
          subject: homework.subject || "",
          classId: homework.classId || "",
        })
        
        setEditingHomeworkId(homeworkId)
        
        // Düzenleme modunda öğrenci seçimini göstermiyoruz
        setStudents([])
        setSelectedStudentIds([])
        setAssignToAllClass(true)
        
        setShowForm(true)
      } else {
        alert("Ödev bilgileri yüklenirken bir hata oluştu")
      }
    } catch (error) {
      console.error("Error loading homework:", error)
      alert("Ödev yüklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (homeworkId: string) => {
    if (!confirm("Bu ödevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      return
    }

    setDeletingHomeworkId(homeworkId)
    try {
      const response = await fetch(`/api/homework/${homeworkId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("Ödev başarıyla silindi!")
        fetchHomeworks(staffId)
      } else {
        const error = await response.json()
        alert(error.error || "Ödev silinirken bir hata oluştu")
      }
    } catch (error) {
      console.error("Error deleting homework:", error)
      alert("Ödev silinirken bir hata oluştu")
    } finally {
      setDeletingHomeworkId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingHomeworkId) {
        // Düzenleme
        const response = await fetch(`/api/homework/${editingHomeworkId}`, {
          method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            dueDate: formData.dueDate,
            subject: formData.subject,
          }),
        })

        if (response.ok) {
          alert("Ödev başarıyla güncellendi!")
          setShowForm(false)
          setEditingHomeworkId(null)
          resetForm()
          fetchHomeworks(staffId)
        } else {
          const error = await response.json()
          alert(error.error || "Bir hata oluştu")
        }
      } else {
        // Yeni ödev oluşturma
        const requestBody: {
          title: string
          description: string
          dueDate: string
          subject: string
          teacherId: string
          classId?: string
          studentIds?: string[]
        } = {
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          subject: formData.subject,
          teacherId: staffId,
        }

        // Eğer "Tüm sınıf" seçiliyse, classId gönder
        // Değilse, seçilen öğrenci ID'lerini gönder
        if (assignToAllClass && formData.classId) {
          requestBody.classId = formData.classId
        } else if (selectedStudentIds.length > 0) {
          requestBody.studentIds = selectedStudentIds
        } else {
          alert("Lütfen en az bir öğrenci seçin veya 'Tüm sınıf' seçeneğini işaretleyin")
          setLoading(false)
          return
        }

        const response = await fetch("/api/homework", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        alert("Ödev başarıyla oluşturuldu!")
        setShowForm(false)
          resetForm()
        fetchHomeworks(staffId)
      } else {
        const error = await response.json()
        alert(error.error || "Bir hata oluştu")
        }
      }
    } catch (error) {
      console.error("Error saving homework:", error)
      alert("Ödev kaydedilirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      dueDate: "",
      subject: "",
      classId: "",
    })
    setStudents([])
    setSelectedStudentIds([])
    setAssignToAllClass(true)
    setEditingHomeworkId(null)
  }

  const handleStudentToggle = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId))
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId])
    }
  }

  const handleAssignToAllChange = (checked: boolean) => {
    setAssignToAllClass(checked)
    if (checked && students.length > 0) {
      // Tüm öğrencileri seç
      setSelectedStudentIds(students.map(s => s.id))
    }
  }

  const getCompletionStats = (homework: Homework) => {
    const total = homework.assignments.length
    const completed = homework.assignments.filter((a) => a.isCompleted).length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percentage }
  }

  const handleHomeworkClick = (homework: Homework) => {
    setSelectedHomework(homework)
  }

  const handleToggleCompletion = async (assignmentId: string, studentId: string, isCompleted: boolean) => {
    if (!selectedHomework) return

    setUpdatingAssignmentId(assignmentId)
    try {
      const response = await fetch(`/api/homework/${selectedHomework.id}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          isCompleted,
          completedBy: staffId,
        }),
      })

      if (response.ok) {
        // Ödev listesini güncelle
        await fetchHomeworks(staffId)
        // Modal'daki ödevi de güncelle
        const updatedResponse = await fetch(`/api/homework/${selectedHomework.id}`)
        if (updatedResponse.ok) {
          const data = await updatedResponse.json()
          setSelectedHomework(data.homework)
        }
      } else {
        const error = await response.json()
        alert(error.error || "Durum güncellenirken bir hata oluştu")
      }
    } catch (error) {
      console.error("Error updating completion:", error)
      alert("Durum güncellenirken bir hata oluştu")
    } finally {
      setUpdatingAssignmentId(null)
    }
  }

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
                  <BookOpen className="h-7 w-7 sm:h-8 sm:w-8" />
                  Ödev Yönetimi
                </h1>
                <p className="text-blue-100 text-sm sm:text-base">Verdiğiniz ödevleri yönetin ve öğrenci tamamlama durumlarını takip edin</p>
              </div>
              <Button
                onClick={() => {
                  if (showForm && editingHomeworkId) {
                    resetForm()
                    setShowForm(false)
                  } else {
                    setShowForm(!showForm)
                  }
                }}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                {showForm && editingHomeworkId ? "İptal" : "Yeni Ödev Oluştur"}
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* Yeni Ödev Formu */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingHomeworkId ? "Ödevi Düzenle" : "Yeni Ödev Oluştur"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Başlık *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Örn: Matematik Problemleri"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Ders</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Örn: Matematik"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama *</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ödev detaylarını yazın..."
                      className="w-full min-h-[100px] p-3 border rounded-md"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Teslim Tarihi *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="classId">Sınıf {!editingHomeworkId && "*"}</Label>
                      <select
                        id="classId"
                        value={formData.classId}
                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                        className="w-full p-2 border rounded-md"
                        disabled={!!editingHomeworkId}
                        required={!editingHomeworkId}
                      >
                        <option value="">Sınıf Seçin</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {editingHomeworkId && (
                        <p className="text-xs text-gray-500">Düzenleme modunda sınıf ve öğrenci seçimi değiştirilemez</p>
                      )}
                    </div>
                  </div>

                  {/* Öğrenci Seçimi */}
                  {formData.classId && !editingHomeworkId && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="assignToAll"
                          checked={assignToAllClass}
                          onChange={(e) => handleAssignToAllChange(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <Label htmlFor="assignToAll" className="font-semibold cursor-pointer">
                          Tüm Sınıf
                        </Label>
                      </div>

                      {loadingStudents ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                          <span className="ml-2 text-gray-600">Öğrenciler yükleniyor...</span>
                        </div>
                      ) : students.length > 0 ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Öğrenci Seçimi {!assignToAllClass && "(En az bir öğrenci seçmelisiniz)"}
                          </Label>
                          <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-gray-50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {students.map((student) => (
                                <label
                                  key={student.id}
                                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                    selectedStudentIds.includes(student.id)
                                      ? "bg-blue-100 border-2 border-blue-500"
                                      : "bg-white border-2 border-gray-200 hover:bg-gray-50"
                                  } ${assignToAllClass ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedStudentIds.includes(student.id)}
                                    onChange={() => handleStudentToggle(student.id)}
                                    disabled={assignToAllClass}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium">
                                    {student.firstName} {student.lastName}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          {!assignToAllClass && (
                            <p className="text-xs text-gray-500">
                              Seçilen öğrenci sayısı: {selectedStudentIds.length} / {students.length}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          Bu sınıfta öğrenci bulunmamaktadır.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading || (!editingHomeworkId && !!formData.classId && !assignToAllClass && selectedStudentIds.length === 0)}>
                      {editingHomeworkId ? "Güncelle" : "Oluştur"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}>
                      İptal
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Ödev Listesi */}
          <div className="grid grid-cols-1 gap-4">
            {homeworks.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Henüz ödev vermediniz
                  </h3>
                  <p className="text-gray-600">
                    &quot;Yeni Ödev&quot; butonuna tıklayarak ödev oluşturabilirsiniz
                  </p>
                </CardContent>
              </Card>
            ) : (
              homeworks.map((homework) => {
                const stats = getCompletionStats(homework)
                const isOverdue = new Date(homework.dueDate) < new Date() && stats.percentage < 100
                return (
                  <Card 
                  key={homework.id} 
                  className={`hover:shadow-xl transition-all duration-200 border-l-4 cursor-pointer ${
                    stats.percentage === 100 
                      ? "border-l-green-500 bg-gradient-to-r from-green-50/50 to-white" 
                      : isOverdue
                      ? "border-l-red-500 bg-gradient-to-r from-red-50/50 to-white"
                      : "border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-white"
                  }`}
                  onClick={() => handleHomeworkClick(homework)}
                >
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              stats.percentage === 100 
                                ? "bg-green-100" 
                                : isOverdue
                                ? "bg-red-100"
                                : "bg-blue-100"
                            }`}>
                              <BookOpen className={`h-6 w-6 ${
                                stats.percentage === 100 
                                  ? "text-green-600" 
                                  : isOverdue
                                  ? "text-red-600"
                                  : "text-blue-600"
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex-1">
                                {homework.title}
                              </h3>
                                <div className="flex gap-2 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(homework.id)}
                                    className="h-8 w-8 p-0 hover:bg-blue-100"
                                    title="Düzenle"
                                  >
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(homework.id)}
                                    disabled={deletingHomeworkId === homework.id}
                                    className="h-8 w-8 p-0 hover:bg-red-100"
                                    title="Sil"
                                  >
                                    {deletingHomeworkId === homework.id ? (
                                      <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{homework.description}</p>
                              <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                                {homework.subject && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                    📚 {homework.subject}
                                  </span>
                                )}
                                {homework.class && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                                    <Users className="h-3.5 w-3.5" />
                                    {homework.class.name}
                                  </span>
                                )}
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                                  isOverdue 
                                    ? "bg-red-100 text-red-700" 
                                    : "bg-gray-100 text-gray-700"
                                }`}>
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(homework.dueDate).toLocaleDateString("tr-TR")}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* İlerleme Çubuğu */}
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <span className="text-gray-600 font-medium">Tamamlanma Durumu</span>
                              <span className={`font-bold ${
                                stats.percentage === 100 
                                  ? "text-green-600" 
                                  : isOverdue
                                  ? "text-red-600"
                                  : "text-blue-600"
                              }`}>
                                {stats.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  stats.percentage === 100 
                                    ? "bg-green-500" 
                                    : isOverdue
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                                }`}
                                style={{ width: `${stats.percentage}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                {stats.completed} tamamlandı
                              </span>
                              <span className="flex items-center gap-1.5">
                                <XCircle className="h-3.5 w-3.5 text-red-600" />
                                {stats.total - stats.completed} bekliyor
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>

        {/* Ödev Detay Modal - Öğrenci Listesi */}
        {selectedHomework && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedHomework(null)}>
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{selectedHomework.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      {selectedHomework.subject && (
                        <span>📚 {selectedHomework.subject}</span>
                      )}
                      {selectedHomework.class && (
                        <span>👥 {selectedHomework.class.name}</span>
                      )}
                      <span>📅 Teslim: {new Date(selectedHomework.dueDate).toLocaleDateString("tr-TR")}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{selectedHomework.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedHomework(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Öğrenci Tamamlama Durumu</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {selectedHomework.assignments.filter(a => a.isCompleted).length} Tamamlandı
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      {selectedHomework.assignments.filter(a => !a.isCompleted).length} Bekliyor
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedHomework.assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Bu ödeve atanmış öğrenci bulunmamaktadır.
                    </div>
                  ) : (
                    selectedHomework.assignments.map((assignment) => {
                      // İşlem yapılmış mı kontrolü: completedBy null değilse öğretmen bir işlem yapmış demektir
                      const hasAction = assignment.completedBy !== null
                      return (
                        <div
                          key={assignment.id}
                          className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors ${
                            assignment.isCompleted
                              ? "bg-green-50 border-green-200"
                              : hasAction
                              ? "bg-red-50 border-red-200"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              assignment.isCompleted 
                                ? "bg-green-100" 
                                : hasAction
                                ? "bg-red-100"
                                : "bg-gray-100"
                            }`}>
                              {assignment.isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : hasAction ? (
                                <XCircle className="h-5 w-5 text-red-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {assignment.student.firstName} {assignment.student.lastName}
                              </p>
                              {assignment.isCompleted && assignment.completedAt && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Tamamlandı: {new Date(assignment.completedAt).toLocaleDateString("tr-TR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              )}
                              {!hasAction && (
                                <p className="text-xs text-gray-400 mt-1 italic">(İşlem yapılmadı)</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant={assignment.isCompleted ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleToggleCompletion(assignment.id, assignment.student.id, true)}
                              disabled={updatingAssignmentId === assignment.id}
                              className={assignment.isCompleted 
                                ? "bg-green-600 text-white border-green-700 hover:bg-green-700 font-semibold" 
                                : "bg-white text-gray-600 border-gray-300 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                              }
                            >
                              {updatingAssignmentId === assignment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Tamamlandı
                                </>
                              )}
                            </Button>
                            <Button
                              variant={!assignment.isCompleted && hasAction ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleToggleCompletion(assignment.id, assignment.student.id, false)}
                              disabled={updatingAssignmentId === assignment.id}
                              className={!assignment.isCompleted && hasAction
                                ? "bg-red-600 text-white border-red-700 hover:bg-red-700 font-semibold" 
                                : "bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                              }
                            >
                              {updatingAssignmentId === assignment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Tamamlanmadı
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  )
}

