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
  FileText,
  Search,
  CheckSquare,
  Square,
} from "lucide-react"

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
  grade: number
  section: string | null
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

  // Filtreleme state'leri
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")

  useEffect(() => {
    fetchAcademicYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Filtrelenmiş dersler
  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = searchQuery === "" || 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGrade = selectedGrade === "" || subject.grade.toString() === selectedGrade
    const matchesSection = selectedSection === "" || 
      (selectedSection === "null" ? subject.section === null : subject.section === selectedSection)
    
    return matchesSearch && matchesGrade && matchesSection
  })

  // Sınıflar listesi (5-12)
  const grades = Array.from({ length: 8 }, (_, i) => i + 5)

  // Şubeler listesi (filtrelenmiş derslerden)
  const sections = Array.from(
    new Set(
      filteredSubjects
        .map((s) => s.section)
        .filter((s): s is string => s !== null)
        .sort()
    )
  )

  // Tümünü seç/seçimi kaldır
  const handleSelectAll = () => {
    if (formData.affectedSubjects.length === filteredSubjects.length) {
      // Tümünü kaldır
      setFormData({ ...formData, affectedSubjects: [] })
    } else {
      // Tümünü seç
      const allIds = filteredSubjects.map((s) => s.id)
      setFormData({ ...formData, affectedSubjects: allIds })
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Aksama Yönetimi
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
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
              setSearchQuery("")
              setSelectedGrade("")
              setSelectedSection("")
            }}
            disabled={!selectedYearId}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Yeni Aksama Ekle
          </Button>
        </div>
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
                          <div className="mt-2">
                            <div className="text-xs sm:text-sm text-gray-600 mb-1">
                              Etkilenen Dersler ({disruption.affectedSubjects.length}):
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {disruption.affectedSubjects.map((subjectId) => {
                                const subject = subjects.find((s) => s.id === subjectId)
                                if (!subject) return null
                                return (
                                  <span
                                    key={subjectId}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                                  >
                                    {subject.name} - {subject.grade}. Sınıf
                                    {subject.section && ` - ${subject.section} Şubesi`}
                                  </span>
                                )
                              })}
                            </div>
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
                            setSearchQuery("")
                            setSelectedGrade("")
                            setSelectedSection("")
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
                    setSearchQuery("")
                    setSelectedGrade("")
                    setSelectedSection("")
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">
                        Etkilenen Dersler (Opsiyonel)
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="text-xs h-7"
                      >
                        {formData.affectedSubjects.length === filteredSubjects.length ? (
                          <>
                            <Square className="h-3 w-3 mr-1" />
                            Tümünü Kaldır
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-3 w-3 mr-1" />
                            Tümünü Seç
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Hızlı Seçim Butonları */}
                    <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 p-3 rounded-lg border border-blue-200">
                      <Label className="text-xs sm:text-sm font-medium text-blue-900 mb-2 block">
                        ⚡ Hızlı Toplu Seçim
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const ortaokulGrades = [5, 6, 7, 8]
                            const ortaokulSubjects = subjects.filter((s) => ortaokulGrades.includes(s.grade))
                            const subjectIds = ortaokulSubjects.map((s) => s.id)
                            const newSelected = Array.from(new Set([...formData.affectedSubjects, ...subjectIds]))
                            setFormData({ ...formData, affectedSubjects: newSelected })
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          🎒 Ortaokul Tümü ({subjects.filter((s) => [5,6,7,8].includes(s.grade)).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const liseGrades = [9, 10, 11, 12]
                            const liseSubjects = subjects.filter((s) => liseGrades.includes(s.grade))
                            const subjectIds = liseSubjects.map((s) => s.id)
                            const newSelected = Array.from(new Set([...formData.affectedSubjects, ...subjectIds]))
                            setFormData({ ...formData, affectedSubjects: newSelected })
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                        >
                          🎓 Lise Tümü ({subjects.filter((s) => [9,10,11,12].includes(s.grade)).length})
                        </button>
                        {formData.affectedSubjects.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, affectedSubjects: [] })}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          >
                            ✕ Tümünü Kaldır
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sınıf Bazlı Toplu Seçim */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <Label className="text-xs sm:text-sm font-medium text-blue-900 mb-2 block">
                        Sınıf Bazlı Seçim
                      </Label>
                      <div className="grid grid-cols-4 gap-2">
                        {grades.map((grade) => {
                          const gradeSubjects = subjects.filter((s) => s.grade === grade)
                          const isAllSelected = gradeSubjects.every((s) => formData.affectedSubjects.includes(s.id))
                          return (
                            <button
                              key={grade}
                              type="button"
                              onClick={() => {
                                const subjectIds = gradeSubjects.map((s) => s.id)
                                if (isAllSelected) {
                                  // Kaldır
                                  setFormData({
                                    ...formData,
                                    affectedSubjects: formData.affectedSubjects.filter((id) => !subjectIds.includes(id))
                                  })
                                } else {
                                  // Ekle
                                  const newSelected = Array.from(new Set([...formData.affectedSubjects, ...subjectIds]))
                                  setFormData({ ...formData, affectedSubjects: newSelected })
                                }
                              }}
                              className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                isAllSelected
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-white text-blue-700 border border-blue-300 hover:bg-blue-50"
                              }`}
                            >
                              {isAllSelected ? "✓" : "+"} {grade}. Sınıf ({gradeSubjects.length})
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Filtreleme */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Ders ara..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-9 text-xs sm:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1 block">Sınıf</Label>
                          <select
                            value={selectedGrade}
                            onChange={(e) => {
                              setSelectedGrade(e.target.value)
                              setSelectedSection("") // Sınıf değiştiğinde şube filtresini sıfırla
                            }}
                            className="w-full h-9 px-2 py-1 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Tüm Sınıflar</option>
                            {grades.map((grade) => (
                              <option key={grade} value={grade.toString()}>
                                {grade}. Sınıf
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Şube</Label>
                          <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            disabled={selectedGrade === ""}
                            className="w-full h-9 px-2 py-1 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Tüm Şubeler</option>
                            <option value="null">Şube Yok</option>
                            {sections.map((section) => (
                              <option key={section} value={section}>
                                {section} Şubesi
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Ders Listesi */}
                    <div className="border border-gray-200 rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                      {filteredSubjects.length === 0 ? (
                        <div className="text-center py-4 text-xs text-gray-500">
                          Filtre kriterlerinize uygun ders bulunamadı
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredSubjects.map((subject) => (
                            <label
                              key={subject.id}
                              className="flex items-start gap-2 text-xs sm:text-sm cursor-pointer hover:bg-white p-2 rounded transition-colors"
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
                                className="h-4 w-4 mt-0.5 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900">{subject.name}</div>
                                <div className="text-gray-600 text-xs mt-0.5">
                                  {subject.grade}. Sınıf
                                  {subject.section && ` - ${subject.section} Şubesi`}
                                  {!subject.section && " - Şube Yok"}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {formData.affectedSubjects.length > 0 && (
                      <div className="text-xs text-gray-600 bg-green-50 p-2 rounded border border-green-200">
                        <strong>{formData.affectedSubjects.length}</strong> ders seçildi
                      </div>
                    )}
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
                      setSearchQuery("")
                      setSelectedGrade("")
                      setSelectedSection("")
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

