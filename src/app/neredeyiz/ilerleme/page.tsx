"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ToastContainer, useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
  BookOpen,
  TrendingUp,
  XCircle,
} from "lucide-react"
import Link from "next/link"

interface AcademicYear {
  id: string
  name: string
  isActive: boolean
}

interface Subject {
  id: string
  name: string
  units: Array<{
    id: string
    name: string
    topics: Array<{
      id: string
      name: string
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
  plannedEndDate: string | null
  progress: Array<{
    id: string
    status: string
    actualEndDate: string | null
    markedAt: string | null
  }>
}

export default function IlerlemePage() {
  const { toasts, success, error, removeToast } = useToast()
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null)

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
      const response = await fetch(
        `/api/neredeyiz/subjects?academicYearId=${selectedYearId}`
      )
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
        if (data.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(data[0].id)
        }
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
      error("Dersler yüklenirken hata oluştu!")
    }
  }

  const handleMarkComplete = async (topicId: string) => {
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
    if (progress) {
      if (progress.status === "TAMAMLANDI") {
        return {
          label: "Tamamlandı",
          color: "bg-green-100 text-green-800",
          icon: CheckCircle2,
        }
      } else if (progress.status === "DEVAM_EDIYOR") {
        return {
          label: "Devam Ediyor",
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
        }
      } else if (progress.status === "ERTELENDI") {
        return {
          label: "Ertelendi",
          color: "bg-red-100 text-red-800",
          icon: XCircle,
        }
      }
    }
    return {
      label: "Planlandı",
      color: "bg-gray-100 text-gray-800",
      icon: Calendar,
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

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)
  const allTopics = selectedSubject?.units.flatMap((unit) =>
    unit.topics.map((topic) => ({
      ...topic,
      unitName: unit.name,
    }))
  ) || []

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Link href="/neredeyiz">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              İlerleme Takibi
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
              Konuların tamamlanma durumunu işaretleyin
            </p>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-sm sm:text-base">Akademik Yıl</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedYearId}
              onChange={(e) => {
                setSelectedYearId(e.target.value)
                setSelectedSubjectId("")
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
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-sm sm:text-base">Ders</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Dersler</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Konular Listesi */}
      {selectedSubjectId && selectedSubject ? (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              {selectedSubject.name} - Konular
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {allTopics.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm sm:text-base">
                  Bu derste henüz konu tanımlanmamış
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {selectedSubject.units.map((unit) =>
                  unit.topics.map((topic) => {
                    const status = getTopicStatus(topic)
                    const delayDays = getDelayDays(topic)
                    const StatusIcon = status.icon

                    return (
                      <div
                        key={topic.id}
                        className="border-l-4 border-l-blue-500 p-3 sm:p-4 bg-gray-50 rounded-r-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1">
                              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                                {unit.name} - {topic.name}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium ${status.color}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </span>
                              {delayDays !== null && delayDays > 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-[10px] sm:text-xs font-medium">
                                  {delayDays} gün gecikme
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 ml-0 sm:ml-5">
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
                          <div className="flex gap-2">
                            {topic.progress?.[0]?.status !== "TAMAMLANDI" && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkComplete(topic.id)}
                                disabled={updatingTopicId === topic.id}
                                className="text-xs sm:text-sm bg-green-600 hover:bg-green-700"
                              >
                                {updatingTopicId === topic.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                                    İşleniyor...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Tamamlandı İşaretle
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
                                className="text-xs sm:text-sm"
                              >
                                {updatingTopicId === topic.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                                    İşleniyor...
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Devam Ediyor İşaretle
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
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
              İlerleme takibi için ders seçin
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              Yukarıdaki filtrelerden bir ders seçerek konuları görüntüleyebilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

