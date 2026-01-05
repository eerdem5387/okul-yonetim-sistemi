"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageSquare, Plus, Calendar, ThumbsUp, ThumbsDown, Loader2, Edit, Trash2, Users } from "lucide-react"

interface StudentComment {
  id: string
  commentType: string
  category: string | null
  content: string
  isPositive: boolean
  createdAt: string
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
  }
}

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
}

export default function OgretmenGoruslerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<StudentComment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [staffId, setStaffId] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    studentId: "",
    commentType: "ACADEMIC",
    content: "",
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffId(id)
      fetchComments(id)
      fetchClasses(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Sınıf değiştiğinde öğrencileri getir
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId)
    } else {
      setStudents([])
      setFormData({ ...formData, studentId: "" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId])

  const fetchComments = async (id: string) => {
    try {
      const response = await fetch(`/api/student-comments?staffId=${id}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setLoading(false)
    }
  }

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

  const fetchStudents = async (classId: string) => {
    setLoadingStudents(true)
    try {
      const response = await fetch(`/api/classes/${classId}/students`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingId
        ? `/api/student-comments/${editingId}`
        : "/api/student-comments"
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: formData.studentId,
          commentType: formData.commentType,
          content: formData.content,
          staffId,
        }),
      })

      if (response.ok) {
        alert(editingId ? "Görüş güncellendi!" : "Görüş başarıyla oluşturuldu!")
        setShowForm(false)
        setEditingId(null)
        setSelectedClassId("")
        setStudents([])
        setFormData({
          studentId: "",
          commentType: "ACADEMIC",
          content: "",
        })
        fetchComments(staffId)
      } else {
        const error = await response.json()
        alert(error.error || "Bir hata oluştu")
      }
    } catch (error) {
      console.error("Error saving comment:", error)
      alert("Görüş kaydedilirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (comment: StudentComment) => {
    setEditingId(comment.id)
    setFormData({
      studentId: comment.student.id,
      commentType: comment.commentType,
      content: comment.content,
    })
    // Düzenleme modunda sınıf seçimini atla (öğrenci zaten seçili)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu görüşü silmek istediğinize emin misiniz?")) return

    try {
      const response = await fetch(`/api/student-comments/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("Görüş silindi!")
        fetchComments(staffId)
      } else {
        alert("Görüş silinirken bir hata oluştu")
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
      alert("Görüş silinirken bir hata oluştu")
    }
  }

  const getCommentTypeLabel = (type: string) => {
    switch (type) {
      case "ACADEMIC":
        return "📚 Akademik"
      case "BEHAVIORAL":
        return "🤝 Davranışsal"
      case "GENERAL":
        return "💬 Genel"
      default:
        return type
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
                  <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8" />
                  Öğrenci Görüşleri
                </h1>
                <p className="text-blue-100 text-sm sm:text-base">Öğrencileriniz hakkında akademik ve bireysel gelişim görüşleri ekleyin</p>
              </div>
              <Button
                onClick={() => {
                  setEditingId(null)
                  setSelectedClassId("")
                  setStudents([])
                  setFormData({
                    studentId: "",
                    commentType: "ACADEMIC",
                    content: "",
                  })
                  setShowForm(!showForm)
                }}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Yeni Görüş Ekle
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Görüş Düzenle" : "Yeni Görüş Ekle"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Sınıf Seçimi */}
                  <div className="space-y-2">
                    <Label htmlFor="classId">Sınıf *</Label>
                    <select
                      id="classId"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      required={!editingId}
                      disabled={!!editingId}
                    >
                      <option value="">Sınıf Seçin</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {editingId && (
                      <p className="text-xs text-gray-500">Düzenleme modunda sınıf değiştirilemez</p>
                    )}
                  </div>

                  {/* Öğrenci Seçimi */}
                  {selectedClassId && (
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Öğrenci *</Label>
                      {loadingStudents ? (
                        <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-sm flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Öğrenciler yükleniyor...
                        </div>
                      ) : students.length > 0 ? (
                        <select
                          id="studentId"
                          value={formData.studentId}
                          onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                          className="w-full p-2 border rounded-md"
                          required
                        >
                          <option value="">Öğrenci Seçin</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.firstName} {student.lastName}
                              {student.grade && ` (${student.grade})`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-sm">
                          Bu sınıfta öğrenci bulunmamaktadır.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Görüş Tipi ve İçerik */}
                  {formData.studentId && (
                    <>
                    <div className="space-y-2">
                      <Label htmlFor="commentType">Görüş Tipi *</Label>
                      <select
                        id="commentType"
                        value={formData.commentType}
                        onChange={(e) => setFormData({ ...formData, commentType: e.target.value })}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="ACADEMIC">📚 Akademik</option>
                        <option value="BEHAVIORAL">🤝 Davranışsal</option>
                        <option value="GENERAL">💬 Genel</option>
                      </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Görüş İçeriği *</Label>
                    <textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Öğrenci hakkındaki görüşünüzü yazın..."
                      className="w-full min-h-[120px] p-3 border rounded-md"
                      required
                    />
                  </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {editingId ? "Güncelle" : "Kaydet"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setEditingId(null)
                        setSelectedClassId("")
                        setStudents([])
                        setFormData({
                          studentId: "",
                          commentType: "ACADEMIC",
                          content: "",
                        })
                      }}
                    >
                      İptal
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4">
            {comments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Henüz görüş eklenmedi
                  </h3>
                  <p className="text-gray-600">
                    &quot;Yeni Görüş&quot; butonuna tıklayarak öğrencileriniz hakkında görüş ekleyebilirsiniz
                  </p>
                </CardContent>
              </Card>
            ) : (
              comments.map((comment) => (
                <Card
                  key={comment.id}
                  className={`hover:shadow-lg transition-shadow ${
                    comment.isPositive ? "border-l-4 border-l-green-500" : "border-l-4 border-l-orange-500"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {comment.student.firstName} {comment.student.lastName}
                          </h3>
                          <span className="text-sm text-gray-600">
                            ({comment.student.grade})
                          </span>
                          {comment.isPositive ? (
                            <ThumbsUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <ThumbsDown className="h-5 w-5 text-orange-600" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                            {getCommentTypeLabel(comment.commentType)}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {new Date(comment.createdAt).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(comment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
    </div>
  )
}

