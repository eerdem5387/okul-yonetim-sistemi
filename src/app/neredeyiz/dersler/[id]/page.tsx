"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { getAuthHeaders } from "@/components/hr/hr-utils"
import {
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  Calendar,
  UserPlus,
  XCircle,
} from "lucide-react"

interface Subject {
  id: string
  name: string
  code: string | null
  academicYearId: string
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
    order: number
    topics: Array<{
      id: string
      name: string
      order: number
      plannedStartDate: string | null
      plannedEndDate: string | null
      plannedStartWeek: number | null
      plannedEndWeek: number | null
      estimatedDuration: number | null
      progress: Array<{
        id: string
        status: string
        actualEndDate: string | null
      }>
    }>
  }>
}

export default function DersDetayPage() {
  const params = useParams()
  const { success, error } = useToast()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<{ id: string; name: string; order: number } | null>(null)
  const [editingTopic, setEditingTopic] = useState<{
    id: string
    name: string
    order: number
    plannedStartWeek: number | null
    plannedEndWeek: number | null
    plannedStartDate: string | null
    plannedEndDate: string | null
    estimatedDuration: number | null
  } | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string>("")
  const [showTeacherForm, setShowTeacherForm] = useState(false)
  const [availableTeachers, setAvailableTeachers] = useState<Array<{
    id: string
    firstName: string
    lastName: string
    subject: string | null
  }>>([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [assigningTeacher, setAssigningTeacher] = useState(false)
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("")

  const [unitFormData, setUnitFormData] = useState({
    name: "",
    order: 1,
    description: "",
  })

  const [topicFormData, setTopicFormData] = useState({
    name: "",
    order: 1,
    plannedStartWeek: "",
    plannedEndWeek: "",
    plannedStartDate: "",
    plannedEndDate: "",
    estimatedDuration: "",
    description: "",
    hasTimeRange: true, // Varsayılan olarak tarih aralığı var
  })

  useEffect(() => {
    if (params.id) {
      fetchSubject()
      fetchAvailableTeachers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchSubject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/neredeyiz/subjects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSubject(data)
        // İlk üniteyi açık tut
        if (data.units && data.units.length > 0) {
          setExpandedUnits(new Set([data.units[0].id]))
        }
      } else {
        error("Ders bilgileri yüklenirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error fetching subject:", err)
      error("Ders bilgileri yüklenirken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableTeachers = async () => {
    try {
      setLoadingTeachers(true)
      const response = await fetch("/api/staff/pickers?type=teachers", {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableTeachers(data.staff || [])
      }
    } catch (err) {
      console.error("Error fetching teachers:", err)
    } finally {
      setLoadingTeachers(false)
    }
  }

  const handleAssignTeacher = async (staffId: string) => {
    setAssigningTeacher(true)
    try {
      const response = await fetch(`/api/neredeyiz/subjects/${params.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      })

      if (response.ok) {
        success("Öğretmen başarıyla atandı!")
        await fetchSubject()
        setShowTeacherForm(false)
      } else {
        const errorData = await response.json()
        error(errorData.error || "Öğretmen atanırken hata oluştu!")
      }
    } catch (err) {
      console.error("Error assigning teacher:", err)
      error("Öğretmen atanırken bir hata oluştu!")
    } finally {
      setAssigningTeacher(false)
    }
  }

  const handleRemoveTeacher = async (staffId: string) => {
    const assignment = subject?.assignments.find((a) => a.staff.id === staffId)
    if (
      !window.confirm(
        `${assignment?.staff.firstName} ${assignment?.staff.lastName} öğretmeninin atamasını kaldırmak istediğinizden emin misiniz?`
      )
    ) {
      return
    }

    try {
      const response = await fetch(
        `/api/neredeyiz/subjects/${params.id}/assignments?staffId=${staffId}`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        success("Öğretmen ataması başarıyla kaldırıldı!")
        await fetchSubject()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Atama kaldırılırken hata oluştu!")
      }
    } catch (err) {
      console.error("Error removing teacher:", err)
      error("Atama kaldırılırken bir hata oluştu!")
    }
  }

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingUnit
        ? `/api/neredeyiz/units/${editingUnit.id}`
        : "/api/neredeyiz/units"
      const method = editingUnit ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...unitFormData,
          subjectId: params.id,
        }),
      })

      if (response.ok) {
        success(
          editingUnit ? "Ünite başarıyla güncellendi!" : "Ünite başarıyla eklendi!"
        )
        await fetchSubject()
        setShowUnitForm(false)
        setEditingUnit(null)
        setUnitFormData({
          name: "",
          order: 1,
          description: "",
        })
      } else {
        const errorData = await response.json()
        error(errorData.error || "Ünite kaydedilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error saving unit:", err)
      error("Ünite kaydedilirken bir hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnitId) {
      error("Lütfen bir ünite seçin!")
      return
    }

    setSubmitting(true)

    try {
      const url = editingTopic
        ? `/api/neredeyiz/topics/${editingTopic.id}`
        : "/api/neredeyiz/topics"
      const method = editingTopic ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...topicFormData,
          unitId: selectedUnitId,
          plannedStartWeek: topicFormData.hasTimeRange ? (topicFormData.plannedStartWeek || null) : null,
          plannedEndWeek: topicFormData.hasTimeRange ? (topicFormData.plannedEndWeek || null) : null,
          plannedStartDate: topicFormData.hasTimeRange ? (topicFormData.plannedStartDate || null) : null,
          plannedEndDate: topicFormData.hasTimeRange ? (topicFormData.plannedEndDate || null) : null,
          estimatedDuration: topicFormData.estimatedDuration || null,
        }),
      })

      if (response.ok) {
        success(
          editingTopic ? "Konu başarıyla güncellendi!" : "Konu başarıyla eklendi!"
        )
        await fetchSubject()
        setShowTopicForm(false)
        setEditingTopic(null)
        setSelectedUnitId("")
        setTopicFormData({
          name: "",
          order: 1,
          plannedStartWeek: "",
          plannedEndWeek: "",
          plannedStartDate: "",
          plannedEndDate: "",
          estimatedDuration: "",
          description: "",
          hasTimeRange: true,
        })
      } else {
        const errorData = await response.json()
        error(errorData.error || "Konu kaydedilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error saving topic:", err)
      error("Konu kaydedilirken bir hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUnit = async (id: string) => {
    const unit = subject?.units.find((u) => u.id === id)
    if (
      !confirm(
        `"${unit?.name}" ünitesini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve tüm konular silinecektir.`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/neredeyiz/units/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        success("Ünite başarıyla silindi!")
        await fetchSubject()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Ünite silinirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error deleting unit:", err)
      error("Ünite silinirken bir hata oluştu!")
    }
  }

  const handleDeleteTopic = async (id: string) => {
    const topic = (subject?.units || [])
      .flatMap((u) => u.topics || [])
      .find((t) => t.id === id)
    if (
      !confirm(
        `"${topic?.name}" konusunu silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/neredeyiz/topics/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        success("Konu başarıyla silindi!")
        await fetchSubject()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Konu silinirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error deleting topic:", err)
      error("Konu silinirken bir hata oluştu!")
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

  const getTopicStatus = (topic: {
    progress?: Array<{
      id: string
      status: string
      actualEndDate: string | null
    }>
  }) => {
    const progress = topic.progress?.[0]
    if (progress) {
      if (progress.status === "TAMAMLANDI") {
        return { label: "Tamamlandı", color: "bg-green-100 text-green-800" }
      } else if (progress.status === "DEVAM_EDIYOR") {
        return { label: "Devam Ediyor", color: "bg-yellow-100 text-yellow-800" }
      } else if (progress.status === "ERTELENDI") {
        return { label: "Ertelendi", color: "bg-red-100 text-red-800" }
      }
    }
    return { label: "Planlandı", color: "bg-gray-100 text-gray-800" }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="p-3 sm:p-4 md:p-6">
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <p className="text-gray-500">Ders bulunamadı</p>
            <Link href="/yonetim/ayarlar">
              <Button variant="outline" className="mt-4">
                Ayarlara dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative">{/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 truncate">
                {subject.name}
              </h1>
              {subject.code && (
                <p className="text-gray-600 mt-1 text-sm">Kod: {subject.code}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setShowUnitForm(true)
                setEditingUnit(null)
                setUnitFormData({
                  name: "",
                  order: (subject.units?.length || 0) + 1,
                  description: "",
                })
              }}
              className="text-xs sm:text-sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Yeni Ünite
            </Button>
          </div>
        </div>
      </div>

      {/* Öğretmen Atamaları */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Öğretmenler
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowTeacherForm(true)}
              className="text-xs sm:text-sm"
            >
              <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Öğretmen Ata
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          {subject.assignments && subject.assignments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {subject.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium group"
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>
                    {assignment.staff.firstName} {assignment.staff.lastName}
                  </span>
                  <button
                    onClick={() => handleRemoveTeacher(assignment.staff.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                    title="Atamayı kaldır"
                  >
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-xs sm:text-sm">
                Henüz öğretmen atanmamış
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Üniteler ve Konular */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="text-base sm:text-lg">Yıllık Plan</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          {subject.units && subject.units.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {(subject.units || []).map((unit) => (
                <div key={unit.id} className="border border-gray-200 rounded-lg">
                  {/* Ünite Header */}
                  <div
                    className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => toggleUnit(unit.id)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1">
                      {expandedUnits.has(unit.id) ? (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                      )}
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                        {unit.order}. {unit.name}
                      </h3>
                      <span className="text-xs sm:text-sm text-gray-500">
                        ({unit.topics?.length || 0} konu)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingUnit({
                            id: unit.id,
                            name: unit.name,
                            order: unit.order,
                          })
                          setUnitFormData({
                            name: unit.name,
                            order: unit.order,
                            description: "",
                          })
                          setShowUnitForm(true)
                        }}
                        className="text-xs sm:text-sm"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteUnit(unit.id)
                        }}
                        className="text-xs sm:text-sm text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Konular */}
                  {expandedUnits.has(unit.id) && (
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      {unit.topics && unit.topics.length > 0 ? (
                        <>
                          {(unit.topics || []).map((topic) => {
                            const status = getTopicStatus(topic)
                            return (
                              <div
                                key={topic.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                    <span className="text-xs sm:text-sm font-medium text-gray-500">
                                      {topic.order}.
                                    </span>
                                    <h4 className="font-medium text-sm sm:text-base text-gray-900">
                                      {topic.name}
                                    </h4>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${status.color}`}
                                    >
                                      {status.label}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 ml-5 sm:ml-6">
                                    {topic.plannedStartDate && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(topic.plannedStartDate).toLocaleDateString("tr-TR")}
                                        {topic.plannedEndDate && (
                                          <> - {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR")}</>
                                        )}
                                      </div>
                                    )}
                                    {topic.plannedStartWeek && (
                                      <span>
                                        Hafta: {topic.plannedStartWeek}
                                        {topic.plannedEndWeek && `-${topic.plannedEndWeek}`}
                                      </span>
                                    )}
                                    {topic.estimatedDuration && (
                                      <span>Tahmini: {topic.estimatedDuration} gün</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTopic(topic)
                                      setSelectedUnitId(unit.id)
                                      const hasTimeRange = !!(topic.plannedStartDate || topic.plannedEndDate)
                                      setTopicFormData({
                                        name: topic.name,
                                        order: topic.order,
                                        plannedStartWeek: topic.plannedStartWeek?.toString() || "",
                                        plannedEndWeek: topic.plannedEndWeek?.toString() || "",
                                        plannedStartDate: topic.plannedStartDate
                                          ? topic.plannedStartDate.split("T")[0]
                                          : "",
                                        plannedEndDate: topic.plannedEndDate
                                          ? topic.plannedEndDate.split("T")[0]
                                          : "",
                                        estimatedDuration: topic.estimatedDuration?.toString() || "",
                                        description: "",
                                        hasTimeRange,
                                      })
                                      setShowTopicForm(true)
                                    }}
                                    className="text-xs sm:text-sm"
                                  >
                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Düzenle
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteTopic(topic.id)}
                                    className="text-xs sm:text-sm"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Sil
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUnitId(unit.id)
                              setShowTopicForm(true)
                              setEditingTopic(null)
                              setTopicFormData({
                                name: "",
                                order: (unit.topics?.length || 0) + 1,
                                plannedStartWeek: "",
                                plannedEndWeek: "",
                                plannedStartDate: "",
                                plannedEndDate: "",
                                estimatedDuration: "",
                                description: "",
                                hasTimeRange: true,
                              })
                            }}
                            className="w-full text-xs sm:text-sm"
                          >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Bu Üniteye Konu Ekle
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-xs sm:text-sm mb-2">
                            Bu ünitede henüz konu yok
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUnitId(unit.id)
                              setShowTopicForm(true)
                              setEditingTopic(null)
                              setTopicFormData({
                                name: "",
                                order: 1,
                                plannedStartWeek: "",
                                plannedEndWeek: "",
                                plannedStartDate: "",
                                plannedEndDate: "",
                                estimatedDuration: "",
                                description: "",
                                hasTimeRange: true,
                              })
                            }}
                            className="text-xs sm:text-sm"
                          >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            İlk Konuyu Ekle
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
                Henüz ünite tanımlanmamış
              </p>
              <p className="text-gray-400 text-xs sm:text-sm mb-4">
                Yıllık planı oluşturmak için ünite ekleyin.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setShowUnitForm(true)
                  setEditingUnit(null)
                  setUnitFormData({
                    name: "",
                    order: 1,
                    description: "",
                  })
                }}
                className="text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                İlk Üniteyi Ekle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ünite Form Modal */}
      {showUnitForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  {editingUnit ? "Ünite Düzenle" : "Yeni Ünite Ekle"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowUnitForm(false)
                    setEditingUnit(null)
                    setUnitFormData({
                      name: "",
                      order: 1,
                      description: "",
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <form onSubmit={handleUnitSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="unitName" className="text-xs sm:text-sm">
                    Ünite Adı *
                  </Label>
                  <Input
                    id="unitName"
                    value={unitFormData.name}
                    onChange={(e) =>
                      setUnitFormData({ ...unitFormData, name: e.target.value })
                    }
                    placeholder="Örn: Üçgenler"
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="unitOrder" className="text-xs sm:text-sm">
                    Sıra *
                  </Label>
                  <Input
                    id="unitOrder"
                    type="number"
                    min="1"
                    value={unitFormData.order}
                    onChange={(e) =>
                      setUnitFormData({
                        ...unitFormData,
                        order: parseInt(e.target.value) || 1,
                      })
                    }
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {editingUnit ? "Güncelle" : "Kaydet"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowUnitForm(false)
                      setEditingUnit(null)
                      setUnitFormData({
                        name: "",
                        order: 1,
                        description: "",
                      })
                    }}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Konu Form Modal */}
      {showTopicForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  {editingTopic ? "Konu Düzenle" : "Yeni Konu Ekle"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTopicForm(false)
                    setEditingTopic(null)
                    setSelectedUnitId("")
                    setTopicFormData({
                      name: "",
                      order: 1,
                      plannedStartWeek: "",
                      plannedEndWeek: "",
                      plannedStartDate: "",
                      plannedEndDate: "",
                      estimatedDuration: "",
                      description: "",
                      hasTimeRange: true,
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <form onSubmit={handleTopicSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="topicName" className="text-xs sm:text-sm">
                      Konu Adı *
                    </Label>
                    <Input
                      id="topicName"
                      value={topicFormData.name}
                      onChange={(e) =>
                        setTopicFormData({ ...topicFormData, name: e.target.value })
                      }
                      placeholder="Örn: Üçgenin İç Açıları"
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="topicOrder" className="text-xs sm:text-sm">
                      Sıra *
                    </Label>
                    <Input
                      id="topicOrder"
                      type="number"
                      min="1"
                      value={topicFormData.order}
                      onChange={(e) =>
                        setTopicFormData({
                          ...topicFormData,
                          order: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="plannedStartWeek" className="text-xs sm:text-sm">
                      Planlanan Başlangıç Haftası
                    </Label>
                    <Input
                      id="plannedStartWeek"
                      type="number"
                      min="1"
                      value={topicFormData.plannedStartWeek}
                      onChange={(e) =>
                        setTopicFormData({
                          ...topicFormData,
                          plannedStartWeek: e.target.value,
                        })
                      }
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plannedEndWeek" className="text-xs sm:text-sm">
                      Planlanan Bitiş Haftası
                    </Label>
                    <Input
                      id="plannedEndWeek"
                      type="number"
                      min="1"
                      value={topicFormData.plannedEndWeek}
                      onChange={(e) =>
                        setTopicFormData({
                          ...topicFormData,
                          plannedEndWeek: e.target.value,
                        })
                      }
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="hasTimeRange"
                    checked={topicFormData.hasTimeRange}
                    onChange={(e) =>
                      setTopicFormData({
                        ...topicFormData,
                        hasTimeRange: e.target.checked,
                        // Checkbox kapatıldığında tarihleri temizle
                        plannedStartDate: e.target.checked ? topicFormData.plannedStartDate : "",
                        plannedEndDate: e.target.checked ? topicFormData.plannedEndDate : "",
                        plannedStartWeek: e.target.checked ? topicFormData.plannedStartWeek : "",
                        plannedEndWeek: e.target.checked ? topicFormData.plannedEndWeek : "",
                      })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="hasTimeRange" className="text-xs sm:text-sm cursor-pointer">
                    Belirli bir zaman aralığı olsun
                  </Label>
                </div>

                {topicFormData.hasTimeRange && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="plannedStartDate" className="text-xs sm:text-sm">
                        Planlanan Başlangıç Tarihi
                      </Label>
                      <Input
                        id="plannedStartDate"
                        type="date"
                        value={topicFormData.plannedStartDate}
                        onChange={(e) =>
                          setTopicFormData({
                            ...topicFormData,
                            plannedStartDate: e.target.value,
                          })
                        }
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plannedEndDate" className="text-xs sm:text-sm">
                        Planlanan Bitiş Tarihi
                      </Label>
                      <Input
                        id="plannedEndDate"
                        type="date"
                        value={topicFormData.plannedEndDate}
                        onChange={(e) =>
                          setTopicFormData({
                            ...topicFormData,
                            plannedEndDate: e.target.value,
                          })
                        }
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="estimatedDuration" className="text-xs sm:text-sm">
                    Tahmini Süre (Gün)
                  </Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    min="1"
                    value={topicFormData.estimatedDuration}
                    onChange={(e) =>
                      setTopicFormData({
                        ...topicFormData,
                        estimatedDuration: e.target.value,
                      })
                    }
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {editingTopic ? "Güncelle" : "Kaydet"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowTopicForm(false)
                      setEditingTopic(null)
                      setSelectedUnitId("")
                      setTopicFormData({
                        name: "",
                        order: 1,
                        plannedStartWeek: "",
                        plannedEndWeek: "",
                        plannedStartDate: "",
                        plannedEndDate: "",
                        estimatedDuration: "",
                        description: "",
                        hasTimeRange: true,
                      })
                    }}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Öğretmen Atama Modal */}
      {showTeacherForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  Öğretmen Ata
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTeacherForm(false)
                    setTeacherSearchTerm("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              {loadingTeachers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : availableTeachers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
                    Henüz öğretmen tanımlanmamış
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Personel Yönetimi sayfasından öğretmen ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <>
                  {/* Arama Input */}
                  <div className="mb-4">
                    <div className="relative">
                      <Input
                        placeholder="Öğretmen ara..."
                        value={teacherSearchTerm}
                        onChange={(e) => setTeacherSearchTerm(e.target.value)}
                        className="h-9 sm:h-10 text-xs sm:text-sm pl-9"
                      />
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {(() => {
                      const filteredTeachers = availableTeachers.filter((teacher) => {
                        // Zaten atanmış öğretmenleri filtrele
                        const isNotAssigned = !subject?.assignments?.some(
                          (a) => a.staff.id === teacher.id
                        )
                        // Arama terimine göre filtrele
                        if (!isNotAssigned) return false
                        if (!teacherSearchTerm.trim()) return true
                        const searchLower = teacherSearchTerm.toLowerCase().trim()
                        const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase()
                        const subjectName = teacher.subject?.toLowerCase() || ""
                        return fullName.includes(searchLower) || subjectName.includes(searchLower)
                      })

                      if (filteredTeachers.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">
                              {teacherSearchTerm.trim()
                                ? "Arama kriterlerine uygun öğretmen bulunamadı"
                                : "Tüm öğretmenler zaten bu derse atanmış"}
                            </p>
                          </div>
                        )
                      }

                      return filteredTeachers.map((teacher) => (
                        <div
                          key={teacher.id}
                          className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm sm:text-base text-gray-900">
                              {teacher.firstName} {teacher.lastName}
                            </div>
                            {teacher.subject && (
                              <div className="text-xs sm:text-sm text-gray-600 mt-1">
                                Branş: {teacher.subject}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAssignTeacher(teacher.id)}
                            disabled={assigningTeacher}
                            className="text-xs sm:text-sm"
                          >
                            {assigningTeacher ? (
                              <>
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                Atanıyor...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Ata
                              </>
                            )}
                          </Button>
                        </div>
                      ))
                    })()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

