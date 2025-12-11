"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToastContainer, useToast } from "@/components/ui/toast"
import {
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  Calendar,
  ArrowLeft,
  FileText,
} from "lucide-react"
import Link from "next/link"

interface AcademicYear {
  id: string
  name: string
  isActive: boolean
}

interface Disruption {
  id: string
  type: string
  reason: string
  startDate: string
  endDate: string
  affectedSubjects: string[]
  createdAt: string
}

interface Subject {
  id: string
  name: string
}

const disruptionTypeLabels: Record<string, string> = {
  PLANLI_OKUL: "Planlı/Okul Kaynaklı",
  PLANDISI_DOGAL: "Plan Dışı/Doğal",
  OGRETMEN_KAYNAKLI: "Öğretmen Kaynaklı",
}

export default function AksamalarPage() {
  const { toasts, success, error, removeToast } = useToast()
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [disruptions, setDisruptions] = useState<Disruption[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingDisruption, setEditingDisruption] = useState<Disruption | null>(null)

  const [formData, setFormData] = useState({
    type: "PLANLI_OKUL",
    reason: "",
    startDate: "",
    endDate: "",
    affectedSubjects: [] as string[],
  })

  useEffect(() => {
    fetchAcademicYears()
  }, [])

  useEffect(() => {
    if (selectedYearId) {
      fetchDisruptions()
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

  const fetchDisruptions = async () => {
    if (!selectedYearId) return

    try {
      const response = await fetch(
        `/api/neredeyiz/disruptions?academicYearId=${selectedYearId}`
      )
      if (response.ok) {
        const data = await response.json()
        setDisruptions(data)
      }
    } catch (err) {
      console.error("Error fetching disruptions:", err)
      error("Aksamalar yüklenirken hata oluştu!")
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
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedYearId) {
      error("Lütfen bir akademik yıl seçin!")
      return
    }

    setSubmitting(true)

    try {
      const url = editingDisruption
        ? `/api/neredeyiz/disruptions/${editingDisruption.id}`
        : "/api/neredeyiz/disruptions"
      const method = editingDisruption ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          academicYearId: selectedYearId,
        }),
      })

      if (response.ok) {
        success(
          editingDisruption
            ? "Aksama başarıyla güncellendi!"
            : "Aksama başarıyla eklendi!"
        )
        await fetchDisruptions()
        setShowForm(false)
        setEditingDisruption(null)
        setFormData({
          type: "PLANLI_OKUL",
          reason: "",
          startDate: "",
          endDate: "",
          affectedSubjects: [],
        })
      } else {
        const errorData = await response.json()
        error(errorData.error || "Aksama kaydedilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error saving disruption:", err)
      error("Aksama kaydedilirken bir hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const disruption = disruptions.find((d) => d.id === id)
    if (
      !confirm(
        `Bu aksamayı silmek istediğinizden emin misiniz?\n\nSebep: ${disruption?.reason}\n\nBu işlem geri alınamaz.`
      )
    ) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/neredeyiz/disruptions/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        success("Aksama başarıyla silindi!")
        await fetchDisruptions()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Aksama silinirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error deleting disruption:", err)
      error("Aksama silinirken bir hata oluştu!")
    } finally {
      setDeletingId(null)
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Link href="/neredeyiz">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Aksama Yönetimi
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
              Plan dışı gelişmeleri kaydedin ve yönetin
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowForm(true)
            setEditingDisruption(null)
            setFormData({
              type: "PLANLI_OKUL",
              reason: "",
              startDate: "",
              endDate: "",
              affectedSubjects: [],
            })
          }}
          disabled={!selectedYearId}
          className="text-xs sm:text-sm"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Yeni Aksama Ekle
        </Button>
      </div>

      {/* Akademik Yıl Seçimi */}
      {academicYears.length > 0 && (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg">Akademik Yıl Seç</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
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
      )}

      {/* Aksamalar Listesi */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            Aksamalar
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          {!selectedYearId ? (
            <div className="text-center py-8 sm:py-12">
              <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
                Önce akademik yıl seçmeniz gerekiyor
              </p>
            </div>
          ) : disruptions.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
                Henüz aksama kaydı bulunmamaktadır
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">
                Yeni aksama eklemek için butona tıklayın.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {disruptions.map((disruption) => {
                const days = calculateDays(disruption.startDate, disruption.endDate)
                return (
                  <div
                    key={disruption.id}
                    className="border-l-4 border-l-orange-500 p-3 sm:p-4 bg-gray-50 rounded-r-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            {disruptionTypeLabels[disruption.type] || disruption.type}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-600">
                            {days} gün
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                          {disruption.reason}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            {new Date(disruption.startDate).toLocaleDateString("tr-TR")} -{" "}
                            {new Date(disruption.endDate).toLocaleDateString("tr-TR")}
                          </div>
                        </div>
                        {disruption.affectedSubjects.length > 0 && (
                          <div className="mt-2 text-xs sm:text-sm text-gray-600">
                            Etkilenen Dersler: {disruption.affectedSubjects.length} ders
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDisruption(disruption)
                            setFormData({
                              type: disruption.type,
                              reason: disruption.reason,
                              startDate: disruption.startDate.split("T")[0],
                              endDate: disruption.endDate.split("T")[0],
                              affectedSubjects: disruption.affectedSubjects,
                            })
                            setShowForm(true)
                          }}
                          className="text-xs sm:text-sm"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Düzenle
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(disruption.id)}
                          disabled={deletingId === disruption.id}
                          className="text-xs sm:text-sm"
                        >
                          {deletingId === disruption.id ? (
                            <>
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                              Siliniyor...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Sil
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aksama Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  {editingDisruption ? "Aksama Düzenle" : "Yeni Aksama Ekle"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setEditingDisruption(null)
                    setFormData({
                      type: "PLANLI_OKUL",
                      reason: "",
                      startDate: "",
                      endDate: "",
                      affectedSubjects: [],
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="type" className="text-xs sm:text-sm">
                    Aksama Tipi *
                  </Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    required
                    className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PLANLI_OKUL">Planlı/Okul Kaynaklı</option>
                    <option value="PLANDISI_DOGAL">Plan Dışı/Doğal</option>
                    <option value="OGRETMEN_KAYNAKLI">Öğretmen Kaynaklı</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="reason" className="text-xs sm:text-sm">
                    Aksama Sebebi *
                  </Label>
                  <textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Örn: Kar tatili, Gezi, Veli toplantısı..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-xs sm:text-sm">
                      Başlangıç Tarihi *
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-xs sm:text-sm">
                      Bitiş Tarihi *
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                {subjects.length > 0 && (
                  <div>
                    <Label className="text-xs sm:text-sm mb-2 block">
                      Etkilenen Dersler (Opsiyonel)
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {subjects.map((subject) => (
                        <label
                          key={subject.id}
                          className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.affectedSubjects.includes(subject.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  affectedSubjects: [...formData.affectedSubjects, subject.id],
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  affectedSubjects: formData.affectedSubjects.filter(
                                    (id) => id !== subject.id
                                  ),
                                })
                              }
                            }}
                            className="h-3 w-3 sm:h-4 sm:w-4"
                          />
                          {subject.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
                        {editingDisruption ? "Güncelle" : "Kaydet"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(false)
                      setEditingDisruption(null)
                      setFormData({
                        type: "PLANLI_OKUL",
                        reason: "",
                        startDate: "",
                        endDate: "",
                        affectedSubjects: [],
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
    </div>
  )
}

