"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
// Toast notifications will be handled via success/error functions
import {
  BookOpen,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"

interface Subject {
  id: string
  name: string
  grade: number
  section: string | null
  academicYear: {
    id: string
    name: string
  }
  units: Array<{
    id: string
    name: string
    order: number
    topics: Array<{
      id: string
      name: string
      order: number
      plannedStartDate: string | null
      plannedEndDate: string | null
      progress: Array<{
        id: string
        status: string
        actualEndDate: string | null
        reportedBy: string | null
        reportedAt: string | null
      }>
    }>
  }>
}

export default function OgretmenDersDetayPage() {
  const params = useParams()
  const router = useRouter()
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [staffId, setStaffId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffId(id)
    }

    if (params.id) {
      fetchSubject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

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
        setToastMessage({ type: "error", message: "Ders yüklenirken hata oluştu!" })
        router.push("/ogretmen")
      }
    } catch (err) {
      console.error("Error fetching subject:", err)
      setToastMessage({ type: "error", message: "Ders yüklenirken hata oluştu!" })
      router.push("/ogretmen")
    } finally {
      setLoading(false)
    }
  }

  const getTopicStatus = (topic: Subject["units"][0]["topics"][0]): {
    status: "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "GECIKMELI" | "PENDING_APPROVAL"
    label: string
    color: string
    icon: React.ComponentType<{ className?: string }>
  } => {
    const progress = topic.progress?.[0]

    if (progress?.status === "PENDING_APPROVAL") {
      return {
        status: "PENDING_APPROVAL",
        label: "Onay Bekliyor",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      }
    }

    if (progress?.status === "TAMAMLANDI") {
      return {
        status: "TAMAMLANDI",
        label: "Tamamlandı",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle2,
      }
    }

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

    return {
      status: "PLANLANDI",
      label: "Planlandı",
      color: "bg-blue-100 text-blue-800",
      icon: Calendar,
    }
  }

  const handleMarkComplete = async (topicId: string) => {
    if (!staffId) {
      setToastMessage({ type: "error", message: "Kullanıcı bilgisi bulunamadı!" })
      return
    }

    setUpdatingTopicId(topicId)

    try {
      const response = await fetch("/api/neredeyiz/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          status: "PENDING_APPROVAL",
          actualEndDate: new Date().toISOString(),
          reportedBy: staffId,
          reportedAt: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        setToastMessage({ type: "success", message: "Konu tamamlandı olarak işaretlendi ve onay için gönderildi!" })
        await fetchSubject()
        setTimeout(() => setToastMessage(null), 5000)
      } else {
        const errorData = await response.json()
        setToastMessage({ type: "error", message: errorData.error || "Konu işaretlenirken hata oluştu!" })
        setTimeout(() => setToastMessage(null), 5000)
      }
    } catch (err) {
      console.error("Error marking topic complete:", err)
      setToastMessage({ type: "error", message: "Konu işaretlenirken bir hata oluştu!" })
      setTimeout(() => setToastMessage(null), 5000)
    } finally {
      setUpdatingTopicId(null)
    }
  }

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits)
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId)
    } else {
      newExpanded.add(unitId)
    }
    setExpandedUnits(newExpanded)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Ders bulunamadı</p>
            <Link href="/ogretmen">
              <Button variant="outline" size="sm" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toastMessage.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          <p className="font-medium">{toastMessage.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Link href="/ogretmen">
          <Button variant="outline" size="sm" className="mb-4">
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
            {subject.academicYear.name} - Yıllık Plan
          </p>
        </div>
      </div>

      {/* Üniteler ve Konular */}
      {subject.units.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Bu derste henüz ünite tanımlanmamış</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {subject.units.map((unit) => {
            const isExpanded = expandedUnits.has(unit.id)

            return (
              <div
                key={unit.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
              >
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                      {unit.name}
                    </h3>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400 ml-2" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {unit.topics.length === 0 ? (
                      <div className="px-4 py-3 text-center text-sm text-gray-500">
                        Bu ünitede henüz konu tanımlanmamış
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {unit.topics.map((topic) => {
                          const topicStatus = getTopicStatus(topic)
                          const StatusIcon = topicStatus.icon

                          return (
                            <div
                              key={topic.id}
                              className="px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-sm sm:text-base text-gray-900">
                                      {topic.name}
                                    </h4>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${topicStatus.color}`}
                                    >
                                      <StatusIcon className="h-3 w-3" />
                                      {topicStatus.label}
                                    </span>
                                  </div>
                                  {topic.plannedStartDate && topic.plannedEndDate && (
                                    <p className="text-xs text-gray-500">
                                      {new Date(topic.plannedStartDate).toLocaleDateString("tr-TR")} -{" "}
                                      {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR")}
                                    </p>
                                  )}
                                  {topic.progress?.[0]?.reportedAt && (
                                    <p className="text-xs text-yellow-600 mt-1">
                                      İşaretleme: {new Date(topic.progress[0].reportedAt).toLocaleDateString("tr-TR")} (Onay bekliyor)
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkComplete(topic.id)}
                                  disabled={
                                    updatingTopicId === topic.id ||
                                    topicStatus.status === "TAMAMLANDI" ||
                                    topicStatus.status === "PENDING_APPROVAL"
                                  }
                                  className="text-xs sm:text-sm"
                                >
                                  {updatingTopicId === topic.id ? (
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  )}
                                  {topicStatus.status === "PENDING_APPROVAL"
                                    ? "Onay Bekliyor"
                                    : topicStatus.status === "TAMAMLANDI"
                                    ? "Tamamlandı"
                                    : "Tamamladım"}
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
    </div>
  )
}

