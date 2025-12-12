"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
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
  XCircle,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react"

interface Subject {
  id: string
  name: string
  grade: number
  section: string | null
  assignments: Array<{
    id: string
    staff: {
      id: string
      firstName: string
      lastName: string
    }
  }>
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
        markedBy: string | null
        approvedBy: string | null
        reportedBy: string | null
        markedByStaff: {
          id: string
          firstName: string
          lastName: string
          department: string
        } | null
        approvedByStaff: {
          id: string
          firstName: string
          lastName: string
          department: string
        } | null
        reportedByStaff: {
          id: string
          firstName: string
          lastName: string
          department: string
        } | null
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
    markedBy: string | null
    approvedBy: string | null
    markedByStaff: {
      id: string
      firstName: string
      lastName: string
      department: string
    } | null
    approvedByStaff: {
      id: string
      firstName: string
      lastName: string
      department: string
    } | null
  }>
}

type StatusFilter = "ALL" | "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "ERTELENDI"

export default function IlerlemeDetayPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toasts, success, error, removeToast } = useToast()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null)
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [showCompletionDateModal, setShowCompletionDateModal] = useState(false)
  const [completionDateTopicId, setCompletionDateTopicId] = useState<string | null>(null)
  const [completionDate, setCompletionDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [staffId, setStaffId] = useState<string | null>(null)
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    // URL parametresinden status filtresini oku
    const urlStatus = searchParams.get("status")
    if (urlStatus) {
      if (urlStatus === "TAMAMLANDI") {
        setStatusFilter("TAMAMLANDI")
      } else if (urlStatus === "DEVAM_EDIYOR") {
        setStatusFilter("DEVAM_EDIYOR")
      } else if (urlStatus === "GECIKMELI") {
        setStatusFilter("ERTELENDI") // ERTELENDI = GECIKMELI için kullanılıyor
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")
      
      // Rehberlik danışmanı veya öğrenci işleri kullanıcısı ise staff ID'yi al
      if ((role === "counselor" || role === "student_affairs") && id) {
        setStaffId(id)
      }
    }

    if (params.id) {
      fetchSubject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Ders yüklendiğinde tüm üniteleri açık tut
  useEffect(() => {
    if (subject) {
      const unitIds = new Set(subject.units?.map((u) => u.id) || [])
      setExpandedUnits(unitIds)
    }
  }, [subject])

  const fetchSubject = async () => {
    if (!params.id) return

    try {
      const response = await fetch(`/api/neredeyiz/subjects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSubject(data)
      } else {
        error("Ders yüklenirken hata oluştu!")
        router.push("/neredeyiz/ilerleme")
      }
    } catch (err) {
      console.error("Error fetching subject:", err)
      error("Ders yüklenirken hata oluştu!")
      router.push("/neredeyiz/ilerleme")
    } finally {
      setLoading(false)
    }
  }

  const getTopicStatus = (topic: Topic): {
    status: "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "GECIKMELI" | "GECIKMELI_TAMAMLANDI" | "ERKEN_TAMAMLANDI"
    label: string
    color: string
    icon: React.ComponentType<{ className?: string }>
  } => {
    // Progress kaydı varsa ve TAMAMLANDI ise
    if (topic.progress?.[0]?.status === "TAMAMLANDI") {
      // Erken veya gecikmeli tamamlanma kontrolü
      if (topic.plannedEndDate && topic.progress[0].actualEndDate) {
        const plannedEnd = new Date(topic.plannedEndDate)
        plannedEnd.setHours(0, 0, 0, 0)
        const actualEnd = new Date(topic.progress[0].actualEndDate)
        actualEnd.setHours(0, 0, 0, 0)
        
        if (actualEnd > plannedEnd) {
          return {
            status: "GECIKMELI_TAMAMLANDI",
            label: "Gecikmeli Tamamlandı",
            color: "bg-orange-100 text-orange-800",
            icon: AlertTriangle,
          }
        } else if (actualEnd < plannedEnd) {
          return {
            status: "ERKEN_TAMAMLANDI",
            label: "Erken Tamamlandı",
            color: "bg-emerald-100 text-emerald-800",
            icon: CheckCircle2,
          }
        }
      }
      
      return {
        status: "TAMAMLANDI",
        label: "Tamamlandı",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle2,
      }
    }

    // Tarih bilgisi varsa otomatik durum hesapla
    if (topic.plannedStartDate && topic.plannedEndDate) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const start = new Date(topic.plannedStartDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(topic.plannedEndDate)
      end.setHours(0, 0, 0, 0)

      if (now < start) {
        return {
          status: "PLANLANDI",
          label: "Planlandı",
          color: "bg-blue-100 text-blue-800",
          icon: Calendar,
        }
      } else if (now >= start && now <= end) {
        return {
          status: "DEVAM_EDIYOR",
          label: "Devam Ediyor",
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
        }
      } else {
        return {
          status: "GECIKMELI",
          label: "Gecikmeli",
          color: "bg-red-100 text-red-800",
          icon: AlertTriangle,
        }
      }
    }

    // Varsayılan
    return {
      status: "PLANLANDI",
      label: "Planlandı",
      color: "bg-blue-100 text-blue-800",
      icon: Calendar,
    }
  }

  const getDelayDays = (topic: Topic): number | null => {
    if (!topic.plannedEndDate) return null

    const plannedEnd = new Date(topic.plannedEndDate)
    plannedEnd.setHours(0, 0, 0, 0)
    
    // Eğer tamamlandıysa, tamamlama tarihi ile planlanan bitiş tarihini karşılaştır
    if (topic.progress?.[0]?.status === "TAMAMLANDI" && topic.progress[0].actualEndDate) {
      const actualEnd = new Date(topic.progress[0].actualEndDate)
      actualEnd.setHours(0, 0, 0, 0)
      
      if (actualEnd > plannedEnd) {
        const diffTime = actualEnd.getTime() - plannedEnd.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
      }
      return null
    }

    // Tamamlanmadıysa, şu anki tarih ile planlanan bitiş tarihini karşılaştır
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (now > plannedEnd) {
      const diffTime = now.getTime() - plannedEnd.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    return null
  }

  const getEarlyDays = (topic: Topic): number | null => {
    if (!topic.plannedEndDate) return null

    const plannedEnd = new Date(topic.plannedEndDate)
    plannedEnd.setHours(0, 0, 0, 0)
    
    // Eğer tamamlandıysa ve erken tamamlandıysa
    if (topic.progress?.[0]?.status === "TAMAMLANDI" && topic.progress[0].actualEndDate) {
      const actualEnd = new Date(topic.progress[0].actualEndDate)
      actualEnd.setHours(0, 0, 0, 0)
      
      if (actualEnd < plannedEnd) {
        const diffTime = plannedEnd.getTime() - actualEnd.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
      }
    }

    return null
  }

  const handleTopicComplete = async (topicId: string) => {
    const topic = subject?.units
      ?.flatMap((u) => u.topics || [])
      .find((t) => t.id === topicId)

    if (!topic) return

    // Eğer zaman aralığı yoksa, tamamlama tarihi sor
    if (!topic.plannedStartDate && !topic.plannedEndDate) {
      setCompletionDateTopicId(topicId)
      setShowCompletionDateModal(true)
      return
    }

    // Zaman aralığı varsa, otomatik olarak tamamlandı olarak işaretle
    setUpdatingTopicId(topicId)

    try {
      const response = await fetch("/api/neredeyiz/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          status: "TAMAMLANDI",
          actualEndDate: new Date().toISOString(),
          markedBy: staffId || null, // Rehberlik danışmanı veya öğrenci işleri kullanıcısı ise markedBy gönder
        }),
      })

      if (response.ok) {
        success("Konu tamamlandı olarak işaretlendi!")
        await fetchSubject()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Konu tamamlanırken hata oluştu!")
      }
    } catch (err) {
      console.error("Error completing topic:", err)
      error("Konu tamamlanırken bir hata oluştu!")
    } finally {
      setUpdatingTopicId(null)
    }
  }

  const handleUnitComplete = async (unitId: string) => {
    const unit = subject?.units?.find((u) => u.id === unitId)
    if (!unit) return

    setUpdatingUnitId(unitId)

    try {
      const topics = unit.topics || []
      const incompleteTopics = topics.filter(
        (t) => t.progress?.[0]?.status !== "TAMAMLANDI"
      )

      // Tüm konuları tamamlandı olarak işaretle
      for (const topic of incompleteTopics) {
        await fetch("/api/neredeyiz/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId: topic.id,
            status: "TAMAMLANDI",
            actualEndDate: new Date().toISOString(),
            markedBy: staffId || null, // Rehberlik danışmanı veya öğrenci işleri kullanıcısı ise markedBy gönder
          }),
        })
      }

      success("Ünite içindeki tüm konular tamamlandı olarak işaretlendi!")
      await fetchSubject()
    } catch (err) {
      console.error("Error completing unit:", err)
      error("Ünite tamamlanırken bir hata oluştu!")
    } finally {
      setUpdatingUnitId(null)
    }
  }

  const handleConfirmCompletionDate = async () => {
    if (!completionDate || !completionDateTopicId) return

    setSubmitting(true)

    try {
      const response = await fetch("/api/neredeyiz/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: completionDateTopicId,
          status: "TAMAMLANDI",
          actualEndDate: new Date(completionDate).toISOString(),
          markedBy: staffId || null, // Rehberlik danışmanı veya öğrenci işleri kullanıcısı ise markedBy gönder
        }),
      })

      if (response.ok) {
        success("Konu tamamlandı olarak işaretlendi!")
        await fetchSubject()
        setShowCompletionDateModal(false)
        setCompletionDateTopicId(null)
        setCompletionDate("")
      } else {
        const errorData = await response.json()
        error(errorData.error || "Konu tamamlanırken hata oluştu!")
      }
    } catch (err) {
      console.error("Error completing topic:", err)
      error("Konu tamamlanırken bir hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  // Ünite istatistiklerini hesapla
  const unitStats = useMemo(() => {
    if (!subject) return []
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return (subject.units || []).map((unit) => {
      const topics = unit.topics || []
      const completed = topics.filter((t) => t.progress?.[0]?.status === "TAMAMLANDI").length

      const inProgress = topics.filter((t) => {
        const progress = t.progress?.[0]
        if (progress?.status === "TAMAMLANDI") return false
        if (t.plannedStartDate && t.plannedEndDate) {
          const start = new Date(t.plannedStartDate)
          start.setHours(0, 0, 0, 0)
          const end = new Date(t.plannedEndDate)
          end.setHours(0, 0, 0, 0)
          return now >= start && now <= end
        }
        return false
      }).length

      const planned = topics.filter((t) => {
        const progress = t.progress?.[0]
        if (progress?.status === "TAMAMLANDI") return false
        if (t.plannedStartDate) {
          const start = new Date(t.plannedStartDate)
          start.setHours(0, 0, 0, 0)
          return now < start
        }
        return true
      }).length

      const delayed = topics.filter((t) => {
        const progress = t.progress?.[0]
        if (progress?.status === "TAMAMLANDI") return false
        if (t.plannedEndDate) {
          const end = new Date(t.plannedEndDate)
          end.setHours(0, 0, 0, 0)
          return now > end
        }
        return false
      }).length

      const total = topics.length
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

      return {
        unit,
        completed,
        inProgress,
        planned,
        delayed,
        total,
        completionRate,
      }
    })
  }, [subject])

  // Filtrelenmiş ve aranmış üniteler
  const filteredUnits = useMemo(() => {
    if (!subject) return []

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
            statusFilter === "ALL" ||
            (statusFilter === "PLANLANDI" && topicStatus.status === "PLANLANDI") ||
            (statusFilter === "DEVAM_EDIYOR" && topicStatus.status === "DEVAM_EDIYOR") ||
            (statusFilter === "TAMAMLANDI" && topicStatus.status === "TAMAMLANDI") ||
            (statusFilter === "ERTELENDI" && (topicStatus.status === "GECIKMELI" || topicStatus.status === "GECIKMELI_TAMAMLANDI"))

          return matchesSearch && matchesStatus
        })

        return {
          ...stat,
          filteredTopics,
        }
      })
      .filter((stat) => stat.filteredTopics.length > 0 || searchQuery === "")
  }, [unitStats, searchQuery, statusFilter, subject])

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits)
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId)
    } else {
      newExpanded.add(unitId)
    }
    setExpandedUnits(newExpanded)
  }

  const expandAll = () => {
    if (subject) {
      const unitIds = new Set(subject.units?.map((u) => u.id) || [])
      setExpandedUnits(unitIds)
    }
  }

  const collapseAll = () => {
    setExpandedUnits(new Set())
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
              Ders bulunamadı
            </p>
            <Link href="/neredeyiz/ilerleme">
              <Button variant="outline" size="sm" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                İlerleme Takibine Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/neredeyiz/ilerleme">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              {subject.name} - {subject.grade}. Sınıf
              {subject.section && ` - ${subject.section} Şubesi`}
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Konuların tamamlanma durumunu işaretleyin
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll} className="text-xs sm:text-sm">
            Tümünü Aç
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs sm:text-sm">
            Tümünü Kapat
          </Button>
        </div>
      </div>

      {/* Arama ve Filtreler */}
      <Card>
        <CardContent className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Konu veya ünite ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "PLANLANDI", "DEVAM_EDIYOR", "TAMAMLANDI", "ERTELENDI"] as StatusFilter[]).map((filter) => {
                const labels: Record<StatusFilter, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
                  ALL: { label: "Tümü", icon: BookOpen },
                  PLANLANDI: { label: "Planlandı", icon: Calendar },
                  DEVAM_EDIYOR: { label: "Devam Ediyor", icon: Clock },
                  TAMAMLANDI: { label: "Tamamlandı", icon: CheckCircle2 },
                  ERTELENDI: { label: "Ertelendi", icon: XCircle },
                }
                const { label, icon: Icon } = labels[filter]
                const isActive = statusFilter === filter

                return (
                  <Button
                    key={filter}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(filter)}
                    className="text-xs sm:text-sm"
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Üniteler ve Konular */}
      {filteredUnits.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
              {searchQuery || statusFilter !== "ALL"
                ? "Arama kriterlerinize uygun konu bulunamadı"
                : "Bu derste henüz konu tanımlanmamış"}
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              {searchQuery || statusFilter !== "ALL"
                ? "Filtreleri değiştirerek tekrar deneyin"
                : "Yönetim panelinden konu ekleyerek ilerleme takibine başlayabilirsiniz."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredUnits.map((stat) => {
            const isExpanded = expandedUnits.has(stat.unit.id)

            return (
              <div
                key={stat.unit.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => toggleUnit(stat.unit.id)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                        {stat.unit.name}
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUnitComplete(stat.unit.id)
                        }}
                        disabled={updatingUnitId === stat.unit.id}
                        className="text-xs h-6 px-2"
                      >
                        {updatingUnitId === stat.unit.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Tamamlandı
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span>Toplam: {stat.total}</span>
                      <span className="text-green-600">Tamamlanan: {stat.completed}</span>
                      <span className="text-yellow-600">Devam Ediyor: {stat.inProgress}</span>
                      <span className="text-blue-600">Planlandı: {stat.planned}</span>
                      <span className="text-red-600">Gecikmeli: {stat.delayed}</span>
                      <span className="font-medium">%{stat.completionRate} Tamamlandı</span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400 ml-2" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {stat.filteredTopics.length === 0 ? (
                      <div className="px-4 py-3 text-center text-sm text-gray-500">
                        Bu ünitede arama kriterlerinize uygun konu bulunamadı
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {stat.filteredTopics.map((topic) => {
                          const topicStatus = getTopicStatus(topic)
                          const delayDays = getDelayDays(topic)
                          const earlyDays = getEarlyDays(topic)
                          const StatusIcon = topicStatus.icon

                          return (
                            <div
                              key={topic.id}
                              className="px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className="font-medium text-sm sm:text-base text-gray-900">
                                      {topic.name}
                                    </h4>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${topicStatus.color}`}
                                    >
                                      <StatusIcon className="h-3 w-3" />
                                      {topicStatus.label}
                                    </span>
                                    {delayDays !== null && delayDays > 0 && topicStatus.status !== "GECIKMELI_TAMAMLANDI" && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                        {delayDays} gün gecikme
                                      </span>
                                    )}
                                    {earlyDays !== null && earlyDays > 0 && topicStatus.status === "ERKEN_TAMAMLANDI" && (
                                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                                        {earlyDays} gün erken
                                      </span>
                                    )}
                                  </div>
                                  {topic.plannedStartDate && topic.plannedEndDate && (
                                    <p className="text-xs text-gray-500">
                                      {new Date(topic.plannedStartDate).toLocaleDateString("tr-TR")} -{" "}
                                      {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR")}
                                    </p>
                                  )}
                                  {topic.progress?.[0]?.actualEndDate && (
                                    <p className={`text-xs mt-1 ${
                                      getDelayDays(topic) && getDelayDays(topic)! > 0
                                        ? "text-orange-600 font-medium"
                                        : getEarlyDays(topic) && getEarlyDays(topic)! > 0
                                        ? "text-emerald-600 font-medium"
                                        : "text-green-600"
                                    }`}>
                                      Tamamlanma:{" "}
                                      {new Date(topic.progress[0].actualEndDate).toLocaleDateString("tr-TR")}
                                      {getDelayDays(topic) && getDelayDays(topic)! > 0 && (
                                        <span className="ml-2">
                                          ({getDelayDays(topic)} gün gecikme)
                                        </span>
                                      )}
                                      {getEarlyDays(topic) && getEarlyDays(topic)! > 0 && (
                                        <span className="ml-2">
                                          ({getEarlyDays(topic)} gün erken)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {/* Rehberlik danışmanı onay bilgisi */}
                                  {topic.progress?.[0]?.markedByStaff && (
                                    <p className="text-xs mt-1 text-blue-600 font-medium">
                                      Rehberlik {topic.progress[0].markedByStaff.firstName} {topic.progress[0].markedByStaff.lastName} bu konunun tamamlandığını bildirmiştir
                                    </p>
                                  )}
                                  {topic.progress?.[0]?.approvedByStaff && !topic.progress[0].markedByStaff && (
                                    <p className="text-xs mt-1 text-blue-600 font-medium">
                                      Rehberlik {topic.progress[0].approvedByStaff.firstName} {topic.progress[0].approvedByStaff.lastName} bu konunun tamamlandığını onaylamıştır
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTopicComplete(topic.id)}
                                  disabled={updatingTopicId === topic.id || topicStatus.status === "TAMAMLANDI" || topicStatus.status === "GECIKMELI_TAMAMLANDI" || topicStatus.status === "ERKEN_TAMAMLANDI"}
                                  className="text-xs sm:text-sm"
                                >
                                  {updatingTopicId === topic.id ? (
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  )}
                                  {topicStatus.status === "TAMAMLANDI" ? "Tamamlandı" : "Tamamlandı"}
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
                  onClick={() => setShowCompletionDateModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="completionDate" className="text-xs sm:text-sm">
                    Konu Tamamlama Tarihi *
                  </Label>
                  <Input
                    id="completionDate"
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <Button
                  onClick={handleConfirmCompletionDate}
                  disabled={!completionDate || submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

