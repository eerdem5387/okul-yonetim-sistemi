"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import {
  Target,
  Loader2,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  School,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react"

interface Class {
  id: string
  name: string
  grade: number
  section: string | null
}

interface Subject {
  id: string
  name: string
  grade: number
  section: string | null
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

interface DashboardStats {
  totalTopics: number
  completedTopics: number
  inProgressTopics: number
  delayedTopics: number
  plannedTopics: number
  pendingApprovalTopics: number
  completionPercentage: number
  earlyTopics?: number
  lateCompletedTopics?: number
}

export default function OgretmenNeredeyizPage() {
  const router = useRouter()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [staffId, setStaffId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)

  const fetchClasses = useCallback(async (teacherId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teachers/${teacherId}/classes`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        error("Sınıflar yüklenirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error fetching classes:", err)
      error("Sınıflar yüklenirken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }, [error])

  const fetchSubjectsForClass = useCallback(async (classId: string, teacherId: string) => {
    setLoadingSubjects(true)
    try {
      const selectedClassData = classes.find((c) => c.id === classId)
      if (!selectedClassData) return

      const response = await fetch(
        `/api/neredeyiz/subjects?staffId=${teacherId}&grade=${selectedClassData.grade}${selectedClassData.section ? `&section=${selectedClassData.section}` : ""}`
      )
      if (response.ok) {
        const data = await response.json()
        setSubjects(data || [])
        setSelectedClass(selectedClassData)
      } else {
        error("Dersler yüklenirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
      error("Dersler yüklenirken bir hata oluştu!")
    } finally {
      setLoadingSubjects(false)
    }
  }, [classes, error])

  const fetchDashboardStats = useCallback(async (teacherId: string) => {
    try {
      const response = await fetch(`/api/neredeyiz/teachers/dashboard?staffId=${teacherId}`)
      if (response.ok) {
        const data = await response.json()
        // Sınıfa göre filtreleme yapılabilir, şimdilik tüm istatistikleri göster
        setDashboardStats(data.stats)
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffId(id)
      fetchClasses(id)
    }
  }, [router, fetchClasses])

  useEffect(() => {
    if (selectedClassId && staffId) {
      fetchSubjectsForClass(selectedClassId, staffId)
      fetchDashboardStats(staffId)
    } else {
      setSubjects([])
    }
  }, [selectedClassId, staffId, fetchSubjectsForClass, fetchDashboardStats])

  // Dersler yüklendiğinde tüm üniteleri açık tut
  useEffect(() => {
    if (subjects.length > 0) {
      const allUnitIds = new Set<string>()
      subjects.forEach((subject) => {
        subject.units?.forEach((unit) => {
          allUnitIds.add(unit.id)
        })
      })
      setExpandedUnits(allUnitIds)
    }
  }, [subjects])

  const handleMarkComplete = async (topicId: string) => {
    if (!staffId) {
      error("Kullanıcı bilgisi bulunamadı!")
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
        success("Konu tamamlandı olarak işaretlendi ve onay için gönderildi!")
        // Dersleri yeniden yükle
        if (selectedClassId && staffId) {
          await fetchSubjectsForClass(selectedClassId, staffId)
          await fetchDashboardStats(staffId)
        }
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

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits)
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId)
    } else {
      newExpanded.add(unitId)
    }
    setExpandedUnits(newExpanded)
  }

  const getTopicStatus = (topic: Subject["units"][0]["topics"][0]) => {
    const progress = topic.progress?.[0]

    if (progress?.status === "PENDING_APPROVAL") {
      return {
        status: "PENDING_APPROVAL",
        label: "Onay Bekliyor",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: Clock,
      }
    }

    if (progress?.status === "TAMAMLANDI") {
      return {
        status: "TAMAMLANDI",
        label: "Tamamlandı",
        color: "bg-green-100 text-green-800 border-green-300",
        icon: CheckCircle2,
      }
    }

    if (progress?.status === "DEVAM_EDIYOR") {
      return {
        status: "DEVAM_EDIYOR",
        label: "Devam Ediyor",
        color: "bg-blue-100 text-blue-800 border-blue-300",
        icon: Clock,
      }
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (topic.plannedEndDate) {
      const plannedEnd = new Date(topic.plannedEndDate)
      plannedEnd.setHours(0, 0, 0, 0)

      if (now > plannedEnd && !progress) {
        return {
          status: "GECIKMELI",
          label: "Gecikmeli",
          color: "bg-red-100 text-red-800 border-red-300",
          icon: AlertTriangle,
        }
      }
    }

    if (topic.plannedStartDate) {
      const plannedStart = new Date(topic.plannedStartDate)
      plannedStart.setHours(0, 0, 0, 0)

      if (now >= plannedStart) {
        return {
          status: "DEVAM_EDIYOR",
          label: "Devam Ediyor",
          color: "bg-blue-100 text-blue-800 border-blue-300",
          icon: Clock,
        }
      }
    }

    return {
      status: "PLANLANDI",
      label: "Planlandı",
      color: "bg-gray-100 text-gray-800 border-gray-300",
      icon: Calendar,
    }
  }

  // İstatistikleri hesapla
  const calculatedStats = useMemo(() => {
    if (!subjects.length) return null

    let totalTopics = 0
    let completedTopics = 0
    let inProgressTopics = 0
    let delayedTopics = 0
    let plannedTopics = 0
    let pendingApprovalTopics = 0

    subjects.forEach((subject) => {
      subject.units?.forEach((unit) => {
        unit.topics?.forEach((topic) => {
          totalTopics++
          const status = getTopicStatus(topic)
          
          if (status.status === "TAMAMLANDI") {
            completedTopics++
          } else if (status.status === "DEVAM_EDIYOR") {
            inProgressTopics++
          } else if (status.status === "GECIKMELI") {
            delayedTopics++
          } else if (status.status === "PLANLANDI") {
            plannedTopics++
          } else if (status.status === "PENDING_APPROVAL") {
            pendingApprovalTopics++
          }
        })
      })
    })

    return {
      totalTopics,
      completedTopics,
      inProgressTopics,
      delayedTopics,
      plannedTopics,
      pendingApprovalTopics,
      completionPercentage: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
    }
  }, [subjects])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">{/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pl-16 lg:pl-4 sm:pl-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/ogretmen")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Geri
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Target className="h-7 w-7 sm:h-8 sm:w-8" />
            Neredeyiz?
          </h1>
          <p className="text-blue-100 text-sm sm:text-base mt-2">
            İlerleme takibinizi yönetin ve derslerinizi tamamlandı olarak işaretleyin
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!selectedClassId ? (
          /* Sınıf Seçimi */
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sorumlu Olduğunuz Sınıflar</h2>
            {classes.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <School className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Henüz size atanmış sınıf bulunmamaktadır</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {classes.map((classItem) => (
                  <Card
                    key={classItem.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-blue-100 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50"
                    onClick={() => setSelectedClassId(classItem.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-4">
                        <School className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{classItem.name}</h3>
                      <p className="text-sm text-gray-600">
                        {classItem.grade}. Sınıf{classItem.section ? ` - ${classItem.section} Şubesi` : ""}
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                        <span className="text-sm font-medium">Detayları Gör</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Seçilen Sınıf İçin İlerleme Takvimi */
          <div className="space-y-6">
            {/* Geri Dön Butonu ve Sınıf Bilgisi */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedClassId(null)
                    setSelectedClass(null)
                    setSubjects([])
                    setDashboardStats(null)
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Sınıf Seçimine Dön
                </Button>
                {selectedClass && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedClass.name}</h2>
                    <p className="text-sm text-gray-600">
                      {selectedClass.grade}. Sınıf{selectedClass.section ? ` - ${selectedClass.section} Şubesi` : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* İstatistik Kutucukları */}
            {calculatedStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm text-gray-600">Toplam Konu</p>
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {calculatedStats.totalTopics}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm text-gray-600">Tamamlanan</p>
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {calculatedStats.completedTopics}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      %{calculatedStats.completionPercentage}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm text-gray-600">Devam Ediyor</p>
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                      {calculatedStats.inProgressTopics}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm text-gray-600">Gecikmeli</p>
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      {calculatedStats.delayedTopics}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm text-gray-600">Planlandı</p>
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                      {calculatedStats.plannedTopics}
                    </p>
                  </CardContent>
                </Card>

                {calculatedStats.pendingApprovalTopics > 0 && (
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs sm:text-sm text-gray-600">Onay Bekliyor</p>
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">
                        {calculatedStats.pendingApprovalTopics}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Dersler ve İlerleme Takvimi */}
            {loadingSubjects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : subjects.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Bu sınıf için size atanmış ders bulunmamaktadır</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {subjects.map((subject) => (
                  <Card key={subject.id} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        {subject.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {subject.units && subject.units.length > 0 ? (
                        <div className="space-y-3">
                          {subject.units.map((unit) => (
                            <div key={unit.id} className="border rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleUnit(unit.id)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {expandedUnits.has(unit.id) ? (
                                    <ChevronDown className="h-5 w-5 text-gray-600" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-gray-600" />
                                  )}
                                  <span className="font-semibold text-gray-900">{unit.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({unit.topics?.length || 0} konu)
                                  </span>
                                </div>
                              </button>
                              {expandedUnits.has(unit.id) && (
                                <div className="p-4 space-y-2 bg-white">
                                  {unit.topics?.map((topic) => {
                                    const status = getTopicStatus(topic)
                                    const StatusIcon = status.icon
                                    const canMarkComplete =
                                      status.status !== "TAMAMLANDI" &&
                                      status.status !== "PENDING_APPROVAL"

                                    return (
                                      <div
                                        key={topic.id}
                                        className={`flex items-center justify-between p-3 border-2 rounded-lg ${status.color}`}
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <StatusIcon className="h-5 w-5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">{topic.name}</p>
                                            {topic.plannedStartDate && topic.plannedEndDate && (
                                              <p className="text-xs text-gray-600 mt-1">
                                                {new Date(topic.plannedStartDate).toLocaleDateString("tr-TR")} -{" "}
                                                {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR")}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/50">
                                            {status.label}
                                          </span>
                                          {canMarkComplete && (
                                            <Button
                                              size="sm"
                                              onClick={() => handleMarkComplete(topic.id)}
                                              disabled={updatingTopicId === topic.id}
                                              className="bg-blue-600 hover:bg-blue-700"
                                            >
                                              {updatingTopicId === topic.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <>
                                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                                  Tamamla
                                                </>
                                              )}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">Bu ders için ünite bulunmamaktadır</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

