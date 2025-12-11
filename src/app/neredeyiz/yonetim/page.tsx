"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToastContainer, useToast } from "@/components/ui/toast"
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  BookOpen,
  ArrowLeft,
  Users,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"

interface AcademicYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

interface Subject {
  id: string
  name: string
  code: string | null
  academicYearId: string
  assignments: Array<{
    id: string
    staff: {
      id: string
      firstName: string
      lastName: string
    }
  }>
}

interface Staff {
  id: string
  firstName: string
  lastName: string
  department: string
}

export default function YonetimPage() {
  const { toasts, success, error, removeToast } = useToast()
  const [activeTab, setActiveTab] = useState<"years" | "subjects">("years")
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showYearForm, setShowYearForm] = useState(false)
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  const [yearFormData, setYearFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isActive: false,
  })

  const [subjectFormData, setSubjectFormData] = useState({
    name: "",
    code: "",
    academicYearId: "",
  })

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
        if (data.length > 0 && !selectedYearId) {
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
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
      error("Dersler yüklenirken hata oluştu!")
    }
  }


  const handleYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validasyon
    if (!yearFormData.name.trim()) {
      error("Akademik yıl adı zorunludur!")
      return
    }
    
    if (!yearFormData.startDate || !yearFormData.endDate) {
      error("Başlangıç ve bitiş tarihi zorunludur!")
      return
    }
    
    const start = new Date(yearFormData.startDate)
    const end = new Date(yearFormData.endDate)
    
    if (start >= end) {
      error("Bitiş tarihi başlangıç tarihinden sonra olmalıdır!")
      return
    }
    
    setSubmitting(true)

    try {
      const url = editingYear
        ? `/api/neredeyiz/academic-years/${editingYear.id}`
        : "/api/neredeyiz/academic-years"
      const method = editingYear ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...yearFormData,
          name: yearFormData.name.trim(),
        }),
      })

      if (response.ok) {
        success(
          editingYear
            ? "Akademik yıl başarıyla güncellendi!"
            : "Akademik yıl başarıyla oluşturuldu!"
        )
        await fetchAcademicYears()
        setShowYearForm(false)
        setEditingYear(null)
        setYearFormData({
          name: "",
          startDate: "",
          endDate: "",
          isActive: false,
        })
      } else {
        const errorData = await response.json()
        error(errorData.error || "Akademik yıl kaydedilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error saving academic year:", err)
      error("Akademik yıl kaydedilirken bir hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validasyon
    if (!selectedYearId) {
      error("Lütfen bir akademik yıl seçin!")
      return
    }
    
    if (!subjectFormData.name.trim()) {
      error("Ders adı zorunludur!")
      return
    }

    setSubmitting(true)

    try {
      const url = editingSubject
        ? `/api/neredeyiz/subjects/${editingSubject.id}`
        : "/api/neredeyiz/subjects"
      const method = editingSubject ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subjectFormData,
          academicYearId: selectedYearId,
        }),
      })

      if (response.ok) {
        success(
          editingSubject
            ? "Ders başarıyla güncellendi!"
            : "Ders başarıyla oluşturuldu!"
        )
        await fetchSubjects()
        setShowSubjectForm(false)
        setEditingSubject(null)
        setSubjectFormData({
          name: "",
          code: "",
          academicYearId: "",
        })
      } else {
        const errorData = await response.json()
        error(errorData.error || "Ders kaydedilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error saving subject:", err)
      error("Ders kaydedilirken bir hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteYear = async (id: string) => {
    const year = academicYears.find((y) => y.id === id)
    if (
      !window.confirm(
        `"${year?.name}" akademik yılını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve tüm dersler, üniteler ve konular silinecektir.`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/neredeyiz/academic-years/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        success("Akademik yıl başarıyla silindi!")
        await fetchAcademicYears()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Akademik yıl silinirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error deleting academic year:", err)
      error("Akademik yıl silinirken bir hata oluştu!")
    }
  }

  const handleDeleteSubject = async (id: string) => {
    const subject = subjects.find((s) => s.id === id)
    if (
      !window.confirm(
        `"${subject?.name}" dersini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve tüm üniteler, konular ve ilerleme kayıtları silinecektir.`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/neredeyiz/subjects/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        success("Ders başarıyla silindi!")
        await fetchSubjects()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Ders silinirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error deleting subject:", err)
      error("Ders silinirken bir hata oluştu!")
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Link href="/neredeyiz">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Neredeyiz? Yönetim
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
              Akademik yıl ve ders yönetimi
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("years")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "years"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Akademik Yıllar
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "subjects"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="h-4 w-4 inline mr-2" />
          Dersler
        </button>
      </div>

      {/* Akademik Yıllar Tab */}
      {activeTab === "years" && (
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Akademik Yıllar
              </CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setShowYearForm(true)
                  setEditingYear(null)
                  setYearFormData({
                    name: "",
                    startDate: "",
                    endDate: "",
                    isActive: false,
                  })
                }}
                className="text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Yeni Akademik Yıl
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {academicYears.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
                  Henüz akademik yıl tanımlanmamış
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Yeni akademik yıl eklemek için butona tıklayın.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {academicYears.map((year) => (
                  <div
                    key={year.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 hover:border-blue-300"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                          {year.name}
                        </h3>
                        {year.isActive && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {new Date(year.startDate).toLocaleDateString("tr-TR")} -{" "}
                        {new Date(year.endDate).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingYear(year)
                          setYearFormData({
                            name: year.name,
                            startDate: year.startDate.split("T")[0],
                            endDate: year.endDate.split("T")[0],
                            isActive: year.isActive,
                          })
                          setShowYearForm(true)
                        }}
                        className="text-xs sm:text-sm"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Düzenle
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteYear(year.id)}
                        className="text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Sil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dersler Tab */}
      {activeTab === "subjects" && (
        <>
          {academicYears.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
                  Önce akademik yıl tanımlamanız gerekiyor
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Akademik Yıllar sekmesinden yeni yıl ekleyin.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Akademik Yıl Seçimi */}
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

              {/* Dersler Listesi */}
              <Card>
                <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                      Dersler
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowSubjectForm(true)
                        setEditingSubject(null)
                        setSubjectFormData({
                          name: "",
                          code: "",
                          academicYearId: selectedYearId,
                        })
                      }}
                      disabled={!selectedYearId}
                      className="text-xs sm:text-sm"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Yeni Ders
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                  {subjects.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
                        Henüz ders tanımlanmamış
                      </p>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        Yeni ders eklemek için butona tıklayın.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {subjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                              {subject.name}
                            </h3>
                            {subject.code && (
                              <div className="text-xs sm:text-sm text-gray-600">
                                Kod: {subject.code}
                              </div>
                            )}
                            {subject.assignments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {subject.assignments.map((assignment) => (
                                  <span
                                    key={assignment.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                                  >
                                    <Users className="h-3 w-3" />
                                    {assignment.staff.firstName} {assignment.staff.lastName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/neredeyiz/dersler/${subject.id}`}>
                              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                                Detay
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSubject(subject)
                                setSubjectFormData({
                                  name: subject.name,
                                  code: subject.code || "",
                                  academicYearId: subject.academicYearId,
                                })
                                setShowSubjectForm(true)
                              }}
                              className="text-xs sm:text-sm"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Düzenle
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="text-xs sm:text-sm"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Sil
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Akademik Yıl Form Modal */}
      {showYearForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  {editingYear ? "Akademik Yıl Düzenle" : "Yeni Akademik Yıl Ekle"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowYearForm(false)
                    setEditingYear(null)
                    setYearFormData({
                      name: "",
                      startDate: "",
                      endDate: "",
                      isActive: false,
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <form onSubmit={handleYearSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="yearName" className="text-xs sm:text-sm">
                    Akademik Yıl Adı *
                  </Label>
                  <Input
                    id="yearName"
                    value={yearFormData.name}
                    onChange={(e) =>
                      setYearFormData({ ...yearFormData, name: e.target.value })
                    }
                    placeholder="Örn: 2024-2025 Eğitim Öğretim Yılı"
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
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
                      value={yearFormData.startDate}
                      onChange={(e) =>
                        setYearFormData({ ...yearFormData, startDate: e.target.value })
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
                      value={yearFormData.endDate}
                      onChange={(e) =>
                        setYearFormData({ ...yearFormData, endDate: e.target.value })
                      }
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={yearFormData.isActive}
                    onChange={(e) =>
                      setYearFormData({ ...yearFormData, isActive: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isActive" className="text-xs sm:text-sm cursor-pointer">
                    Aktif Akademik Yıl Olarak İşaretle
                  </Label>
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
                        {editingYear ? "Güncelle" : "Kaydet"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowYearForm(false)
                      setEditingYear(null)
                      setYearFormData({
                        name: "",
                        startDate: "",
                        endDate: "",
                        isActive: false,
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

      {/* Ders Form Modal */}
      {showSubjectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  {editingSubject ? "Ders Düzenle" : "Yeni Ders Ekle"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSubjectForm(false)
                    setEditingSubject(null)
                    setSubjectFormData({
                      name: "",
                      code: "",
                      academicYearId: "",
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <form onSubmit={handleSubjectSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="subjectName" className="text-xs sm:text-sm">
                    Ders Adı *
                  </Label>
                  <Input
                    id="subjectName"
                    value={subjectFormData.name}
                    onChange={(e) =>
                      setSubjectFormData({ ...subjectFormData, name: e.target.value })
                    }
                    placeholder="Örn: Geometri"
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="subjectCode" className="text-xs sm:text-sm">
                    Ders Kodu (Opsiyonel)
                  </Label>
                  <Input
                    id="subjectCode"
                    value={subjectFormData.code}
                    onChange={(e) =>
                      setSubjectFormData({ ...subjectFormData, code: e.target.value })
                    }
                    placeholder="Örn: GEO"
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
                        {editingSubject ? "Güncelle" : "Kaydet"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSubjectForm(false)
                      setEditingSubject(null)
                      setSubjectFormData({
                        name: "",
                        code: "",
                        academicYearId: "",
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

