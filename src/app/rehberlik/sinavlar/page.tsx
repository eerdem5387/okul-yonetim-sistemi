"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/sidebar"
import { FileText, Plus, Calendar, TrendingUp, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"

const EXAM_ACCESS_ROLES = ["admin", "counselor", "head_counselor", "student_affairs"] as const

function canAccessExamPages(role: string | null): boolean {
  return role != null && (EXAM_ACCESS_ROLES as readonly string[]).includes(role)
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" }
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  CONFIGURED: "Yapılandırıldı",
  READY_FOR_SCAN: "Okutmaya hazır",
  SCANNING: "Okutuluyor",
  IN_REVIEW: "İncelemede",
  PUBLISHED: "Yayınlandı",
  ARCHIVED: "Arşiv",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIGURED: "bg-blue-100 text-blue-700",
  READY_FOR_SCAN: "bg-green-100 text-green-700",
  SCANNING: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-orange-100 text-orange-700",
  PUBLISHED: "bg-purple-100 text-purple-700",
  ARCHIVED: "bg-gray-200 text-gray-600",
}

interface Exam {
  id: string
  name: string
  examType: string
  examDate: string
  status: string
  grade: number | null
  classId: string | null
  class?: { id: string; name: string; grade: number; section: string }
  scanTemplate?: { label: string } | null
  _count?: { results: number; questions: number }
}

interface ClassOption {
  id: string
  name: string
  grade: number
  section: string
}

interface Template {
  id: string
  label: string
  questionCount: number
}

export default function RehberlikSinavlarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<Exam[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    examType: "DENEME",
    examDate: "",
    scope: "WHOLE_SCHOOL",
    grade: "",
    classId: "",
    description: "",
    scanTemplateId: "",
    expectedParticipantCount: "",
  })

  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const token = localStorage.getItem("auth_token")
      if (!token || !canAccessExamPages(role)) {
        router.push(token ? "/" : "/login")
        return
      }
      fetchExams()
      fetchClasses()
      fetchTemplates()
    }
  }, [router])

  const fetchExams = async () => {
    try {
      const response = await fetch("/api/exams", { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setExams(data.exams || [])
      }
    } catch (error) {
      console.error("Error fetching exams:", error)
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

  const fetchTemplates = async () => {
    const res = await fetch("/api/exam-scan-templates", { headers: getAuthHeaders() })
    if (res.ok) {
      const data = await res.json()
      setTemplates(data.templates ?? [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          scanTemplateId: formData.scanTemplateId || undefined,
          expectedParticipantCount: formData.expectedParticipantCount || undefined,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setShowForm(false)
        setFormData({
          name: "",
          examType: "DENEME",
          examDate: "",
          scope: "WHOLE_SCHOOL",
          grade: "",
          classId: "",
          description: "",
          scanTemplateId: "",
          expectedParticipantCount: "",
        })
        router.push(`/rehberlik/sinavlar/${data.exam.id}`)
      } else {
        const error = await response.json()
        alert(error.error || "Bir hata oluştu")
      }
    } catch (error) {
      console.error("Error creating exam:", error)
      alert("Sınav oluşturulurken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (exam: Exam) => {
    if (exam.status === "PUBLISHED") {
      alert("Yayınlanmış sınav silinemez.")
      return
    }
    const ok = confirm(
      `"${exam.name}" sınavını silmek istediğinize emin misiniz?\n\nBölümler, kazanımlar, sorular ve varsa okutma kayıtları da silinir.`
    )
    if (!ok) return

    setDeletingId(exam.id)
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Sınav silinemedi")
        return
      }
      setExams((prev) => prev.filter((e) => e.id !== exam.id))
    } catch (error) {
      console.error("Error deleting exam:", error)
      alert("Sınav silinirken bir hata oluştu")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && exams.length === 0) {
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
                <FileText className="h-8 w-8 text-purple-600" />
                Sınav Yönetimi
              </h1>
              <p className="text-gray-600 mt-1">Optik sınav tanımı, okutma ve analiz</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Sınav
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader><CardTitle>Yeni Sınav Oluştur</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Sınav Adı *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="examType">Sınav Tipi *</Label>
                      <select id="examType" value={formData.examType} onChange={(e) => setFormData({ ...formData, examType: e.target.value })} className="w-full p-2 border rounded-md" required>
                        <option value="DENEME">Deneme Sınavı</option>
                        <option value="YKS">YKS</option>
                        <option value="LGS">LGS</option>
                        <option value="KPSS">KPSS</option>
                        <option value="DIGER">Diğer</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="examDate">Sınav Tarihi *</Label>
                      <Input id="examDate" type="date" value={formData.examDate} onChange={(e) => setFormData({ ...formData, examDate: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scope">Sınav Kapsamı *</Label>
                      <select id="scope" value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value, grade: "", classId: "" })} className="w-full p-2 border rounded-md" required>
                        <option value="WHOLE_SCHOOL">Tüm Okul</option>
                        <option value="GRADE">Sınıf Seviyesi</option>
                        <option value="CLASS">Belirli Sınıf</option>
                      </select>
                    </div>
                  </div>
                  {formData.scope === "GRADE" && (
                    <div className="space-y-2">
                      <Label htmlFor="grade">Sınıf Seviyesi *</Label>
                      <select id="grade" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full p-2 border rounded-md" required>
                        <option value="">Seçiniz</option>
                        {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                          <option key={g} value={g}>{g}. Sınıf</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {formData.scope === "CLASS" && (
                    <div className="space-y-2">
                      <Label htmlFor="classId">Sınıf Seçin *</Label>
                      <select id="classId" value={formData.classId} onChange={(e) => {
                        const selectedClass = classes.find((c) => c.id === e.target.value)
                        setFormData({ ...formData, classId: e.target.value, grade: selectedClass ? selectedClass.grade.toString() : "" })
                      }} className="w-full p-2 border rounded-md" required>
                        <option value="">Seçiniz</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.name} ({cls.grade}/{cls.section})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scanTemplateId">Optik Şablon</Label>
                      <select id="scanTemplateId" value={formData.scanTemplateId} onChange={(e) => setFormData({ ...formData, scanTemplateId: e.target.value })} className="w-full p-2 border rounded-md">
                        <option value="">Sonra seç</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>{t.label} ({t.questionCount} soru)</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedParticipantCount">Beklenen Katılım</Label>
                      <Input id="expectedParticipantCount" type="number" value={formData.expectedParticipantCount} onChange={(e) => setFormData({ ...formData, expectedParticipantCount: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full min-h-[80px] p-3 border rounded-md" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>Oluştur</Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4">
            {exams.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz sınav oluşturulmadı</h3>
                </CardContent>
              </Card>
            ) : (
              exams.map((exam) => (
                <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{exam.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[exam.status] ?? ""}`}>
                            {STATUS_LABELS[exam.status] ?? exam.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="text-gray-600">{exam.examType}</span>
                          <span className="text-gray-600 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(exam.examDate).toLocaleDateString("tr-TR")}
                          </span>
                          {exam.class ? (
                            <span className="text-gray-600">{exam.class.name}</span>
                          ) : exam.grade ? (
                            <span className="text-gray-600">{exam.grade}. Sınıf</span>
                          ) : (
                            <span className="text-gray-600">Tüm Okul</span>
                          )}
                          {exam.scanTemplate && <span className="text-gray-600">{exam.scanTemplate.label}</span>}
                          <span className="text-purple-600 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {exam._count?.results ?? 0} Sonuç
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/rehberlik/sinavlar/${exam.id}`}>
                          <Button className="bg-purple-600 hover:bg-purple-700">Yönet</Button>
                        </Link>
                        {exam.status !== "PUBLISHED" && (
                          <Button
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            disabled={deletingId === exam.id}
                            onClick={() => void handleDelete(exam)}
                            title="Sınavı sil"
                          >
                            {deletingId === exam.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
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
