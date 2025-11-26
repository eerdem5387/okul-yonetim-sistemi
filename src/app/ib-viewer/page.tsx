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
  Globe,
  FileDown,
  X,
  Eye,
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

type Language = "tr" | "en"

const translations = {
  tr: {
    title: "IB Program Görüntüleme",
    welcome: "Hoş geldiniz",
    logout: "Çıkış Yap",
    totalActivities: "Toplam Faaliyet",
    uniqueStudents: "Benzersiz Öğrenci",
    verifiedRecords: "Doğrulanmış Kayıtlar",
    filtering: "Filtreleme",
    filterDescription: "Faaliyetleri öğrenci, tip ve tarihe göre filtreleyin",
    downloadCSV: "CSV İndir",
    student: "Öğrenci",
    allStudents: "Tüm öğrenciler",
    activityType: "Faaliyet Tipi",
    allTypes: "Tüm tipler",
    startDate: "Başlangıç Tarihi",
    endDate: "Bitiş Tarihi",
    search: "Ara",
    searchPlaceholder: "Ara...",
    verifiedActivities: "Doğrulanmış Faaliyetler",
    verifiedActivitiesDesc: "Tüm faaliyetler IB programı için doğrulanmış ve onaylanmış kayıtlardır.",
    loading: "Yükleniyor...",
    noActivities: "Filtrelere uygun faaliyet bulunamadı",
    verified: "Doğrulanmış",
    organizer: "Organizatör",
    minutes: "dakika",
    outcome: "Sonuç/Kazanım",
    evidence: "Kanıt",
    verifiedAt: "Doğrulandı",
    downloadPDF: "PDF İndir",
    downloadStudentPDF: "Öğrenci Raporunu İndir",
    language: "Dil",
    turkish: "Türkçe",
    english: "English",
    date: "Tarih",
    description: "Açıklama",
    location: "Konum",
    duration: "Süre",
    participants: "Katılımcı Sayısı",
  },
  en: {
    title: "IB Program Viewer",
    welcome: "Welcome",
    logout: "Log Out",
    totalActivities: "Total Activities",
    uniqueStudents: "Unique Students",
    verifiedRecords: "Verified Records",
    filtering: "Filtering",
    filterDescription: "Filter activities by student, type, and date",
    downloadCSV: "Download CSV",
    student: "Student",
    allStudents: "All students",
    activityType: "Activity Type",
    allTypes: "All types",
    startDate: "Start Date",
    endDate: "End Date",
    search: "Search",
    searchPlaceholder: "Search...",
    verifiedActivities: "Verified Activities",
    verifiedActivitiesDesc: "All activities are verified and approved records for the IB program.",
    loading: "Loading...",
    noActivities: "No activities found matching filters",
    verified: "Verified",
    organizer: "Organizer",
    minutes: "minutes",
    outcome: "Outcome/Achievement",
    evidence: "Evidence",
    verifiedAt: "Verified at",
    downloadPDF: "Download PDF",
    downloadStudentPDF: "Download Student Report",
    language: "Language",
    turkish: "Türkçe",
    english: "English",
    date: "Date",
    description: "Description",
    location: "Location",
    duration: "Duration",
    participants: "Number of Participants",
  },
}

