"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/sidebar"
import { MessageSquare, Plus, Calendar, ThumbsUp, ThumbsDown, Loader2, Edit, Trash2 } from "lucide-react"

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

export default function RehberlikGoruslerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<StudentComment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [staffId, setStaffId] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    studentId: "",
    commentType: "GENERAL",
    category: "",
    content: "",
    isPositive: true,
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")

      if (role !== "counselor" || !id) {
        router.push("/login")
        return
      }

      setStaffId(id)
      fetchComments(id)
      fetchStudents()
    }
  }, [router])

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

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students/public")
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
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
          ...formData,
          staffId,
        }),
      })

      if (response.ok) {
        alert(editingId ? "Görüş güncellendi!" : "Görüş başarıyla oluşturuldu!")
        setShowForm(false)
        setEditingId(null)
        setFormData({
          studentId: "",
          commentType: "GENERAL",
          category: "",
          content: "",
          isPositive: true,
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
      category: comment.category || "",
      content: comment.content,
      isPositive: comment.isPositive,
    })
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
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-purple-600" />
                Öğrenci Görüşleri
              </h1>
              <p className="text-gray-600 mt-1">Öğrenciler hakkında rehberlik görüşü ekleyin</p>
            </div>
            <Button
              onClick={() => {
                setEditingId(null)
                setFormData({
                  studentId: "",
                  commentType: "GENERAL",
                  category: "",
                  content: "",
                  isPositive: true,
                })
                setShowForm(!showForm)
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Görüş
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Görüş Düzenle" : "Yeni Görüş Ekle"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Öğrenci *</Label>
                      <select
                        id="studentId"
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        className="w-full p-2 border rounded-md"
                        required
                        disabled={!!editingId}
                      >
                        <option value="">Seçiniz</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.firstName} {student.lastName} ({student.grade})
                          </option>
                        ))}
                      </select>
                    </div>
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori (Alan)</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Örn: Sosyal Gelişim, Kariyer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isPositive">Değerlendirme *</Label>
                      <select
                        id="isPositive"
                        value={formData.isPositive.toString()}
                        onChange={(e) => setFormData({ ...formData, isPositive: e.target.value === "true" })}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="true">👍 Olumlu</option>
                        <option value="false">👎 Gelişmeli</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Görüş İçeriği *</Label>
                    <textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Öğrenci hakkındaki rehberlik görüşünüzü yazın..."
                      className="w-full min-h-[120px] p-3 border rounded-md"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                      {editingId ? "Güncelle" : "Kaydet"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setEditingId(null)
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
                    &quot;Yeni Görüş&quot; butonuna tıklayarak öğrenciler hakkında görüş ekleyebilirsiniz
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
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                            {getCommentTypeLabel(comment.commentType)}
                          </span>
                          {comment.category && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                              {comment.category}
                            </span>
                          )}
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
    </div>
  )
}

