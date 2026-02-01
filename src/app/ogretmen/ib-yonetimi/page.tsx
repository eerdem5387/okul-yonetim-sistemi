"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Edit,
  Trash2,
  Filter,
  Search,
  Calendar,
  CheckCircle,
  Award,
  BarChart3,
  FileText,
  X,
  Save,
  Clock,
  MapPin,
  User,
  Upload,
  File,
  Loader2,
} from "lucide-react"

type ActivityType =
  | "ETKINLIK"
  | "GEZI"
  | "PROJE"
  | "SINAV"
  | "YARISMA"
  | "SEMINER"
  | "WORKSHOP"
  | "SPORT"
  | "SANAT"
  | "SOSYAL"
  | "DIL"
  | "BILIM"
  | "DEGER"
  | "DIGER"

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
}

interface Activity {
  id: string
  studentId: string
  type: ActivityType
  title: string
  description: string | null
  activityDate: string
  location: string | null
  organizer: string | null
  duration: number | null
  participants: number | null
  outcome: string | null
  evidence: string
  isVerified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
  }
}

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export default function OgretmenIbYonetimiPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [selectedType, setSelectedType] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [verificationFilter, setVerificationFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalActivities, setTotalActivities] = useState(0)

  const [formData, setFormData] = useState({
    studentIds: [""] as string[],
    type: "ETKINLIK" as ActivityType,
    title: "",
    description: "",
    activityDate: new Date().toISOString().split("T")[0],
    location: "",
    organizer: "",
    duration: "",
    participants: "",
    outcome: "",
    evidence: "",
    notes: "",
  })

  // Tekil studentId ile uyumluluk (düzenleme modu için) ve çoğul seçim state'i
  const handleStudentChange = (index: number, value: string) => {
    const newStudentIds = [...formData.studentIds]
    newStudentIds[index] = value
    setFormData({ ...formData, studentIds: newStudentIds })
  }

  const addStudentRow = () => {
    setFormData({ ...formData, studentIds: [...formData.studentIds, ""] })
  }

  const removeStudentRow = (index: number) => {
    const newStudentIds = formData.studentIds.filter((_, i) => i !== index)
    setFormData({ ...formData, studentIds: newStudentIds })
  }
  const [evidenceUrl, setEvidenceUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{
    name: string
    url: string
    size: number
  } | null>(null)

  const activityTypeLabels: Record<ActivityType, string> = {
    ETKINLIK: "Etkinlik",
    GEZI: "Gezi",
    PROJE: "Proje",
    SINAV: "Sınav",
    YARISMA: "Yarışma",
    SEMINER: "Seminer",
    WORKSHOP: "Workshop",
    SPORT: "Spor",
    SANAT: "Sanat",
    SOSYAL: "Sosyal Sorumluluk",
    DIL: "Dil Faaliyeti",
    BILIM: "Bilim",
    DEGER: "Değerler Eğitimi",
    DIGER: "Diğer",
  }

  // Yetki kontrolü
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const staffId = localStorage.getItem("staff_id")
      
      // Admin, principal, student_affairs, counselor için varsayılan erişim var
      if (role === "admin" || role === "principal" || role === "student_affairs" || role === "counselor") {
        setHasAccess(true)
        return
      }
      
      // Teacher için yetki kontrolü
      if (role === "teacher" && staffId) {
        fetch(`/api/staff/${staffId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.hasIbAccess) {
              setHasAccess(true)
            } else {
              setHasAccess(false)
              router.push("/ogretmen")
            }
          })
          .catch(() => {
            setHasAccess(false)
            router.push("/ogretmen")
          })
      } else {
        setHasAccess(false)
        router.push("/login")
      }
    }
  }, [router])

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
      })

      if (selectedStudent) params.append("studentId", selectedStudent)
      if (selectedType) params.append("type", selectedType)
      if (searchTerm) params.append("search", searchTerm)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      if (verificationFilter !== "all") params.append("isVerified", verificationFilter)

      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error("Failed to fetch activities")

      const data = await response.json()
      setActivities(data.activities || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalActivities(data.pagination?.total || 0)
    } catch (error) {
      console.error("Error fetching activities:", error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedStudent, selectedType, searchTerm, startDate, endDate, verificationFilter])

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students?limit=1000")
      if (!response.ok) throw new Error("Failed to fetch students")

      const data = await response.json()
      const studentsList = Array.isArray(data) ? data : data.students || []
      setStudents(studentsList)
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    }
  }, [])

  useEffect(() => {
    if (hasAccess === true) {
      fetchActivities()
      fetchStudents()
    }
  }, [hasAccess, fetchActivities, fetchStudents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Evidence kontrolü - URL veya dosya olmalı
    const finalEvidence = evidenceUrl.trim() || formData.evidence.trim()
    if (!finalEvidence) {
      alert("Lütfen bir dosya yükleyin veya kanıt linki girin!")
      return
    }

    try {
      const url = editingActivity ? `/api/activities/${editingActivity.id}` : "/api/activities"
      const method = editingActivity ? "PUT" : "POST"

      const payload: Record<string, unknown> = {
        studentIds: formData.studentIds.filter(id => id !== ""),
        type: formData.type,
        title: formData.title,
        description: formData.description,
        activityDate: formData.activityDate,
        location: formData.location,
        organizer: formData.organizer,
        duration: formData.duration ? parseInt(formData.duration.toString()) : null,
        participants: formData.participants ? parseInt(formData.participants.toString()) : null,
        outcome: formData.outcome,
        evidence: finalEvidence,
        notes: formData.notes,
      }

      // Tarih değişikliği koruması - PUT'ta activityDate göndermiyoruz
      if (editingActivity) {
        delete payload.activityDate
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        fetchActivities()
        setShowForm(false)
        setEditingActivity(null)
        setUploadedFile(null)
        setEvidenceUrl("")
        setFormData({
          studentIds: [""],
          type: "ETKINLIK",
          title: "",
          description: "",
          activityDate: new Date().toISOString().split("T")[0],
          location: "",
          organizer: "",
          duration: "",
          participants: "",
          outcome: "",
          evidence: "",
          notes: "",
        })
      } else {
        const error = await response.json()
        alert(error.error || "Faaliyet kaydedilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving activity:", error)
      alert("Faaliyet kaydedilirken hata oluştu!")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Dosya boyutu kontrolü (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert("Dosya boyutu 10MB&apos;dan büyük olamaz!")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const headers: HeadersInit = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      // FormData gönderilirken Content-Type header'ını manuel ayarlama
      // Browser otomatik olarak multipart/form-data ile boundary ekler
      const response = await fetch("/api/activities/upload", {
        method: "POST",
        headers,
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Dosya yüklenirken hata oluştu")
      }

      const data = await response.json()
      setUploadedFile({
        name: data.fileName,
        url: data.url,
        size: data.fileSize,
      })
      setFormData((prev) => ({
        ...prev,
        evidence: data.url,
      }))
      // Dosya yüklendiğinde URL alanını temizle
      setEvidenceUrl("")
    } catch (error) {
      console.error("Error uploading file:", error)
      alert(error instanceof Error ? error.message : "Dosya yüklenirken hata oluştu!")
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity)
    
    // Evidence'ın bir HTTP URL olup olmadığını kontrol et (dosya yolu değilse)
    const isHttpUrl = activity.evidence && 
      (activity.evidence.startsWith("http://") || activity.evidence.startsWith("https://")) &&
      !activity.evidence.includes("/api/activities/upload/") // Dosya yolu değilse
    
    if (isHttpUrl) {
      setEvidenceUrl(activity.evidence)
      setFormData({
        studentIds: [activity.studentId],
        type: activity.type,
        title: activity.title,
        description: activity.description || "",
        activityDate: activity.activityDate.split("T")[0], // Sadece görüntüleme için
        location: activity.location || "",
        organizer: activity.organizer || "",
        duration: activity.duration?.toString() || "",
        participants: activity.participants?.toString() || "",
        outcome: activity.outcome || "",
        evidence: "",
        notes: activity.notes || "",
      })
      setUploadedFile(null)
    } else {
      setEvidenceUrl("")
      setFormData({
        studentIds: [activity.studentId],
        type: activity.type,
        title: activity.title,
        description: activity.description || "",
        activityDate: activity.activityDate.split("T")[0], // Sadece görüntüleme için
        location: activity.location || "",
        organizer: activity.organizer || "",
        duration: activity.duration?.toString() || "",
        participants: activity.participants?.toString() || "",
        outcome: activity.outcome || "",
        evidence: activity.evidence || "",
        notes: activity.notes || "",
      })
      if (activity.evidence) {
        setUploadedFile({
          name: activity.evidence.split("/").pop() || "Dosya",
          url: activity.evidence,
          size: 0,
        })
      } else {
        setUploadedFile(null)
      }
    }
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu faaliyeti silmek istediğinizden emin misiniz?")) return

    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        fetchActivities()
      } else {
        alert("Faaliyet silinirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error deleting activity:", error)
      alert("Faaliyet silinirken hata oluştu!")
    }
  }


  const stats = useMemo(() => {
    const verified = activities.filter((a) => a.isVerified).length
    const unverified = activities.filter((a) => !a.isVerified).length
    const thisYear = activities.filter(
      (a) => new Date(a.activityDate).getFullYear() === new Date().getFullYear()
    ).length

    return {
      total: totalActivities,
      verified,
      unverified,
      thisYear,
    }
  }, [activities, totalActivities])

  const handleResetFilters = () => {
    setSelectedStudent("")
    setSelectedType("")
    setSearchTerm("")
    setStartDate("")
    setEndDate("")
    setVerificationFilter("all")
    setCurrentPage(1)
  }

  // Yetki kontrolü yapılıyor
  if (hasAccess === null) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Yükleniyor...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasAccess === false) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Erişim Reddedildi</p>
            <p className="text-sm text-gray-400 mt-2">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IB Faaliyet Yönetimi</h1>
          <p className="text-gray-600 mt-2">
            Öğrenci faaliyetlerini kayıt altına alın ve IB programı için hazırlayın
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setShowForm(true)
              setUploadedFile(null)
              setEvidenceUrl("")
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Faaliyet
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="card-soft border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Toplam Faaliyet</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Bu yıl: {stats.thisYear} faaliyet</p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Doğrulanmış</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.verified}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">IB görüntüleme için hazır</p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Bekleyen</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.unverified}</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Doğrulama bekliyor</p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Bu Yıl</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.thisYear}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <Award className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">{new Date().getFullYear()} faaliyetleri</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              Filtreleme
            </CardTitle>
            <CardDescription>Faaliyetleri öğrenci, tip, tarih ve duruma göre filtreleyin</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            Filtreleri Sıfırla
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500">Öğrenci</Label>
              <select
                value={selectedStudent}
                onChange={(e) => {
                  setSelectedStudent(e.target.value)
                  setCurrentPage(1)
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Tüm öğrenciler</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} - {student.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500">Faaliyet Tipi</Label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value)
                  setCurrentPage(1)
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Tüm tipler</option>
                {Object.entries(activityTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500">Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500">Bitiş Tarihi</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500">Doğrulama Durumu</Label>
              <select
                value={verificationFilter}
                onChange={(e) => {
                  setVerificationFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">Tümü</option>
                <option value="true">Doğrulanmış</option>
                <option value="false">Bekleyen</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-gray-500">Arama</Label>
            <div className="mt-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Başlık, açıklama veya konum ara..."
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Faaliyet Listesi ({totalActivities})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <Card key={activity.id} className="card-soft border-0">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-bold text-gray-900">{activity.title}</h3>
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                {activityTypeLabels[activity.type]}
                              </span>
                              {activity.isVerified ? (
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Doğrulanmış
                                </span>
                              ) : (
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Bekliyor
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>
                                  {activity.student.firstName} {activity.student.lastName} - {activity.student.grade}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(activity.activityDate).toLocaleDateString("tr-TR")}</span>
                              </div>
                              {activity.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{activity.location}</span>
                                </div>
                              )}
                              {activity.description && (
                                <p className="text-gray-700 mt-2">{activity.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(activity)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(activity.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Filtrelere uygun faaliyet bulunamadı</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingActivity ? "Faaliyet Düzenle" : "Yeni Faaliyet Ekle"}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Students Selection */}
                <div>
                  <Label>Öğrenciler</Label>
                  <div className="space-y-2 mt-2">
                    {formData.studentIds.map((studentId, index) => (
                      <div key={index} className="flex gap-2">
                        <select
                          value={studentId}
                          onChange={(e) => handleStudentChange(index, e.target.value)}
                          disabled={!!editingActivity} // Düzenleme modunda öğrenci değiştirilemez
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">Öğrenci Seçin...</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.firstName} {student.lastName} - {student.grade}
                            </option>
                          ))}
                        </select>
                        {!editingActivity && formData.studentIds.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeStudentRow(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!editingActivity && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStudentRow}
                      className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Öğrenci Ekle
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor="type">Faaliyet Tipi *</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ActivityType })}
                    required
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {Object.entries(activityTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Başlık *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Açıklama</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="activityDate">
                    Faaliyet Tarihi * {editingActivity && <span className="text-xs text-orange-600">(Değiştirilemez)</span>}
                  </Label>
                  <Input
                    id="activityDate"
                    type="date"
                    value={formData.activityDate}
                    onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })}
                    required
                    disabled={!!editingActivity}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Konum</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="organizer">Organizatör</Label>
                  <Input
                    id="organizer"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <Label htmlFor="duration">Süre (dakika)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="participants">Katılımcı Sayısı</Label>
                    <Input
                      id="participants"
                      type="number"
                      value={formData.participants}
                      onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="outcome">Sonuç/Kazanım</Label>
                <textarea
                  id="outcome"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <Label htmlFor="evidence">Kanıt *</Label>
                <div className="mt-2 space-y-3">
                  {/* Dosya Yükleme */}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="p-3 rounded-full bg-blue-50">
                        {uploading ? (
                          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div className="text-center">
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <File className="h-4 w-4" />
                          {uploading ? "Yükleniyor..." : "Dosya Seç"}
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.txt"
                        />
                      </div>
                      {uploadedFile && (
                        <div className="w-full max-w-md">
                          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <a
                                  href={uploadedFile.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-emerald-900 truncate hover:underline block"
                                >
                                  {uploadedFile.name}
                                </a>
                                <p className="text-xs text-emerald-600">
                                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUploadedFile(null)
                                setFormData((prev) => ({ ...prev, evidence: "" }))
                              }}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manuel URL/Link Girişi */}
                  <div>
                    <Label htmlFor="evidence-url" className="text-sm text-gray-600">
                      Veya kanıt linki/URL girin (YouTube, Instagram, vb.)
                    </Label>
                    <Input
                      id="evidence-url"
                      type="url"
                      value={evidenceUrl}
                      onChange={(e) => {
                        setEvidenceUrl(e.target.value)
                        // URL girildiğinde dosya yüklemesini temizle
                        if (e.target.value.trim()) {
                          setUploadedFile(null)
                          setFormData((prev) => ({ ...prev, evidence: "" }))
                        }
                      }}
                      placeholder="https://youtube.com/watch?v=... veya https://instagram.com/p/..."
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Öğrencinin faaliyetiyle ilgili görsel veya videolu kanıt varsa buraya link girebilirsiniz.
                    </p>
                  </div>

                  {/* Bilgilendirme */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Desteklenen Dosya Tipleri:</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
                      <div>• PDF (.pdf)</div>
                      <div>• Word (.doc, .docx)</div>
                      <div>• Excel (.xls, .xlsx)</div>
                      <div>• PowerPoint (.ppt, .pptx)</div>
                      <div>• Resim (.jpg, .png, .gif, .webp)</div>
                      <div>• Video (.mp4, .mov)</div>
                      <div>• Metin (.txt)</div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      <span className="font-semibold">Maksimum dosya boyutu:</span> 10 MB
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notlar</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingActivity ? "Güncelle" : "Kaydet"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingActivity(null)
                    setUploadedFile(null)
                    setEvidenceUrl("")
                    setFormData({
                      studentIds: [""],
                      type: "ETKINLIK",
                      title: "",
                      description: "",
                      activityDate: new Date().toISOString().split("T")[0],
                      location: "",
                      organizer: "",
                      duration: "",
                      participants: "",
                      outcome: "",
                      evidence: "",
                      notes: "",
                    })
                  }}
                >
                  İptal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

