"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Award,
  LogOut,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Download,
  CheckCircle,
  MapPin,
  Clock,
  X,
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
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    birthDate: string
  }
}

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

export default function IBViewerPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [viewerName, setViewerName] = useState("")

  useEffect(() => {
    // Auth kontrolü
    const token = localStorage.getItem("ib_viewer_token")
    const name = localStorage.getItem("ib_viewer_name")

    if (!token) {
      router.push("/ib-viewer/login")
      return
    }

    setViewerName(name || "IB Viewer")
  }, [router])

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (selectedStudent) params.append("studentId", selectedStudent)
      if (selectedType) params.append("type", selectedType)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const response = await fetch(`/api/ib/activities?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/ib-viewer/login")
          return
        }
        throw new Error("Failed to fetch activities")
      }

      const data = await response.json()
      setActivities(data || [])
    } catch (error) {
      console.error("Error fetching activities:", error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [selectedStudent, selectedType, startDate, endDate, router])

  useEffect(() => {
    const token = localStorage.getItem("ib_viewer_token")
    if (token) {
      fetchActivities()
    }
  }, [fetchActivities])

  const handleLogout = () => {
    localStorage.removeItem("ib_viewer_token")
    localStorage.removeItem("ib_viewer_id")
    localStorage.removeItem("ib_viewer_name")
    router.push("/ib-viewer/login")
  }

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch =
          activity.title.toLowerCase().includes(search) ||
          activity.description?.toLowerCase().includes(search) ||
          `${activity.student.firstName} ${activity.student.lastName}`.toLowerCase().includes(search) ||
          activity.student.grade.toLowerCase().includes(search)

        if (!matchesSearch) return false
      }

      return true
    })
  }, [activities, searchTerm])

  const uniqueStudents = useMemo(() => {
    const students = new Map<string, { id: string; name: string; grade: string }>()
    activities.forEach((activity) => {
      if (!students.has(activity.studentId)) {
        students.set(activity.studentId, {
          id: activity.studentId,
          name: `${activity.student.firstName} ${activity.student.lastName}`,
          grade: activity.student.grade,
        })
      }
    })
    return Array.from(students.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"))
  }, [activities])

  const handleExport = () => {
    const csv = [
      ["Öğrenci Adı", "Sınıf", "Faaliyet Tipi", "Başlık", "Tarih", "Konum", "Organizatör", "Sonuç", "Kanıt"].join(","),
      ...filteredActivities.map((activity) =>
        [
          `"${activity.student.firstName} ${activity.student.lastName}"`,
          activity.student.grade,
          activityTypeLabels[activity.type],
          `"${activity.title}"`,
          new Date(activity.activityDate).toLocaleDateString("tr-TR"),
          activity.location || "",
          activity.organizer || "",
          activity.outcome ? `"${activity.outcome}"` : "",
          activity.evidence,
        ].join(",")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ib-faaliyetler-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">IB Program Görüntüleme</h1>
                <p className="text-sm text-gray-600">Hoş geldiniz, {viewerName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="card-soft border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Toplam Faaliyet</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{filteredActivities.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-soft border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Benzersiz Öğrenci</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{uniqueStudents.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <User className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-soft border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Doğrulanmış Kayıtlar</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">
                    {filteredActivities.filter((a) => a.isVerified).length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
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
              <CardDescription>Faaliyetleri öğrenci, tip ve tarihe göre filtreleyin</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              CSV İndir
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">Öğrenci</Label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Tüm öğrenciler</option>
                  {uniqueStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">Faaliyet Tipi</Label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
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
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">Arama</Label>
                <div className="mt-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ara..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Doğrulanmış Faaliyetler ({filteredActivities.length})</CardTitle>
            <CardDescription>
              Tüm faaliyetler IB programı için doğrulanmış ve onaylanmış kayıtlardır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
            ) : filteredActivities.length > 0 ? (
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <Card key={activity.id} className="card-soft border-0">
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{activity.title}</h3>
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                {activityTypeLabels[activity.type]}
                              </span>
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Doğrulanmış
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-semibold">
                                  {activity.student.firstName} {activity.student.lastName}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span>{activity.student.grade}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(activity.activityDate).toLocaleDateString("tr-TR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}</span>
                              </div>
                              {activity.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{activity.location}</span>
                                </div>
                              )}
                              {activity.organizer && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>Organizatör: {activity.organizer}</span>
                                </div>
                              )}
                              {activity.duration && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{activity.duration} dakika</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {activity.description && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-700">{activity.description}</p>
                          </div>
                        )}

                        {activity.outcome && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-sm font-semibold text-gray-900 mb-1">Sonuç/Kazanım:</p>
                            <p className="text-sm text-gray-700">{activity.outcome}</p>
                          </div>
                        )}

                        {activity.evidence && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-sm font-semibold text-gray-900 mb-1">Kanıt:</p>
                            <a
                              href={activity.evidence}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {activity.evidence}
                            </a>
                          </div>
                        )}

                        {activity.verifiedAt && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              Doğrulandı: {new Date(activity.verifiedAt).toLocaleDateString("tr-TR")}
                              {activity.verifiedBy && ` • ${activity.verifiedBy}`}
                            </p>
                          </div>
                        )}
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

