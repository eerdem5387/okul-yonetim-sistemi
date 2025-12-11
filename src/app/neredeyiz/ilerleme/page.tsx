"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToastContainer, useToast } from "@/components/ui/toast"
import {
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
  BookOpen,
  TrendingUp,
  XCircle,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  AlertTriangle,
} from "lucide-react"

interface AcademicYear {
  id: string
  name: string
  isActive: boolean
}

interface Subject {
  id: string
  name: string
  grade: number
  section: string | null
  units: Array<{
    id: string
    name: string
    topics: Array<{
      id: string
      name: string
      plannedStartDate: string | null
      plannedEndDate: string | null
      progress: Array<{
        id: string
        status: string
        actualEndDate: string | null
        markedAt: string | null
      }>
    }>
  }>
}

interface Topic {
  id: string
  name: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  progress: Array<{
    id: string
    status: string
    actualEndDate: string | null
    markedAt: string | null
  }>
}

type StatusFilter = "ALL" | "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "ERTELENDI"

export default function IlerlemePage() {
  const { toasts, success, error, removeToast } = useToast()
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null)
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [showCompletionDateModal, setShowCompletionDateModal] = useState(false)
  const [completionDateTopicId, setCompletionDateTopicId] = useState<string | null>(null)
  const [completionDate, setCompletionDate] = useState("")

  useEffect(() => {
    fetchAcademicYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedYearId) {
      fetchSubjects()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId])

  // Ders açıldığında tüm üniteleri açık tut
  useEffect(() => {
    if (expandedSubjectId) {
      const subject = subjects.find((s) => s.id === expandedSubjectId)
      if (subject) {
        const unitIds = new Set(subject.units?.map((u) => u.id) || [])
        setExpandedUnits(unitIds)
      }
    }
  }, [expandedSubjectId, subjects])

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch("/api/neredeyiz/academic-years")
      if (response.ok) {
        const data = await response.json()
        setAcademicYears(data)
        const active = data.find((year: AcademicYear) => year.isActive)
        if (active) {
          setSelectedYearId(active.id)
        } else if (data.length > 0) {
          setSelectedYearId(data[0].id)
        }
      }
    } catch (err) {
      console.error("Error fetching academic years:", err)
      error("Akademik yıllar yüklenirken hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    if (!selectedYearId) return

    try {
      let url = `/api/neredeyiz/subjects?academicYearId=${selectedYearId}`
      if (selectedGrade) {
        url += `&grade=${selectedGrade}`
      }
      if (selectedSection) {
        url += `&section=${selectedSection}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
      error("Dersler yüklenirken hata oluştu!")
    }
  }

  const handleMarkComplete = async (topicId: string, topic: Topic) => {
    // Eğer konunun tarihi yoksa, tamamlama tarihi seçme modalını aç
    if (!topic.plannedStartDate && !topic.plannedEndDate) {
      setCompletionDateTopicId(topicId)
      setCompletionDate(new Date().toISOString().split("T")[0])
      setShowCompletionDateModal(true)
      return
    }

    // Tarihi varsa direkt tamamla
    setUpdatingTopicId(topicId)
    try {
      const response = await fetch("/api/neredeyiz/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          status: "TAMAMLANDI",
          actualEndDate: new Date().toISOString(),
          markedAt: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        success("Konu başarıyla tamamlandı olarak işaretlendi!")
        await fetchSubjects()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Konu işaretlenirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error marking topic complete:", err)
      error("Konu işaretlenirken bir hata oluştu!")
    } finally {
      setUpdatingTopicId(null)
    }
  }

  const handleCompleteWithDate = async () => {
    if (!completionDateTopicId || !completionDate) {
      error("Lütfen tamamlama tarihi seçin!")
      return
    }

    setUpdatingTopicId(completionDateTopicId)
    try {
      const response = await fetch("/api/neredeyiz/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: completionDateTopicId,
          status: "TAMAMLANDI",
          actualEndDate: new Date(completionDate).toISOString(),
          markedAt: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        success("Konu başarıyla tamamlandı olarak işaretlendi!")
        await fetchSubjects()
        setShowCompletionDateModal(false)
        setCompletionDateTopicId(null)
        setCompletionDate("")
      } else {
        const errorData = await response.json()
        error(errorData.error || "Konu işaretlenirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error marking topic complete:", err)
      error("Konu işaretlenirken bir hata oluştu!")
    } finally {
      setUpdatingTopicId(null)
      setShowCompletionDateModal(false)
    }
  }

  const handleMarkUnitComplete = async (unitId: string, topics: Topic[]) => {
    setUpdatingUnitId(unitId)
    try {
      // Ünitedeki tüm konuları tamamla
      const promises = topics.map((topic) => {
        const actualEndDate = topic.plannedEndDate 
          ? new Date(topic.plannedEndDate).toISOString()
          : new Date().toISOString()
        
        return fetch("/api/neredeyiz/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId: topic.id,
            status: "TAMAMLANDI",
            actualEndDate,
            markedAt: new Date().toISOString(),
          }),
        })
      })

      await Promise.all(promises)
      success("Ünite başarıyla tamamlandı olarak işaretlendi!")
      await fetchSubjects()
    } catch (err) {
      console.error("Error marking unit complete:", err)
      error("Ünite işaretlenirken bir hata oluştu!")
    } finally {
      setUpdatingUnitId(null)
    }
  }

  const handleMarkInProgress = async (topicId: string) => {
    setUpdatingTopicId(topicId)
    try {
      const response = await fetch("/api/neredeyiz/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          status: "DEVAM_EDIYOR",
          actualStartDate: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        success("Konu devam ediyor olarak işaretlendi!")
        await fetchSubjects()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Konu işaretlenirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error marking topic in progress:", err)
      error("Konu işaretlenirken bir hata oluştu!")
    } finally {
      setUpdatingTopicId(null)
    }
  }

  const getTopicStatus = (topic: Topic) => {
    const progress = topic.progress?.[0]
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Sadece tarih karşılaştırması için saatleri sıfırla

    // Eğer progress kaydı varsa ve durum belirlenmişse, onu kullan
    if (progress) {
      if (progress.status === "TAMAMLANDI") {
        return {
          label: "Tamamlandı",
          color: "bg-green-100 text-green-800",
          icon: CheckCircle2,
          status: "TAMAMLANDI" as const,
        }
      } else if (progress.status === "DEVAM_EDIYOR") {
        return {
          label: "Devam Ediyor",
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
          status: "DEVAM_EDIYOR" as const,
        }
      } else if (progress.status === "ERTELENDI") {
        return {
          label: "Ertelendi",
          color: "bg-red-100 text-red-800",
          icon: XCircle,
          status: "ERTELENDI" as const,
        }
      }
    }

    // Progress kaydı yoksa veya PLANLANDI ise, planlanan tarihlere göre otomatik belirle
    if (topic.plannedStartDate || topic.plannedEndDate) {
      const startDate = topic.plannedStartDate ? new Date(topic.plannedStartDate) : null
      const endDate = topic.plannedEndDate ? new Date(topic.plannedEndDate) : null

      if (startDate) startDate.setHours(0, 0, 0, 0)
      if (endDate) endDate.setHours(0, 0, 0, 0)

      // Eğer bitiş tarihi geçmişteyse ve tamamlanmamışsa → Gecikmeli
      if (endDate && endDate < now && (!progress || progress.status !== "TAMAMLANDI")) {
        return {
          label: "Gecikmeli",
          color: "bg-red-100 text-red-800",
          icon: AlertTriangle,
          status: "GECIKMELI" as const,
        }
      }

      // Eğer başlangıç tarihi geçmişte veya bugünse ve bitiş tarihi gelecekteyse → Devam Ediyor
      if (
        startDate &&
        endDate &&
        startDate <= now &&
        endDate >= now &&
        (!progress || progress.status === "PLANLANDI")
      ) {
        return {
          label: "Devam Ediyor",
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
          status: "DEVAM_EDIYOR" as const,
        }
      }

      // Eğer sadece bitiş tarihi varsa ve bugün ile gelecek arasındaysa → Devam Ediyor
      if (!startDate && endDate && endDate >= now && (!progress || progress.status === "PLANLANDI")) {
        return {
          label: "Devam Ediyor",
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
          status: "DEVAM_EDIYOR" as const,
        }
      }

      // Eğer başlangıç tarihi gelecekteyse → Planlandı
      if (startDate && startDate > now) {
        return {
          label: "Planlandı",
          color: "bg-gray-100 text-gray-800",
          icon: Calendar,
          status: "PLANLANDI" as const,
        }
      }
    }

    // Varsayılan durum
    return {
      label: "Planlandı",
      color: "bg-gray-100 text-gray-800",
      icon: Calendar,
      status: "PLANLANDI" as const,
    }
  }

  const getDelayDays = (topic: Topic) => {
    const progress = topic.progress?.[0]
    if (progress?.status === "TAMAMLANDI" && topic.plannedEndDate && progress.actualEndDate) {
      const planned = new Date(topic.plannedEndDate)
      const actual = new Date(progress.actualEndDate)
      const diff = Math.ceil((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24))
      return diff > 0 ? diff : 0
    }
    return null
  }

  // Ünite istatistiklerini hesapla
  const unitStats = useMemo(() => {
    const selectedSubject = subjects.find((s) => s.id === expandedSubjectId)
    if (!selectedSubject) return []
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    return (selectedSubject.units || []).map((unit) => {
      const topics = unit.topics || []
      const completed = topics.filter((t) => t.progress?.[0]?.status === "TAMAMLANDI").length
      
      const inProgress = topics.filter((t) => {
        const progress = t.progress?.[0]
        // Progress kaydı varsa ve DEVAM_EDIYOR ise
        if (progress?.status === "DEVAM_EDIYOR") return true
        
        // Progress kaydı yoksa veya PLANLANDI ise, tarihlere göre kontrol et
        if (!progress || progress.status === "PLANLANDI") {
          const startDate = t.plannedStartDate ? new Date(t.plannedStartDate) : null
          const endDate = t.plannedEndDate ? new Date(t.plannedEndDate) : null
          
          if (startDate) startDate.setHours(0, 0, 0, 0)
          if (endDate) endDate.setHours(0, 0, 0, 0)
          
          // Başlangıç tarihi geçmişte veya bugünse ve bitiş tarihi gelecekteyse
          if (startDate && endDate && startDate <= now && endDate >= now) return true
          // Sadece bitiş tarihi varsa ve bugün ile gelecek arasındaysa
          if (!startDate && endDate && endDate >= now) return true
        }
        
        return false
      }).length
      
      const planned = topics.filter((t) => {
        const progress = t.progress?.[0]
        const startDate = t.plannedStartDate ? new Date(t.plannedStartDate) : null
        const endDate = t.plannedEndDate ? new Date(t.plannedEndDate) : null
        
        if (startDate) startDate.setHours(0, 0, 0, 0)
        if (endDate) endDate.setHours(0, 0, 0, 0)
        
        // Progress kaydı varsa ve durum belirlenmişse planlandı değil
        if (progress && progress.status !== "PLANLANDI") return false
        
        // Başlangıç tarihi gelecekteyse planlandı
        if (startDate && startDate > now) return true
        
        // Tarih yoksa planlandı
        if (!startDate && !endDate) return true
        
        // Başlangıç tarihi geçmişteyse ve bitiş tarihi gelecekteyse planlandı değil (devam ediyor)
        if (startDate && endDate && startDate <= now && endDate >= now) return false
        
        return true
      }).length
      const delayed = topics.filter((t) => {
        const progress = t.progress?.[0]
        if (progress?.status === "TAMAMLANDI" && t.plannedEndDate && progress.actualEndDate) {
          const planned = new Date(t.plannedEndDate)
          const actual = new Date(progress.actualEndDate)
          return actual > planned
        }
        return false
      }).length

      return {
        unit,
        total: topics.length,
        completed,
        inProgress,
        planned,
        delayed,
        completionRate: topics.length > 0 ? Math.round((completed / topics.length) * 100) : 0,
      }
    })
  }, [subjects, expandedSubjectId])

  // Filtrelenmiş ve aranmış üniteler
  const filteredUnits = useMemo(() => {
    const selectedSubject = subjects.find((s) => s.id === expandedSubjectId)
    if (!selectedSubject) return []
    
    return unitStats
      .map((stat) => {
        const filteredTopics = (stat.unit.topics || []).filter((topic) => {
          // Arama filtresi
          const matchesSearch =
            searchQuery === "" ||
            topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stat.unit.name.toLowerCase().includes(searchQuery.toLowerCase())

          // Durum filtresi
          const topicStatus = getTopicStatus(topic)
          const matchesStatus =
            statusFilter === "ALL" || topicStatus.status === statusFilter

          return matchesSearch && matchesStatus
        })

        return {
          ...stat,
          filteredTopics,
        }
      })
      .filter((stat) => stat.filteredTopics.length > 0 || searchQuery === "")
  }, [unitStats, searchQuery, statusFilter, subjects, expandedSubjectId])

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(unitId)) {
        newSet.delete(unitId)
      } else {
        newSet.add(unitId)
      }
      return newSet
    })
  }

  const expandAll = () => {
    const selectedSubject = subjects.find((s) => s.id === expandedSubjectId)
    if (selectedSubject) {
      const unitIds = new Set(selectedSubject.units?.map((u) => u.id) || [])
      setExpandedUnits(unitIds)
    }
  }

  const collapseAll = () => {
    setExpandedUnits(new Set())
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              İlerleme Takibi
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Konuların tamamlanma durumunu işaretleyin
            </p>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:px-6">
            <CardTitle className="text-sm sm:text-base">Akademik Yıl</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedYearId}
              onChange={(e) => {
                setSelectedYearId(e.target.value)
                setExpandedSubjectId(null)
              }}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} {year.isActive && "(Aktif)"}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:px-6">
            <CardTitle className="text-sm sm:text-base">Sınıf</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value)
                setExpandedSubjectId(null)
              }}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Sınıflar</option>
              {[5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                <option key={grade} value={grade}>
                  {grade}. Sınıf
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:px-6">
            <CardTitle className="text-sm sm:text-base">Şube</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value)
                setExpandedSubjectId(null)
              }}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Şubeler</option>
              {Array.from(
                new Set(
                  subjects
                    .map((s) => s.section)
                    .filter((s): s is string => s !== null && s !== "")
                )
              )
                .sort()
                .map((section) => (
                  <option key={section} value={section}>
                    {section} Şubesi
                  </option>
                ))}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Dersler Kutucukları */}
      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">
              Bu akademik yılda henüz ders tanımlanmamış
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const isExpanded = expandedSubjectId === subject.id
            const allTopics = (subject.units || []).flatMap((u) => u.topics || [])
            const completedTopics = allTopics.filter((t) => t.progress?.[0]?.status === "TAMAMLANDI").length
            const totalTopics = allTopics.length
            const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

            return (
              <Card
                key={subject.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isExpanded ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => {
                  setExpandedSubjectId(isExpanded ? null : subject.id)
                  if (!isExpanded) {
                    // Ders açıldığında tüm üniteleri aç
                    const unitIds = new Set(subject.units?.map((u) => u.id) || [])
                    setExpandedUnits(unitIds)
                  }
                }}
              >
                <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                      {subject.name}
                      <span className="text-sm font-normal text-gray-600">
                        - {subject.grade}. Sınıf
                        {subject.section && ` - ${subject.section} Şubesi`}
                      </span>
                    </CardTitle>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Toplam Konu:</span>
                      <span className="font-semibold">{totalTopics}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Tamamlanan:</span>
                      <span className="font-semibold text-green-600">{completedTopics}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      %{completionRate} Tamamlandı
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Ders Detayları */}
      {expandedSubjectId && (() => {
        const selectedSubject = subjects.find((s) => s.id === expandedSubjectId)
        if (!selectedSubject) return null
        return (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                {selectedSubject.name} - Konular
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={expandAll}
                  className="text-xs sm:text-sm"
                >
                  Tümünü Aç
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={collapseAll}
                  className="text-xs sm:text-sm"
                >
                  Tümünü Kapat
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {/* Arama ve Filtre */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Konu veya ünite ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  onClick={() => setStatusFilter("ALL")}
                  className="text-xs sm:text-sm"
                >
                  Tümü
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "PLANLANDI" ? "default" : "outline"}
                  onClick={() => setStatusFilter("PLANLANDI")}
                  className="text-xs sm:text-sm"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Planlandı
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "DEVAM_EDIYOR" ? "default" : "outline"}
                  onClick={() => setStatusFilter("DEVAM_EDIYOR")}
                  className="text-xs sm:text-sm"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Devam Ediyor
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "TAMAMLANDI" ? "default" : "outline"}
                  onClick={() => setStatusFilter("TAMAMLANDI")}
                  className="text-xs sm:text-sm"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Tamamlandı
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "ERTELENDI" ? "default" : "outline"}
                  onClick={() => setStatusFilter("ERTELENDI")}
                  className="text-xs sm:text-sm"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Ertelendi
                </Button>
              </div>
            </div>

            {filteredUnits.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm sm:text-base">
                  {searchQuery || statusFilter !== "ALL"
                    ? "Arama kriterlerinize uygun konu bulunamadı"
                    : "Bu derste henüz konu tanımlanmamış"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUnits.map((stat) => {
                  const isExpanded = expandedUnits.has(stat.unit.id)

                  return (
                    <div
                      key={stat.unit.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Ünite Header */}
                      <div className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex items-center justify-between">
                        <button
                          onClick={() => toggleUnit(stat.unit.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                              {stat.unit.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-gray-600">
                                {stat.total} konu
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                %{stat.completionRate} tamamlandı
                              </span>
                              {stat.completed > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                  {stat.completed} tamamlandı
                                </span>
                              )}
                              {stat.inProgress > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                                  {stat.inProgress} devam ediyor
                                </span>
                              )}
                              {stat.delayed > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                                  {stat.delayed} gecikme
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkUnitComplete(stat.unit.id, stat.unit.topics || [])
                          }}
                          disabled={updatingUnitId === stat.unit.id}
                          className="text-xs sm:text-sm bg-green-600 hover:bg-green-700 whitespace-nowrap ml-2"
                        >
                          {updatingUnitId === stat.unit.id ? (
                            <>
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                              İşleniyor...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Üniteyi Tamamla
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Konular Listesi */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-white">
                          <div className="divide-y divide-gray-100">
                            {stat.filteredTopics.length === 0 ? (
                              <div className="px-4 py-6 text-center text-sm text-gray-500">
                                Bu ünitede arama kriterlerinize uygun konu bulunamadı
                              </div>
                            ) : (
                              stat.filteredTopics.map((topic) => {
                                const topicStatus = getTopicStatus(topic)
                                const delayDays = getDelayDays(topic)
                                const StatusIcon = topicStatus.icon

                                return (
                                  <div
                                    key={topic.id}
                                    className="px-4 py-3 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="font-medium text-sm sm:text-base text-gray-900">
                                            {topic.name}
                                          </h4>
                                          <span
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${topicStatus.color}`}
                                          >
                                            <StatusIcon className="h-3 w-3" />
                                            {topicStatus.label}
                                          </span>
                                          {delayDays !== null && delayDays > 0 && (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                              {delayDays} gün gecikme
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-600">
                                          {topic.plannedEndDate && (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              Planlanan:{" "}
                                              {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR")}
                                            </div>
                                          )}
                                          {topic.progress?.[0]?.actualEndDate && (
                                            <div className="flex items-center gap-1">
                                              <CheckCircle2 className="h-3 w-3" />
                                              Tamamlanan:{" "}
                                              {new Date(
                                                topic.progress[0].actualEndDate
                                              ).toLocaleDateString("tr-TR")}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2 flex-shrink-0">
                                        {topic.progress?.[0]?.status !== "TAMAMLANDI" && (
                                          <Button
                                            size="sm"
                                            onClick={() => handleMarkComplete(topic.id, topic)}
                                            disabled={updatingTopicId === topic.id}
                                            className="text-xs sm:text-sm bg-green-600 hover:bg-green-700 whitespace-nowrap"
                                          >
                                            {updatingTopicId === topic.id ? (
                                              <>
                                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                                                İşleniyor...
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                Tamamlandı
                                              </>
                                            )}
                                          </Button>
                                        )}
                                        {topic.progress?.[0]?.status === "PLANLANDI" && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleMarkInProgress(topic.id)}
                                            disabled={updatingTopicId === topic.id}
                                            className="text-xs sm:text-sm whitespace-nowrap"
                                          >
                                            {updatingTopicId === topic.id ? (
                                              <>
                                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                                                İşleniyor...
                                              </>
                                            ) : (
                                              <>
                                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                Devam Ediyor
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )
      })()}

      {/* Tamamlama Tarihi Seçme Modalı */}
      {showCompletionDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  Tamamlama Tarihi Seç
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCompletionDateModal(false)
                    setCompletionDateTopicId(null)
                    setCompletionDate("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="completionDate" className="text-xs sm:text-sm">
                    Tamamlanma Tarihi *
                  </Label>
                  <Input
                    id="completionDate"
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="h-9 sm:h-10 text-xs sm:text-sm mt-1"
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCompleteWithDate}
                    disabled={!completionDate || updatingTopicId === completionDateTopicId}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm bg-green-600 hover:bg-green-700"
                  >
                    {updatingTopicId === completionDateTopicId ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Tamamlandı Olarak İşaretle
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCompletionDateModal(false)
                      setCompletionDateTopicId(null)
                      setCompletionDate("")
                    }}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
