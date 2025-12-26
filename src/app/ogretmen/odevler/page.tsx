"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Plus, Calendar, Users, CheckCircle, XCircle, Loader2 } from "lucide-react"

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
    student: {
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    subject: "",
    classId: "",
  })
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
      fetchHomeworks(id)
      fetchClasses()
    }
  }, [router])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          teacherId: staffId,
        }),
      })

      if (response.ok) {
        alert("Ödev başarıyla oluşturuldu!")
        setShowForm(false)
        setFormData({
          title: "",
          description: "",
          dueDate: "",
          subject: "",
          classId: "",
        })
        fetchHomeworks(staffId)
      } else {
        const error = await response.json()
        alert(error.error || "Bir hata oluştu")
      }
    } catch (error) {
      console.error("Error creating homework:", error)
      alert("Ödev oluşturulurken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const getCompletionStats = (homework: Homework) => {
    const total = homework.assignments.length
    const completed = homework.assignments.filter((a) => a.isCompleted).length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percentage }
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
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
                  <BookOpen className="h-7 w-7 sm:h-8 sm:w-8" />
                  Ödev Yönetimi
                </h1>
                <p className="text-blue-100 text-sm sm:text-base">Verdiğiniz ödevleri yönetin ve öğrenci tamamlama durumlarını takip edin</p>
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Yeni Ödev Oluştur
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* Yeni Ödev Formu */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Yeni Ödev Oluştur</CardTitle>
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
                      <Label htmlFor="classId">Sınıf *</Label>
                      <select
                        id="classId"
                        value={formData.classId}
                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
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
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      Oluştur
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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
                    "Yeni Ödev" butonuna tıklayarak ödev oluşturabilirsiniz
                  </p>
                </CardContent>
              </Card>
            ) : (
              homeworks.map((homework) => {
                const stats = getCompletionStats(homework)
                const isOverdue = new Date(homework.dueDate) < new Date() && stats.percentage < 100
                return (
                  <Card key={homework.id} className={`hover:shadow-xl transition-all duration-200 border-l-4 ${
                    stats.percentage === 100 
                      ? "border-l-green-500 bg-gradient-to-r from-green-50/50 to-white" 
                      : isOverdue
                      ? "border-l-red-500 bg-gradient-to-r from-red-50/50 to-white"
                      : "border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-white"
                  }`}>
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
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 truncate">
                                {homework.title}
                              </h3>
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
    </div>
  )
}

