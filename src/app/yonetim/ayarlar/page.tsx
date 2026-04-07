"use client"

import { useState, useEffect, useMemo } from "react"
import {
  describeCurrentTermPhase,
  getCurrentAcademicTermPhase,
  validateAcademicYearTermDates,
} from "@/lib/academic-year-terms"
import Link from "next/link"
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
  Users,
  AlertTriangle,
  Settings,
  PartyPopper,
} from "lucide-react"

const INITIAL_YEAR_FORM = {
  name: "",
  startDate: "",
  endDate: "",
  term1Start: "",
  term1End: "",
  term2Start: "",
  term2End: "",
  isActive: false,
  weekendDays: [] as string[],
}

interface AcademicYear {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  isActive: boolean
  weekendDays: string[]
  term1Start?: string | null
  term1End?: string | null
  term2Start?: string | null
  term2End?: string | null
  parentActiveYearId?: string | null
}

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

  const [yearFormData, setYearFormData] = useState({ ...INITIAL_YEAR_FORM })

  const [listNowMs, setListNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setListNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const termPhasePreview = useMemo(():
    | { ok: true; text: string }
    | { ok: false; error: string }
    | null => {
    const y = yearFormData
    if (
      !y.startDate ||
      !y.endDate ||
      !y.term1Start ||
      !y.term1End ||
      !y.term2Start ||
      !y.term2End
    ) {
      return null
    }
    const v = validateAcademicYearTermDates({
      yearStart: y.startDate,
      yearEnd: y.endDate,
      term1Start: y.term1Start,
      term1End: y.term1End,
      term2Start: y.term2Start,
      term2End: y.term2End,
    })
    if (!v.ok) return { ok: false, error: v.error }
    const phase = getCurrentAcademicTermPhase(Date.now(), {
      startDate: `${y.startDate}T12:00:00`,
      endDate: `${y.endDate}T12:00:00`,
      term1Start: `${y.term1Start}T12:00:00`,
      term1End: `${y.term1End}T12:00:00`,
      term2Start: `${y.term2Start}T12:00:00`,
      term2End: `${y.term2End}T12:00:00`,
    })
    return { ok: true, text: describeCurrentTermPhase(phase) }
  }, [yearFormData])

  interface HolidayFormData {
    id?: string
    name: string
    type: "RESMI_TATIL" | "YARILYIL_TATILI" | "ARA_TATIL" | "DIGER"
    startDate: string
    endDate: string
    description: string
  }

  const [holidays, setHolidays] = useState<HolidayFormData[]>([])
  const [savingHolidayId, setSavingHolidayId] = useState<string | null>(null)

  const [subjectFormData, setSubjectFormData] = useState({
    name: "",
    code: "",
    academicYearId: "",
    classId: "",
    grade: "",
    section: "",
  })

  const [classes, setClasses] = useState<Array<{
    id: string
    name: string
    grade: number
    section: string
    academicYearId: string
    students: Array<{ id: string }>
    counselor: { firstName: string; lastName: string } | null
  }>>([])

  useEffect(() => {
    fetchAcademicYears()
    fetchClasses()
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

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes")
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      }
    } catch (err) {
      console.error("Error fetching classes:", err)
    }
  }

  const fetchSubjects = async () => {
    if (!selectedYearId) return

    try {
      // ✅ Rehberlik kullanıcısı kontrolü
      const role = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null
      const staffId = typeof window !== "undefined" ? localStorage.getItem("staff_id") : null
      
      let url = `/api/neredeyiz/subjects?academicYearId=${selectedYearId}`
      // ✅ Rehberlik kullanıcısı için: Sadece kendisine atanmış sınıfların derslerini göster
      if (role === "counselor" && staffId) {
        url += `&counselorId=${staffId}`
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


  const handleYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!yearFormData.name.trim()) {
      error("Akademik yıl adı zorunludur!")
      return
    }

    const wantActive = yearFormData.isActive
    const anyCal =
      !!(
        yearFormData.startDate ||
        yearFormData.endDate ||
        yearFormData.term1Start ||
        yearFormData.term1End ||
        yearFormData.term2Start ||
        yearFormData.term2End
      )

    if (wantActive) {
      if (!yearFormData.startDate || !yearFormData.endDate) {
        error("Aktif yıl için başlangıç ve bitiş tarihi zorunludur!")
        return
      }
      if (
        !yearFormData.term1Start ||
        !yearFormData.term1End ||
        !yearFormData.term2Start ||
        !yearFormData.term2End
      ) {
        error("Aktif yıl için 1. ve 2. dönem tarihleri zorunludur!")
        return
      }
      if (yearFormData.weekendDays.length < 1) {
        error("Aktif yıl için en az bir hafta tatili günü seçin (Cumartesi veya Pazar).")
        return
      }
    } else if (anyCal) {
      if (
        !yearFormData.startDate ||
        !yearFormData.endDate ||
        !yearFormData.term1Start ||
        !yearFormData.term1End ||
        !yearFormData.term2Start ||
        !yearFormData.term2End
      ) {
        error("Takvimi kısmen doldurmayın: tüm tarih alanlarını girin veya hepsini boş bırakın.")
        return
      }
    }

    if (anyCal || wantActive) {
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
      const termV = validateAcademicYearTermDates({
        yearStart: yearFormData.startDate,
        yearEnd: yearFormData.endDate,
        term1Start: yearFormData.term1Start,
        term1End: yearFormData.term1End,
        term2Start: yearFormData.term2Start,
        term2End: yearFormData.term2End,
      })
      if (!termV.ok) {
        error(termV.error)
        return
      }
    }

    const anotherActiveExists = academicYears.some(
      (y) => y.isActive && y.id !== editingYear?.id
    )
    if (wantActive && anotherActiveExists) {
      const ok = window.confirm(
        "Başka bir aktif öğretim yılı var. Bu kaydı aktif yaparsanız önceki aktif yıl kapatılır; " +
          "tüm sınıf listeleri temizlenir ve öğrenciler bir üst sınıfa alınır (8. ve 12. sınıflar mezun olur). Devam edilsin mi?"
      )
      if (!ok) return
    }

    setSubmitting(true)

    try {
      const url = editingYear
        ? `/api/neredeyiz/academic-years/${editingYear.id}`
        : "/api/neredeyiz/academic-years"
      const method = editingYear ? "PUT" : "POST"

      const payload = {
        name: yearFormData.name.trim(),
        isActive: yearFormData.isActive,
        startDate: yearFormData.startDate || null,
        endDate: yearFormData.endDate || null,
        term1Start: yearFormData.term1Start || null,
        term1End: yearFormData.term1End || null,
        term2Start: yearFormData.term2Start || null,
        term2End: yearFormData.term2End || null,
        weekendDays: yearFormData.weekendDays,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        const academicYearId = editingYear ? editingYear.id : data.id

        // Tatilleri kaydet
        if (holidays.length > 0 && academicYearId) {
          for (const holiday of holidays) {
            if (!holiday.id) {
              // Yeni tatil ekle
              await fetch("/api/neredeyiz/holidays", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  academicYearId,
                  name: holiday.name,
                  type: holiday.type,
                  startDate: holiday.startDate,
                  endDate: holiday.endDate,
                  description: holiday.description || null,
                }),
              })
            }
          }
        }

        success(
          editingYear
            ? "Akademik yıl başarıyla güncellendi!"
            : "Akademik yıl başarıyla oluşturuldu!"
        )
        await fetchAcademicYears()
        setShowYearForm(false)
        setEditingYear(null)
        setYearFormData({ ...INITIAL_YEAR_FORM })
        setHolidays([])
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

  const handleAddHoliday = () => {
    const newHoliday: HolidayFormData = {
      name: "",
      type: "RESMI_TATIL",
      startDate: "",
      endDate: "",
      description: "",
    }
    setHolidays([...holidays, newHoliday])
  }

  const handleSaveHoliday = async (index: number) => {
    const holiday = holidays[index]
    
    if (!holiday.name.trim()) {
      error("Tatil adı zorunludur!")
      return
    }

    if (!holiday.startDate || !holiday.endDate) {
      error("Başlangıç ve bitiş tarihi zorunludur!")
      return
    }

    const start = new Date(holiday.startDate)
    const end = new Date(holiday.endDate)

    if (start > end) {
      error("Bitiş tarihi başlangıç tarihinden önce olamaz!")
      return
    }

    // Akademik yıl ID'si gerekiyor - eğer yoksa önce akademik yılı kaydet
    let academicYearId = editingYear?.id
    
    // Eğer akademik yıl henüz kaydedilmemişse, önce kaydet
    if (!academicYearId) {
      if (!yearFormData.name.trim()) {
        error("Önce akademik yıl adını girin!")
        return
      }
      const anyCal =
        !!(
          yearFormData.startDate ||
          yearFormData.endDate ||
          yearFormData.term1Start ||
          yearFormData.term1End ||
          yearFormData.term2Start ||
          yearFormData.term2End
        )
      if (yearFormData.isActive) {
        if (!yearFormData.startDate || !yearFormData.endDate) {
          error("Tatil eklemeden önce aktif yıl için başlangıç/bitiş tarihlerini girin!")
          return
        }
        if (
          !yearFormData.term1Start ||
          !yearFormData.term1End ||
          !yearFormData.term2Start ||
          !yearFormData.term2End
        ) {
          error("Tatil eklemeden önce dönem tarihlerini girin!")
          return
        }
        if (yearFormData.weekendDays.length < 1) {
          error("Aktif yıl için en az bir hafta tatili günü seçin.")
          return
        }
      } else if (anyCal) {
        if (
          !yearFormData.startDate ||
          !yearFormData.endDate ||
          !yearFormData.term1Start ||
          !yearFormData.term1End ||
          !yearFormData.term2Start ||
          !yearFormData.term2End
        ) {
          error("Takvimi tam doldurun veya yalnızca yıl adıyla kaydedin; tatil için tam takvim gerekir.")
          return
        }
      } else {
        error("Önce akademik yılı kaydedin (yıl adı yeterli). Tatiller için takvimin de dolu olması gerekir.")
        return
      }

      if (anyCal || yearFormData.isActive) {
        const yStart = new Date(yearFormData.startDate!)
        const yEnd = new Date(yearFormData.endDate!)
        if (yStart >= yEnd) {
          error("Bitiş tarihi başlangıç tarihinden sonra olmalıdır!")
          return
        }
        const termV0 = validateAcademicYearTermDates({
          yearStart: yearFormData.startDate!,
          yearEnd: yearFormData.endDate!,
          term1Start: yearFormData.term1Start!,
          term1End: yearFormData.term1End!,
          term2Start: yearFormData.term2Start!,
          term2End: yearFormData.term2End!,
        })
        if (!termV0.ok) {
          error(termV0.error)
          return
        }
      }

      setSavingHolidayId(`holiday-${index}`)
      
      try {
        const yearResponse = await fetch("/api/neredeyiz/academic-years", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: yearFormData.name.trim(),
            isActive: yearFormData.isActive,
            startDate: yearFormData.startDate || null,
            endDate: yearFormData.endDate || null,
            term1Start: yearFormData.term1Start || null,
            term1End: yearFormData.term1End || null,
            term2Start: yearFormData.term2Start || null,
            term2End: yearFormData.term2End || null,
            weekendDays: yearFormData.weekendDays,
          }),
        })

        if (!yearResponse.ok) {
          const errorData = await yearResponse.json()
          error(errorData.error || "Akademik yıl kaydedilirken hata oluştu!")
          setSavingHolidayId(null)
          return
        }

        const yearData = await yearResponse.json()
        academicYearId = yearData.id
        
        // Akademik yıl state'ini güncelle
        setEditingYear(yearData)
        await fetchAcademicYears()
        success("Akademik yıl kaydedildi, tatil ekleniyor...")
      } catch (err) {
        console.error("Error saving academic year:", err)
        error("Akademik yıl kaydedilirken bir hata oluştu!")
        setSavingHolidayId(null)
        return
      }
    }

    setSavingHolidayId(`holiday-${index}`)

    try {
      const response = await fetch("/api/neredeyiz/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          name: holiday.name.trim(),
          type: holiday.type,
          startDate: holiday.startDate,
          endDate: holiday.endDate,
          description: holiday.description || null,
        }),
      })

      if (response.ok) {
        const savedHoliday = await response.json()
        const updatedHolidays = [...holidays]
        updatedHolidays[index] = { ...holiday, id: savedHoliday.id }
        setHolidays(updatedHolidays)
        success("Tatil başarıyla kaydedildi!")
      } else {
        const errorData = await response.json()
        error(errorData.error || "Tatil kaydedilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error saving holiday:", err)
      error("Tatil kaydedilirken bir hata oluştu!")
    } finally {
      setSavingHolidayId(null)
    }
  }

  const handleRemoveHoliday = (index: number) => {
    const updatedHolidays = holidays.filter((_, i) => i !== index)
    setHolidays(updatedHolidays)
  }

  const handleHolidayChange = (index: number, field: keyof HolidayFormData, value: string) => {
    const updatedHolidays = [...holidays]
    updatedHolidays[index] = { ...updatedHolidays[index], [field]: value }
    setHolidays(updatedHolidays)
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

    if (!subjectFormData.grade) {
      error("Sınıf seçimi zorunludur!")
      return
    }

    const gradeNum = parseInt(subjectFormData.grade, 10)
    if (isNaN(gradeNum) || gradeNum < 5 || gradeNum > 12) {
      error("Sınıf 5 ile 12 arasında olmalıdır!")
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
          grade: gradeNum,
          section: subjectFormData.section.trim() !== "" ? subjectFormData.section.trim() : null,
          classId: subjectFormData.classId.trim() !== "" ? subjectFormData.classId.trim() : null,
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
          classId: "",
          grade: "",
          section: "",
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
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Ayarlar
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Akademik yıllar, tatiller ve Neredeyiz ders yönetimi
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab("years")}
          className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === "years"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Akademik Yıllar</span>
          <span className="xs:hidden">Yıllar</span>
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === "subjects"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
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
                  setYearFormData({ ...INITIAL_YEAR_FORM })
                }}
                className="text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Akademik yıl tanımla
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
                        {year.startDate && year.endDate ? (
                          <>
                            {new Date(year.startDate).toLocaleDateString("tr-TR")} -{" "}
                            {new Date(year.endDate).toLocaleDateString("tr-TR")}
                          </>
                        ) : (
                          <span className="text-amber-800/90">Takvim henüz tanımlanmadı (yalnızca ad)</span>
                        )}
                      </div>
                      {year.startDate &&
                        year.endDate &&
                        year.term1Start &&
                        year.term1End &&
                        year.term2Start &&
                        year.term2End && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-medium">
                              Bugün:{" "}
                              {describeCurrentTermPhase(
                                getCurrentAcademicTermPhase(listNowMs, {
                                  startDate: year.startDate,
                                  endDate: year.endDate,
                                  term1Start: year.term1Start,
                                  term1End: year.term1End,
                                  term2Start: year.term2Start,
                                  term2End: year.term2End,
                                })
                              )}
                            </span>
                          </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setEditingYear(year)
                          setYearFormData({
                            ...INITIAL_YEAR_FORM,
                            name: year.name,
                            startDate: year.startDate?.split("T")[0] ?? "",
                            endDate: year.endDate?.split("T")[0] ?? "",
                            term1Start: year.term1Start?.split("T")[0] ?? "",
                            term1End: year.term1End?.split("T")[0] ?? "",
                            term2Start: year.term2Start?.split("T")[0] ?? "",
                            term2End: year.term2End?.split("T")[0] ?? "",
                            isActive: year.isActive,
                            weekendDays: year.weekendDays || [],
                          })
                          // Mevcut tatilleri yükle
                          try {
                            const response = await fetch(
                              `/api/neredeyiz/holidays?academicYearId=${year.id}`
                            )
                            if (response.ok) {
                              const data = await response.json()
                              setHolidays(
                                data.map((h: { id: string; name: string; type: string; startDate: string; endDate: string; description: string | null }) => ({
                                  id: h.id,
                                  name: h.name,
                                  type: h.type as HolidayFormData["type"],
                                  startDate: h.startDate.split("T")[0],
                                  endDate: h.endDate.split("T")[0],
                                  description: h.description || "",
                                }))
                              )
                            }
                          } catch (err) {
                            console.error("Error fetching holidays:", err)
                          }
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
                          classId: "",
                          grade: "",
                          section: "",
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
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs sm:text-sm text-gray-600 font-medium">
                                {subject.grade}. Sınıf
                              </span>
                              {subject.section && (
                                <span className="text-xs sm:text-sm text-gray-600">
                                  - {subject.section} Şubesi
                                </span>
                              )}
                              {subject.code && (
                                <span className="text-xs sm:text-sm text-gray-500">
                                  (Kod: {subject.code})
                                </span>
                              )}
                            </div>
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
                                  classId: "", // Düzenlemede classId yok, manuel girişte olabilir
                                  grade: subject.grade.toString(),
                                  section: subject.section || "",
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
                  {editingYear ? "Akademik Yıl Düzenle" : "Aktif öğretim yılı"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowYearForm(false)
                    setEditingYear(null)
                    setYearFormData({ ...INITIAL_YEAR_FORM })
                    setHolidays([])
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Gelecek yılı henüz takvimi belli olmadan kaydetmek için yalnızca adı girip «Aktif» kutusunu işaretlemeyin.
                Bu yılı aktif yıl yaptığınızda başlangıç/bitiş, dönemler ve en az bir hafta tatili günü zorunludur.
                Başka bir aktif yıl varken yeni yılı aktif yaparsanız sınıf atamaları silinir, öğrenciler bir üst sınıfa
                geçer; 8. ve 12. sınıflar mezun olur. Kayıt yenileme etiketi aktif yılın adı veya başlangıç tarihinden
                türetilir.
              </p>
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
                      Başlangıç Tarihi{yearFormData.isActive ? " *" : ""}
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={yearFormData.startDate}
                      onChange={(e) =>
                        setYearFormData({ ...yearFormData, startDate: e.target.value })
                      }
                      required={yearFormData.isActive}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-xs sm:text-sm">
                      Bitiş Tarihi{yearFormData.isActive ? " *" : ""}
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={yearFormData.endDate}
                      onChange={(e) =>
                        setYearFormData({ ...yearFormData, endDate: e.target.value })
                      }
                      required={yearFormData.isActive}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-3">
                  <p className="text-xs font-semibold text-blue-900">
                    1. ve 2. dönem{yearFormData.isActive ? " *" : ""}
                  </p>
                  <p className="text-[11px] text-blue-900/80 leading-snug">
                    1. dönem bitişi ile 2. dönem başlangıcı arasında yarıyıl için boşluk bırakın. Tüm dönem
                    tarihleri öğretim yılı başlangıç/bitişi içinde kalmalıdır.
                    {!yearFormData.isActive ? " Taslak yılda boş bırakabilir veya tamamını doldurun (kısmen doldurmayın)." : ""}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs sm:text-sm">
                        1. dönem başlangıcı{yearFormData.isActive ? " *" : ""}
                      </Label>
                      <Input
                        type="date"
                        value={yearFormData.term1Start}
                        onChange={(e) =>
                          setYearFormData({ ...yearFormData, term1Start: e.target.value })
                        }
                        required={yearFormData.isActive}
                        className="h-9 sm:h-10 text-xs sm:text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">
                        1. dönem bitişi{yearFormData.isActive ? " *" : ""}
                      </Label>
                      <Input
                        type="date"
                        value={yearFormData.term1End}
                        onChange={(e) =>
                          setYearFormData({ ...yearFormData, term1End: e.target.value })
                        }
                        required={yearFormData.isActive}
                        className="h-9 sm:h-10 text-xs sm:text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">
                        2. dönem başlangıcı{yearFormData.isActive ? " *" : ""}
                      </Label>
                      <Input
                        type="date"
                        value={yearFormData.term2Start}
                        onChange={(e) =>
                          setYearFormData({ ...yearFormData, term2Start: e.target.value })
                        }
                        required={yearFormData.isActive}
                        className="h-9 sm:h-10 text-xs sm:text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">
                        2. dönem bitişi{yearFormData.isActive ? " *" : ""}
                      </Label>
                      <Input
                        type="date"
                        value={yearFormData.term2End}
                        onChange={(e) =>
                          setYearFormData({ ...yearFormData, term2End: e.target.value })
                        }
                        required={yearFormData.isActive}
                        className="h-9 sm:h-10 text-xs sm:text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs w-fit"
                      onClick={() => {
                        if (
                          yearFormData.term1Start &&
                          yearFormData.term2End &&
                          validateAcademicYearTermDates({
                            yearStart: yearFormData.term1Start,
                            yearEnd: yearFormData.term2End,
                            term1Start: yearFormData.term1Start,
                            term1End: yearFormData.term1End,
                            term2Start: yearFormData.term2Start,
                            term2End: yearFormData.term2End,
                          }).ok
                        ) {
                          setYearFormData((prev) => ({
                            ...prev,
                            startDate: prev.term1Start,
                            endDate: prev.term2End,
                          }))
                        } else {
                          error("Önce geçerli dönem tarihlerini girin; yıl sınırları 1. dönem başı ve 2. dönem sonuna çekilemez.")
                        }
                      }}
                    >
                      Yıl sınırlarını dönemlere göre doldur
                    </Button>
                  </div>
                  {termPhasePreview && (
                    <div
                      className={`text-xs rounded-md px-2 py-1.5 ${
                        termPhasePreview.ok
                          ? "bg-blue-100/80 text-blue-950"
                          : "bg-amber-50 text-amber-950 border border-amber-200"
                      }`}
                    >
                      {termPhasePreview.ok ? (
                        <>
                          Bugünün tarihine göre: <strong>{termPhasePreview.text}</strong>
                        </>
                      ) : (
                        termPhasePreview.error
                      )}
                    </div>
                  )}
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

                {/* Hafta Tatili Ayarları */}
                <div className="pt-4 border-t border-gray-200">
                  <Label className="text-sm sm:text-base font-semibold text-gray-900 mb-3 block">
                    🗓️ Hafta Tatili Günleri{yearFormData.isActive ? " *" : ""}
                  </Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Okulunuzda hafta tatili olan günleri seçin. Bu günler planlamadan otomatik olarak çıkarılacaktır.
                    {yearFormData.isActive ? " Aktif yıl için en az bir gün seçilmelidir." : ""}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="saturday"
                        checked={yearFormData.weekendDays.includes("SATURDAY")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setYearFormData({
                              ...yearFormData,
                              weekendDays: [...yearFormData.weekendDays, "SATURDAY"],
                            })
                          } else {
                            setYearFormData({
                              ...yearFormData,
                              weekendDays: yearFormData.weekendDays.filter((d) => d !== "SATURDAY"),
                            })
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="saturday" className="text-xs sm:text-sm cursor-pointer">
                        Cumartesi
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sunday"
                        checked={yearFormData.weekendDays.includes("SUNDAY")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setYearFormData({
                              ...yearFormData,
                              weekendDays: [...yearFormData.weekendDays, "SUNDAY"],
                            })
                          } else {
                            setYearFormData({
                              ...yearFormData,
                              weekendDays: yearFormData.weekendDays.filter((d) => d !== "SUNDAY"),
                            })
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="sunday" className="text-xs sm:text-sm cursor-pointer">
                        Pazar
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Resmi Tatiller Bölümü */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-[11px] text-gray-500 mb-2">
                    Resmi tatiller için önce takvimin tamamlanmış olması gerekir (taslak yılda yalnızca ad kaydedip
                    sonra düzenleyerek takvimi ekleyin).
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm sm:text-base font-semibold text-gray-900">
                      Resmi Tatiller
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddHoliday}
                      className="text-xs sm:text-sm"
                    >
                      <PartyPopper className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Resmi Tatil Ekle
                    </Button>
                  </div>

                  {holidays.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      Henüz tatil eklenmemiş
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {holidays.map((holiday, index) => (
                        <div
                          key={index}
                          className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs sm:text-sm">Tatil Adı *</Label>
                              <Input
                                value={holiday.name}
                                onChange={(e) =>
                                  handleHolidayChange(index, "name", e.target.value)
                                }
                                placeholder="Örn: Kurban Bayramı"
                                className="h-9 sm:h-10 text-xs sm:text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs sm:text-sm">Tatil Tipi *</Label>
                              <select
                                value={holiday.type}
                                onChange={(e) =>
                                  handleHolidayChange(
                                    index,
                                    "type",
                                    e.target.value as HolidayFormData["type"]
                                  )
                                }
                                className="w-full h-9 sm:h-10 px-3 py-2 border border-input bg-background rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="RESMI_TATIL">Resmi Tatil</option>
                                <option value="YARILYIL_TATILI">Yarıyıl Tatili</option>
                                <option value="ARA_TATIL">Ara Tatil</option>
                                <option value="DIGER">Diğer</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs sm:text-sm">Başlangıç Tarihi *</Label>
                              <Input
                                type="date"
                                value={holiday.startDate}
                                onChange={(e) =>
                                  handleHolidayChange(index, "startDate", e.target.value)
                                }
                                className="h-9 sm:h-10 text-xs sm:text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs sm:text-sm">Bitiş Tarihi *</Label>
                              <Input
                                type="date"
                                value={holiday.endDate}
                                onChange={(e) =>
                                  handleHolidayChange(index, "endDate", e.target.value)
                                }
                                className="h-9 sm:h-10 text-xs sm:text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                              {holiday.id && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <Save className="h-3 w-3" />
                                  Kaydedildi
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!holiday.id && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleSaveHoliday(index)}
                                  disabled={savingHolidayId === `holiday-${index}`}
                                  className="text-xs sm:text-sm"
                                >
                                  {savingHolidayId === `holiday-${index}` ? (
                                    <>
                                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                                      Kaydediliyor...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                      Kaydet
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveHoliday(index)}
                                className="text-xs sm:text-sm"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Kaldır
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      setYearFormData({ ...INITIAL_YEAR_FORM })
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
                        classId: "",
                        grade: "",
                        section: "",
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
                <div>
                  <Label htmlFor="classSelect" className="text-xs sm:text-sm">
                    Sınıf Seçimi *
                  </Label>
                  <select
                    id="classSelect"
                    value={subjectFormData.classId}
                    onChange={(e) => {
                      const selectedClass = classes.find(c => c.id === e.target.value)
                      if (selectedClass) {
                        setSubjectFormData({
                          ...subjectFormData,
                          classId: selectedClass.id,
                          grade: String(selectedClass.grade),
                          section: selectedClass.section,
                          academicYearId: selectedClass.academicYearId
                        })
                      } else {
                        setSubjectFormData({
                          ...subjectFormData,
                          classId: "",
                          grade: "",
                          section: ""
                        })
                      }
                    }}
                    required
                    className="w-full h-9 sm:h-10 px-3 py-2 border border-input bg-background rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sınıf seçiniz</option>
                    {classes
                      .filter(c => c.academicYearId === selectedYearId)
                      .sort((a, b) => a.grade === b.grade ? a.section.localeCompare(b.section) : a.grade - b.grade)
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.students?.length || 0} öğrenci)
                          {cls.counselor && ` - ${cls.counselor.firstName} ${cls.counselor.lastName}`}
                        </option>
                      ))}
                  </select>
                  {subjectFormData.classId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Seçilen: {subjectFormData.grade}. Sınıf - {subjectFormData.section} Şubesi
                    </p>
                  )}
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
                        classId: "",
                        grade: "",
                        section: "",
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