const activityTypeLabels: Record<ActivityType, { tr: string; en: string }> = {
  ETKINLIK: { tr: "Etkinlik", en: "Event" },
  GEZI: { tr: "Gezi", en: "Trip" },
  PROJE: { tr: "Proje", en: "Project" },
  SINAV: { tr: "Sınav", en: "Exam" },
  YARISMA: { tr: "Yarışma", en: "Competition" },
  SEMINER: { tr: "Seminer", en: "Seminar" },
  WORKSHOP: { tr: "Workshop", en: "Workshop" },
  SPORT: { tr: "Spor", en: "Sport" },
  SANAT: { tr: "Sanat", en: "Art" },
  SOSYAL: { tr: "Sosyal Sorumluluk", en: "Social Responsibility" },
  DIL: { tr: "Dil Faaliyeti", en: "Language Activity" },
  BILIM: { tr: "Bilim", en: "Science" },
  DEGER: { tr: "Değerler Eğitimi", en: "Values Education" },
  DIGER: { tr: "Diğer", en: "Other" },
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
  const [language, setLanguage] = useState<Language>("tr")
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  const t = translations[language]

  useEffect(() => {
    // Load language preference from localStorage
    const savedLanguage = localStorage.getItem("ib_viewer_language") as Language
    if (savedLanguage === "tr" || savedLanguage === "en") {
      setLanguage(savedLanguage)
    }

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

      const data: Activity[] = await response.json()
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
    localStorage.removeItem("ib_viewer_language")
    router.push("/login")
    router.refresh()
  }

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage)
    localStorage.setItem("ib_viewer_language", newLanguage)
  }

  const handleDownloadStudentPDF = async (studentId: string, studentName: string) => {
    try {
      setDownloadingPDF(studentId)
      const token = localStorage.getItem("ib_viewer_token")
      const url = `/api/ib/pdf/student/${studentId}?lang=${language}&token=${token}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to download PDF")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      // Sanitize file name (remove special characters)
      const sanitizedName = studentName.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/\s+/g, "-")
      link.download = language === "en"
        ? `ib-activity-report-${sanitizedName}.pdf`
        : `ib-faaliyet-raporu-${sanitizedName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert(language === "en" ? "Failed to download PDF" : "PDF indirme başarısız")
    } finally {
      setDownloadingPDF(null)
    }
  }

  const handleDownloadActivityPDF = async (activityId: string, activityTitle: string, studentName: string) => {
    try {
      setDownloadingPDF(activityId)
      const token = localStorage.getItem("ib_viewer_token")
      const url = `/api/ib/pdf/activity/${activityId}?lang=${language}&token=${token}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to download PDF")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      // Sanitize file name
      const sanitizedTitle = activityTitle.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/\s+/g, "-")
      const sanitizedName = studentName.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/\s+/g, "-")
      link.download = language === "en"
        ? `ib-activity-${sanitizedTitle}-${sanitizedName}.pdf`
        : `ib-faaliyet-${sanitizedTitle}-${sanitizedName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Error downloading activity PDF:", error)
      alert(language === "en" ? "Failed to download PDF" : "PDF indirme başarısız")
    } finally {
      setDownloadingPDF(null)
    }
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
    return Array.from(students.values()).sort((a, b) => a.name.localeCompare(b.name, language === "tr" ? "tr" : "en"))
  }, [activities, language])

  const handleExport = () => {
    const csv = [
      [
        language === "en" ? "Student Name" : "Öğrenci Adı",
        language === "en" ? "Grade" : "Sınıf",
        language === "en" ? "Activity Type" : "Faaliyet Tipi",
        language === "en" ? "Title" : "Başlık",
        language === "en" ? "Date" : "Tarih",
        language === "en" ? "Location" : "Konum",
        language === "en" ? "Organizer" : "Organizatör",
        language === "en" ? "Outcome" : "Sonuç",
        language === "en" ? "Evidence" : "Kanıt",
      ].join(","),
      ...filteredActivities.map((activity) =>
        [
          `"${activity.student.firstName} ${activity.student.lastName}"`,
          activity.student.grade,
          activityTypeLabels[activity.type][language],
          `"${activity.title}"`,
          new Date(activity.activityDate).toLocaleDateString(language === "en" ? "en-US" : "tr-TR"),
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
    link.setAttribute("download", `ib-activities-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "en" ? "en-US" : "tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
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
                <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-sm text-gray-600">
                  {t.welcome}, {viewerName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <Globe className="h-4 w-4 text-gray-600" />
                <button
                  onClick={() => handleLanguageChange("tr")}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    language === "tr"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  TR
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    language === "en"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  EN
                </button>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t.logout}
              </Button>
            </div>
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
                  <p className="text-sm text-gray-500">{t.totalActivities}</p>
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
                  <p className="text-sm text-gray-500">{t.uniqueStudents}</p>
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
                  <p className="text-sm text-gray-500">{t.verifiedRecords}</p>
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
                {t.filtering}
              </CardTitle>
              <CardDescription>{t.filterDescription}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {t.downloadCSV}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">{t.student}</Label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">{t.allStudents}</option>
                  {uniqueStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">{t.activityType}</Label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">{t.allTypes}</option>
                  {Object.entries(activityTypeLabels).map(([value, labels]) => (
                    <option key={value} value={value}>
                      {labels[language]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">{t.startDate}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">{t.endDate}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500">{t.search}</Label>
                <div className="mt-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                {t.verifiedActivities} ({filteredActivities.length})
              </CardTitle>
              <CardDescription>{t.verifiedActivitiesDesc}</CardDescription>
            </div>
            {selectedStudent && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const student = uniqueStudents.find((s) => s.id === selectedStudent)
                  if (student) {
                    handleDownloadStudentPDF(selectedStudent, student.name)
                  }
                }}
                disabled={downloadingPDF === selectedStudent}
              >
                {downloadingPDF === selectedStudent ? (
                  <>
                    <FileDown className="h-4 w-4 mr-2 animate-spin" />
                    {language === "en" ? "Generating..." : "Oluşturuluyor..."}
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    {t.downloadStudentPDF}
                  </>
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">{t.loading}</div>
            ) : filteredActivities.length > 0 ? (
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <Card 
                    key={activity.id} 
                    className="card-soft border-0 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{activity.title}</h3>
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                {activityTypeLabels[activity.type][language]}
                              </span>
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {t.verified}
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="ml-2 h-8 px-3 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadActivityPDF(
                                      activity.id,
                                      activity.title,
                                      `${activity.student.firstName} ${activity.student.lastName}`
                                    )
                                  }}
                                  disabled={downloadingPDF === activity.id}
                                  title={language === "en" ? "Download this activity PDF" : "Bu faaliyeti PDF olarak indir"}
                                >
                                  {downloadingPDF === activity.id ? (
                                    <FileDown className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <FileDown className="h-4 w-4 mr-1" />
                                  )}
                                  {t.downloadPDF}
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(activity.activityDate)}</span>
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
                                  <span>
                                    {t.organizer}: {activity.organizer}
                                  </span>
                                </div>
                              )}
                              {activity.duration && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {activity.duration} {t.minutes}
                                  </span>
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
                            <p className="text-sm font-semibold text-gray-900 mb-1">{t.outcome}:</p>
                            <p className="text-sm text-gray-700">{activity.outcome}</p>
                          </div>
                        )}

                        {activity.evidence && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-sm font-semibold text-gray-900 mb-1">{t.evidence}:</p>
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
                              {t.verifiedAt}: {formatDate(activity.verifiedAt)}
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
                <p>{t.noActivities}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Detail Modal */}
        {selectedActivity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
              <CardHeader className="flex items-center justify-between border-b">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  {language === "en" ? "Activity Details" : "Faaliyet Detayları"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedActivity(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Activity Header */}
                <div className="flex items-start justify-between pb-4 border-b">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedActivity.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-700">
                        {activityTypeLabels[selectedActivity.type][language]}
                      </span>
                      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {t.verified}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                      {t.student}
                    </Label>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedActivity.student.firstName} {selectedActivity.student.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{selectedActivity.student.grade}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                      {t.date}
                    </Label>
                    <p className="text-base text-gray-900">{formatDate(selectedActivity.activityDate)}</p>
                  </div>
                </div>

                {/* Activity Details Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                      {t.location}
                    </Label>
                    <p className="text-sm text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedActivity.location ? (
                        selectedActivity.location
                      ) : (
                        <span className="text-gray-400 italic">
                          {language === "en" ? "Not specified" : "Belirtilmemiş"}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                      {t.organizer}
                    </Label>
                    <p className="text-sm text-gray-900 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedActivity.organizer ? (
                        selectedActivity.organizer
                      ) : (
                        <span className="text-gray-400 italic">
                          {language === "en" ? "Not specified" : "Belirtilmemiş"}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                      {t.duration}
                    </Label>
                    <p className="text-sm text-gray-900 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedActivity.duration ? (
                        `${selectedActivity.duration} ${t.minutes}`
                      ) : (
                        <span className="text-gray-400 italic">
                          {language === "en" ? "Not specified" : "Belirtilmemiş"}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                      {t.participants}
                    </Label>
                    <p className="text-sm text-gray-900">
                      {selectedActivity.participants ? (
                        selectedActivity.participants
                      ) : (
                        <span className="text-gray-400 italic">
                          {language === "en" ? "Not specified" : "Belirtilmemiş"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                    {t.description}
                  </Label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedActivity.description ? (
                      selectedActivity.description
                    ) : (
                      <span className="text-gray-400 italic">
                        {language === "en" ? "Not specified" : "Belirtilmemiş"}
                      </span>
                    )}
                  </p>
                </div>

                {/* Outcome */}
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                    {t.outcome}
                  </Label>
                  <p className="text-sm text-gray-700 bg-emerald-50 p-4 rounded-lg border-l-4 border-emerald-500">
                    {selectedActivity.outcome ? (
                      selectedActivity.outcome
                    ) : (
                      <span className="text-gray-400 italic">
                        {language === "en" ? "Not specified" : "Belirtilmemiş"}
                      </span>
                    )}
                  </p>
                </div>

                {/* Evidence */}
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                    {t.evidence}
                  </Label>
                  <div className="space-y-3">
                    {selectedActivity.evidence ? (() => {
                      const evidenceUrl = selectedActivity.evidence.trim()
                      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
                      const isImage = imageExtensions.some(ext => evidenceUrl.toLowerCase().includes(ext))
                      
                      return (
                        <>
                          {isImage ? (
                            <div className="space-y-2">
                              <img 
                                src={evidenceUrl} 
                                alt="Evidence" 
                                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                              <a
                                href={evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline break-all block"
                              >
                                {evidenceUrl}
                              </a>
                            </div>
                          ) : (
                            <a
                              href={evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline break-all block bg-gray-50 p-3 rounded-lg"
                            >
                              {evidenceUrl}
                            </a>
                          )}
                        </>
                      )
                    })() : (
                      <span className="text-gray-400 italic text-sm">
                        {language === "en" ? "Not specified" : "Belirtilmemiş"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">
                    {language === "en" ? "Notes" : "Notlar"}
                  </Label>
                  <p className="text-sm text-gray-700 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                    {selectedActivity.notes ? (
                      selectedActivity.notes
                    ) : (
                      <span className="text-gray-400 italic">
                        {language === "en" ? "Not specified" : "Belirtilmemiş"}
                      </span>
                    )}
                  </p>
                </div>

                {/* Verification Info */}
                {selectedActivity.verifiedAt && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">{t.verifiedAt}:</span> {formatDate(selectedActivity.verifiedAt)}
                      {selectedActivity.verifiedBy && (
                        <span className="ml-2">• {selectedActivity.verifiedBy}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() =>
                      handleDownloadActivityPDF(
                        selectedActivity.id,
                        selectedActivity.title,
                        `${selectedActivity.student.firstName} ${selectedActivity.student.lastName}`
                      )
                    }
                    disabled={downloadingPDF === selectedActivity.id}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {downloadingPDF === selectedActivity.id
                      ? (language === "en" ? "Generating..." : "Oluşturuluyor...")
                      : t.downloadPDF}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedActivity(null)}
                  >
                    {language === "en" ? "Close" : "Kapat"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
