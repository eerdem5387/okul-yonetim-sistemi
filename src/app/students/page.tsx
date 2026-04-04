"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { gradeLevelLabel } from "@/lib/student-grade-level"
import {
  Save,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  School,
  Users,
  FileCheck,
  UserPlus,
  AlertCircle,
  CalendarClock,
} from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  birthDate: string
  grade: string
  address: string
  motherName: string
  motherTc: string
  motherPhone: string
  motherAddress: string
  motherOccupation: string
  fatherName: string
  fatherTc: string
  fatherPhone: string
  fatherAddress: string
  fatherOccupation: string
  announcedTuitionFee?: string | null
  studentTuitionFee?: string | null
  registrationStatusText?: string
}

type RegistrationBrowseKind = "renewed" | "new_registration" | "pre_enrollment"

interface OverviewClassRow {
  id: string
  name: string
  grade: number
  studentCount: number
}

interface StudentsOverview {
  activeAcademicYear: { id: string; name: string } | null
  renewalTargetYear: { id: string | null; name: string; label: string } | null
  preEnrollmentCount: number
  preEnrollmentTargetYear: { id: string; name: string; label: string } | null
  totalStudents: number
  ortaokulCount: number
  liseCount: number
  byGradeCounts: Record<string, number>
  byGradeClasses: Array<{ grade: number; classes: OverviewClassRow[] }>
  registrationCounts: {
    renewed: number
    newRegistration: number
    notRenewed: number
  }
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalStudents, setTotalStudents] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [confirmPromote, setConfirmPromote] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [overview, setOverview] = useState<StudentsOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [gradeSectionsOpen, setGradeSectionsOpen] = useState<Record<number, boolean>>({})
  const [classModal, setClassModal] = useState<{ id: string; name: string } | null>(null)
  const [classModalStudents, setClassModalStudents] = useState<Student[]>([])
  const [classModalLoading, setClassModalLoading] = useState(false)

  const [notRenewedModalOpen, setNotRenewedModalOpen] = useState(false)
  const [notRenewedModalGrade, setNotRenewedModalGrade] = useState("")
  const [notRenewedGradeBand, setNotRenewedGradeBand] = useState<"" | "ortaokul" | "lise">("")
  const [notRenewedModalSearchInput, setNotRenewedModalSearchInput] = useState("")
  const [notRenewedModalSearchDebounced, setNotRenewedModalSearchDebounced] = useState("")
  const prevNotRenewedSearchRef = useRef<string | null>(null)
  const [notRenewedModalStudents, setNotRenewedModalStudents] = useState<Student[]>([])
  const [notRenewedModalLoading, setNotRenewedModalLoading] = useState(false)
  const [notRenewedModalPage, setNotRenewedModalPage] = useState(1)
  const [notRenewedModalTotalPages, setNotRenewedModalTotalPages] = useState(1)
  const [notRenewedModalTotal, setNotRenewedModalTotal] = useState(0)

  const [regBrowseModal, setRegBrowseModal] = useState<RegistrationBrowseKind | null>(null)
  const [regBrowsePage, setRegBrowsePage] = useState(1)
  const [regBrowseSearchInput, setRegBrowseSearchInput] = useState("")
  const [regBrowseSearchDebounced, setRegBrowseSearchDebounced] = useState("")
  const [regBrowseGrade, setRegBrowseGrade] = useState("")
  const [regBrowseGradeBand, setRegBrowseGradeBand] = useState<"" | "ortaokul" | "lise">("")
  const [regBrowseStudents, setRegBrowseStudents] = useState<Student[]>([])
  const [regBrowseLoading, setRegBrowseLoading] = useState(false)
  const [regBrowseTotalPages, setRegBrowseTotalPages] = useState(1)
  const [regBrowseTotal, setRegBrowseTotal] = useState(0)
  const prevRegBrowseSearchRef = useRef<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    tcNumber: "",
    birthDate: "",
    grade: "",
    address: "",
    motherName: "",
    motherTc: "",
    motherPhone: "",
    motherAddress: "",
    motherOccupation: "",
    fatherName: "",
    fatherTc: "",
    fatherPhone: "",
    fatherAddress: "",
    fatherOccupation: "",
    announcedTuitionFee: "",
    studentTuitionFee: ""
  })

  const gradeOptions = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Mezun"]

  // Kullanıcı rolünü kontrol et
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      setUserRole(role)
    }
  }, [])

  // Her kelimenin ilk harfini büyük, diğerlerini küçük yapan fonksiyon
  const capitalizeWords = (text: string): string => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Sınıf formatı helper - "5" -> "5. Sınıf"
  const formatGrade = (value: string | null | undefined): string => {
    if (!value) return "Belirtilmemiş"
    
    // Eğer zaten "X. Sınıf" formatındaysa olduğu gibi döndür
    if (value.includes(". Sınıf") || value.includes("Sınıf")) {
      return value
    }
    
    // Sadece rakam ise "X. Sınıf" formatına çevir
    const gradeNum = value.trim()
    if (/^\d+$/.test(gradeNum)) {
      return `${gradeNum}. Sınıf`
    }
    
    return value
  }

  // Sınıf değerini dropdown için normalize et - "5" veya "5. Sınıf" -> "5. Sınıf"
  const normalizeGradeForDropdown = (value: string | null | undefined): string => {
    if (!value) return ""
    
    // Eğer zaten "X. Sınıf" formatındaysa olduğu gibi döndür
    if (value.includes(". Sınıf")) {
      return value
    }
    
    // Sadece rakam ise "X. Sınıf" formatına çevir
    const gradeNum = value.trim()
    if (/^\d+$/.test(gradeNum)) {
      return `${gradeNum}. Sınıf`
    }
    
    return value
  }

  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true)
      const res = await fetch("/api/students/overview")
      if (res.ok) {
        setOverview(await res.json())
      } else {
        setOverview(null)
      }
    } catch (e) {
      console.error(e)
      setOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const fetchStudents = useCallback(async (page: number = 1, search: string = "", grade: string = "") => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        registrationMeta: "1",
      })
      if (search.trim()) {
        params.append("search", search.trim())
      }
      if (grade.trim()) {
        params.append("grade", grade.trim())
      }

      const response = await fetch(`/api/students?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      if (data.students && data.pagination) {
        setStudents(data.students)
        setTotalPages(data.pagination.totalPages)
        setTotalStudents(data.pagination.total)
      } else {
        // Fallback: eski format (array)
        setStudents(Array.isArray(data) ? data : [])
        setTotalPages(1)
        setTotalStudents(Array.isArray(data) ? data.length : 0)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
      setTotalPages(1)
      setTotalStudents(0)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  // Arama, sınıf veya kayıt filtresi değiştiğinde ilk sayfaya dön
  useEffect(() => {
    setCurrentPage(1)
    fetchStudents(1, searchTerm, selectedGrade)
  }, [searchTerm, selectedGrade, fetchStudents])

  // Sayfa değiştiğinde
  useEffect(() => {
    if (currentPage > 0) {
      fetchStudents(currentPage, searchTerm, selectedGrade)
    }
  }, [currentPage, fetchStudents, searchTerm, selectedGrade])

  const openClassModal = async (classId: string, className: string) => {
    setClassModal({ id: classId, name: className })
    setClassModalLoading(true)
    setClassModalStudents([])
    try {
      const res = await fetch(`/api/classes/${classId}/students?registrationMeta=1`)
      if (res.ok) {
        const data = await res.json()
        setClassModalStudents(data.students || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setClassModalLoading(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : "/api/students"
      const method = editingStudent ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole || "",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchStudents()
        fetchOverview()
        setShowForm(false)
        setEditingStudent(null)
        setFormData({
          firstName: "",
          lastName: "",
          tcNumber: "",
          birthDate: "",
          grade: "",
          address: "",
          motherName: "",
          motherTc: "",
          motherPhone: "",
          motherAddress: "",
          motherOccupation: "",
          fatherName: "",
          fatherTc: "",
          fatherPhone: "",
          fatherAddress: "",
          fatherOccupation: "",
          announcedTuitionFee: "",
          studentTuitionFee: ""
        })
        alert(editingStudent ? "Öğrenci başarıyla güncellendi!" : "Öğrenci başarıyla eklendi!")
        // Listeyi yenile
        fetchStudents(currentPage, searchTerm, selectedGrade)
      } else {
        alert(editingStudent ? "Öğrenci güncellenirken hata oluştu!" : "Öğrenci eklenirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving student:", error)
    }
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    // Doğum tarihini YYYY-MM-DD formatına çevir
    let birthDateFormatted = ""
    if (student.birthDate) {
      try {
        const date = new Date(student.birthDate)
        if (!isNaN(date.getTime())) {
          birthDateFormatted = date.toISOString().split('T')[0]
        }
      } catch (e) {
        console.error("Date parse error:", e)
      }
    }
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      tcNumber: student.tcNumber,
      birthDate: birthDateFormatted,
      grade: normalizeGradeForDropdown(student.grade),
      address: student.address,
      motherName: student.motherName,
      motherTc: student.motherTc,
      motherPhone: student.motherPhone,
      motherAddress: student.motherAddress,
      motherOccupation: student.motherOccupation,
      fatherName: student.fatherName,
      fatherTc: student.fatherTc,
      fatherPhone: student.fatherPhone,
      fatherAddress: student.fatherAddress,
      fatherOccupation: student.fatherOccupation,
      announcedTuitionFee: student.announcedTuitionFee || "",
      studentTuitionFee: student.studentTuitionFee || ""
    })
    setShowForm(true)
  }

  const handleDelete = async (studentId: string) => {
    if (confirm("Bu öğrenciyi silmek istediğinizden emin misiniz?")) {
      try {
        const response = await fetch(`/api/students/${studentId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          fetchStudents(currentPage, searchTerm, selectedGrade)
          fetchOverview()
          alert("Öğrenci başarıyla silindi!")
        } else {
          alert("Öğrenci silinirken hata oluştu!")
        }
      } catch (error) {
        console.error("Error deleting student:", error)
      }
    }
  }

  const handlePromoteAll = async () => {
    try {
      const response = await fetch("/api/students/promote-all", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || "Öğrenciler başarıyla yükseltildi!")
        fetchStudents(currentPage, searchTerm, selectedGrade)
        fetchOverview()
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Öğrenciler yükseltilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error promoting students:", error)
      alert("Öğrenciler yükseltilirken hata oluştu!")
    } finally {
      setConfirmPromote(false)
    }
  }

  const openRegistrationBrowseModal = useCallback((kind: RegistrationBrowseKind) => {
    setRegBrowseModal(kind)
    setRegBrowsePage(1)
    setRegBrowseGrade("")
    setRegBrowseGradeBand("")
    setRegBrowseSearchInput("")
    setRegBrowseSearchDebounced("")
    prevRegBrowseSearchRef.current = null
  }, [])

  const openNotRenewedModal = useCallback(() => {
    setNotRenewedModalOpen(true)
    setNotRenewedModalPage(1)
    setNotRenewedModalGrade("")
    setNotRenewedGradeBand("")
    setNotRenewedModalSearchInput("")
    setNotRenewedModalSearchDebounced("")
    prevNotRenewedSearchRef.current = null
  }, [])

  useEffect(() => {
    if (!notRenewedModalOpen) return
    const t = setTimeout(() => {
      setNotRenewedModalSearchDebounced(notRenewedModalSearchInput.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [notRenewedModalSearchInput, notRenewedModalOpen])

  useEffect(() => {
    if (!notRenewedModalOpen) return
    if (prevNotRenewedSearchRef.current === null) {
      prevNotRenewedSearchRef.current = notRenewedModalSearchDebounced
      return
    }
    if (prevNotRenewedSearchRef.current !== notRenewedModalSearchDebounced) {
      prevNotRenewedSearchRef.current = notRenewedModalSearchDebounced
      setNotRenewedModalPage(1)
    }
  }, [notRenewedModalSearchDebounced, notRenewedModalOpen])

  useEffect(() => {
    if (!notRenewedModalOpen) return
    let cancelled = false
    ;(async () => {
      setNotRenewedModalLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(notRenewedModalPage),
          limit: "30",
          registrationMeta: "1",
          registrationFilter: "not_renewed",
        })
        if (notRenewedModalSearchDebounced) {
          params.set("search", notRenewedModalSearchDebounced)
        }
        if (notRenewedModalGrade.trim()) {
          params.set("grade", notRenewedModalGrade.trim())
        } else if (notRenewedGradeBand) {
          params.set("gradeBand", notRenewedGradeBand)
        }
        const res = await fetch(`/api/students?${params}`)
        if (!cancelled && res.ok) {
          const data = await res.json()
          setNotRenewedModalStudents(data.students ?? [])
          const p = data.pagination
          if (p) {
            setNotRenewedModalTotalPages(Math.max(1, p.totalPages ?? 1))
            setNotRenewedModalTotal(p.total ?? 0)
          } else {
            setNotRenewedModalTotalPages(1)
            setNotRenewedModalTotal(Array.isArray(data.students) ? data.students.length : 0)
          }
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setNotRenewedModalStudents([])
          setNotRenewedModalTotalPages(1)
          setNotRenewedModalTotal(0)
        }
      } finally {
        if (!cancelled) setNotRenewedModalLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    notRenewedModalOpen,
    notRenewedModalPage,
    notRenewedModalSearchDebounced,
    notRenewedModalGrade,
    notRenewedGradeBand,
  ])

  useEffect(() => {
    if (!regBrowseModal) return
    const t = setTimeout(() => {
      setRegBrowseSearchDebounced(regBrowseSearchInput.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [regBrowseSearchInput, regBrowseModal])

  useEffect(() => {
    if (!regBrowseModal) return
    if (prevRegBrowseSearchRef.current === null) {
      prevRegBrowseSearchRef.current = regBrowseSearchDebounced
      return
    }
    if (prevRegBrowseSearchRef.current !== regBrowseSearchDebounced) {
      prevRegBrowseSearchRef.current = regBrowseSearchDebounced
      setRegBrowsePage(1)
    }
  }, [regBrowseSearchDebounced, regBrowseModal])

  useEffect(() => {
    if (!regBrowseModal) return
    let cancelled = false
    ;(async () => {
      setRegBrowseLoading(true)
      try {
        if (regBrowseModal === "pre_enrollment") {
          const params = new URLSearchParams({
            page: String(regBrowsePage),
            limit: "30",
          })
          if (regBrowseSearchDebounced) params.set("search", regBrowseSearchDebounced)
          if (regBrowseGrade.trim()) {
            params.set("grade", regBrowseGrade.trim())
          } else if (regBrowseGradeBand) {
            params.set("gradeBand", regBrowseGradeBand)
          }
          const res = await fetch(`/api/students/pre-enrollment?${params}`)
          if (!cancelled) {
            if (res.ok) {
              const data = await res.json()
              setRegBrowseStudents(data.students ?? [])
              const p = data.pagination
              if (p) {
                setRegBrowseTotalPages(Math.max(1, p.totalPages ?? 1))
                setRegBrowseTotal(p.total ?? 0)
              } else {
                setRegBrowseTotalPages(1)
                setRegBrowseTotal(Array.isArray(data.students) ? data.students.length : 0)
              }
            } else {
              setRegBrowseStudents([])
              setRegBrowseTotalPages(1)
              setRegBrowseTotal(0)
            }
          }
        } else {
          const params = new URLSearchParams({
            page: String(regBrowsePage),
            limit: "30",
            registrationMeta: "1",
            registrationFilter: regBrowseModal === "renewed" ? "renewed" : "new_registration",
          })
          if (regBrowseSearchDebounced) params.set("search", regBrowseSearchDebounced)
          if (regBrowseGrade.trim()) {
            params.set("grade", regBrowseGrade.trim())
          } else if (regBrowseGradeBand) {
            params.set("gradeBand", regBrowseGradeBand)
          }
          const res = await fetch(`/api/students?${params}`)
          if (!cancelled) {
            if (res.ok) {
              const data = await res.json()
              setRegBrowseStudents(data.students ?? [])
              const p = data.pagination
              if (p) {
                setRegBrowseTotalPages(Math.max(1, p.totalPages ?? 1))
                setRegBrowseTotal(p.total ?? 0)
              } else {
                setRegBrowseTotalPages(1)
                setRegBrowseTotal(Array.isArray(data.students) ? data.students.length : 0)
              }
            } else {
              setRegBrowseStudents([])
              setRegBrowseTotalPages(1)
              setRegBrowseTotal(0)
            }
          }
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setRegBrowseStudents([])
          setRegBrowseTotalPages(1)
          setRegBrowseTotal(0)
        }
      } finally {
        if (!cancelled) setRegBrowseLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    regBrowseModal,
    regBrowsePage,
    regBrowseSearchDebounced,
    regBrowseGrade,
    regBrowseGradeBand,
  ])

  const registrationStatusClass = (text: string | undefined) => {
    if (!text) return "bg-gray-100 text-gray-600"
    if (text === "Yeni Kayıt") return "bg-emerald-100 text-emerald-800"
    if (text.includes("kaydı yenilendi")) return "bg-sky-100 text-sky-900"
    if (text === "Kaydı yenilenmedi") return "bg-amber-100 text-amber-900"
    return "bg-gray-100 text-gray-600"
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">Öğrenci bilgilerini ekleyin, düzenleyin ve yönetin</p>
          </div>
          <div className="mb-1 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs sm:text-sm font-medium">
              {selectedGrade ? (
                <>
                  <span className="font-semibold truncate">{selectedGrade}</span> <span className="hidden sm:inline">Öğrenci Sayısı:</span> <span className="sm:hidden">:</span> <span className="font-semibold">{totalStudents}</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Toplam Öğrenci:</span> <span className="sm:hidden">Toplam:</span> <span className="font-semibold">{totalStudents}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Özet panelleri: toplam = mezun + ön kayıt hariç; kayıt kutuları hedef yıla göre */}
      <div className="mb-4 sm:mb-6 space-y-4">
        {overviewLoading ? (
          <p className="text-sm text-gray-500">Özet yükleniyor…</p>
        ) : overview ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide">
                  <Users className="h-4 w-4" />
                  Toplam öğrenci
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{overview.totalStudents}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Mezunlar ve gelecek yıl(lar) ön kayıtları hariç
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide">
                  <School className="h-4 w-4" />
                  Ortaokul
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{overview.ortaokulCount}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">5–8. sınıf</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide">
                  <GraduationCap className="h-4 w-4" />
                  Lise
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{overview.liseCount}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">9–12. sınıf</p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 sm:p-4 shadow-sm col-span-2 lg:col-span-1">
                <p className="text-xs font-medium text-indigo-900">Kayıt dönemi</p>
                <p className="text-sm font-semibold text-indigo-950 mt-0.5">
                  {overview.renewalTargetYear
                    ? `${overview.renewalTargetYear.name} (${overview.renewalTargetYear.label})`
                    : "Tanımlı değil"}
                </p>
                {overview.activeAcademicYear && (
                  <p className="text-[10px] text-indigo-800/80 mt-1">
                    Sınıf şubeleri: {overview.activeAcademicYear.name}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => openRegistrationBrowseModal("renewed")}
                className={cn(
                  "rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md",
                  regBrowseModal === "renewed"
                    ? "border-sky-400 bg-sky-50 ring-2 ring-sky-300"
                    : "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-center gap-2 text-sky-800 text-xs font-semibold">
                  <FileCheck className="h-4 w-4" />
                  Kayıt yenileyen
                </div>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {overview.registrationCounts.renewed}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Filtreli listeyi açmak için tıklayın
                </p>
              </button>
              <button
                type="button"
                onClick={() => openRegistrationBrowseModal("new_registration")}
                className={cn(
                  "rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md",
                  regBrowseModal === "new_registration"
                    ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300"
                    : "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <UserPlus className="h-4 w-4" />
                  Yeni kayıt
                </div>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {overview.registrationCounts.newRegistration}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Yeni Kayıt Yaptırıp Eğitime Başlayan Öğrenciler
                </p>
              </button>
              <button
                type="button"
                onClick={openNotRenewedModal}
                className={cn(
                  "rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md",
                  notRenewedModalOpen
                    ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300"
                    : "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  Kayıt yenilemeyen
                </div>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {overview.registrationCounts.notRenewed}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Listeyi ayrı pencerede görmek için tıklayın
                </p>
              </button>
              <button
                type="button"
                onClick={() => openRegistrationBrowseModal("pre_enrollment")}
                className={cn(
                  "rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md",
                  regBrowseModal === "pre_enrollment"
                    ? "border-violet-400 bg-violet-50 ring-2 ring-violet-300"
                    : "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-center gap-2 text-violet-900 text-xs font-semibold">
                  <CalendarClock className="h-4 w-4" />
                  Ön kayıt
                </div>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {overview.preEnrollmentCount ?? 0}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  {overview.preEnrollmentTargetYear
                    ? `${overview.preEnrollmentTargetYear.label} için yeni kayıt`
                    : "Gelecek yıl için ön kayıt"}
                </p>
                <p className="text-[10px] sm:text-xs text-violet-700/90 mt-0.5">
                  Filtreli listeyi açmak için tıklayın
                </p>
              </button>
            </div>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="py-3 sm:py-4">
                <CardTitle className="text-base">Sınıf düzeyi ve şubeler</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {overview.activeAcademicYear
                    ? `Düzey satırındaki sayı, öğrenci kartındaki sınıfa göre (ön kayıtlı hariç). Şube rozetlerinde de yalnızca bu yıl sayılan öğrenciler sayılır; şubeye tıklayarak listeyi açın.`
                    : "Aktif akademik yıl yok; şube listesi boş. Sınıf yönetiminden yıl ve sınıf oluşturun."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {overview.byGradeClasses.map(({ grade, classes: cls }) => {
                  const label = gradeLevelLabel(grade)
                  const count = overview.byGradeCounts[label] ?? 0
                  const open = gradeSectionsOpen[grade] ?? false
                  return (
                    <div key={grade} className="rounded-lg border border-gray-100 bg-gray-50/80">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                        onClick={() =>
                          setGradeSectionsOpen((s) => ({ ...s, [grade]: !open }))
                        }
                      >
                        <span className="font-semibold text-gray-900 text-sm">
                          {label}{" "}
                          <span className="font-normal text-gray-500">— {count} öğrenci</span>
                        </span>
                        {open ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                        )}
                      </button>
                      {open && (
                        <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                          {cls.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              Bu düzeyde aktif yılda şube yok. Sınıf yönetiminden ekleyebilirsiniz.
                            </p>
                          ) : (
                            <>
                              <p className="text-[11px] text-gray-500 mb-2">
                                {cls.length} şube (aktif akademik yıl)
                              </p>
                            <div className="flex flex-wrap gap-2">
                              {cls.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => openClassModal(c.id, c.name)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                                >
                                  <span>{c.name}</span>
                                  <span className="text-gray-500">— {c.studentCount} öğrenci</span>
                                </button>
                              ))}
                            </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-2 items-stretch sm:items-center w-full sm:min-w-[300px]">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
            <Input
              placeholder="Öğrenci ara (ad, soyad, TC, sınıf)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>
          <div className="flex-shrink-0 w-full sm:w-auto">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full sm:w-auto h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tüm Sınıflar</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {confirmPromote ? (
          <>
            <Button type="button" variant="destructive" size="sm" onClick={handlePromoteAll} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Eminim, Yükselt</span>
              <span className="sm:hidden">Yükselt</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmPromote(false)} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              İptal
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmPromote(true)} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Sınıf Yükselt</span>
            <span className="sm:hidden">Yükselt</span>
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={async () => {
          try {
            const res = await fetch('/api/students/export')
            if (!res.ok) throw new Error('Export failed')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'ogrenciler.xlsx'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
          } catch (e) {
            console.error('Export error:', e)
            alert('Excel dışa aktarım başarısız oldu')
          }
        }} className="flex-1 sm:flex-initial text-xs sm:text-sm">
          <span className="hidden sm:inline">Excel&apos;e Aktar</span>
          <span className="sm:hidden">Excel</span>
        </Button>
        <Button onClick={() => setShowForm(true)} size="sm" className="flex-1 sm:flex-initial text-xs sm:text-sm">
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Yeni Öğrenci Ekle</span>
          <span className="sm:hidden">Yeni Ekle</span>
        </Button>
        </div>
      </div>

      {/* Modal Overlay */}
      {showForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" 
          onClick={() => {
            setShowForm(false)
            setEditingStudent(null)
            setFormData({
              firstName: "",
              lastName: "",
              tcNumber: "",
              birthDate: "",
              grade: "",
              address: "",
              motherName: "",
              motherTc: "",
              motherPhone: "",
              motherAddress: "",
              motherOccupation: "",
              fatherName: "",
              fatherTc: "",
              fatherPhone: "",
              fatherAddress: "",
              fatherOccupation: "",
              announcedTuitionFee: "",
              studentTuitionFee: ""
            })
          }}
        >
          <Card 
            className="w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto bg-white shadow-2xl rounded-none sm:rounded-lg" 
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">{editingStudent ? "Öğrenci Düzenle" : "Yeni Öğrenci Ekle"}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {editingStudent ? "Öğrenci bilgilerini güncelleyin" : "Yeni öğrenci bilgilerini girin"}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setEditingStudent(null)
                    setFormData({
                      firstName: "",
                      lastName: "",
                      tcNumber: "",
                      birthDate: "",
                      grade: "",
                      address: "",
                      motherName: "",
                      motherTc: "",
                      motherPhone: "",
                      motherAddress: "",
                      motherOccupation: "",
                      fatherName: "",
                      fatherTc: "",
                      fatherPhone: "",
                      fatherAddress: "",
                      fatherOccupation: "",
                      announcedTuitionFee: "",
                      studentTuitionFee: ""
                    })
                  }}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-xs sm:text-sm">Öğrenci Adı *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: capitalizeWords(e.target.value) })}
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs sm:text-sm">Öğrenci Soyadı *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: capitalizeWords(e.target.value) })}
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="tcNumber" className="text-xs sm:text-sm">TC Kimlik No * <span className="text-[10px] sm:text-xs text-gray-500">(11 haneli)</span></Label>
                  <Input
                    id="tcNumber"
                    value={formData.tcNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                      setFormData({ ...formData, tcNumber: value })
                    }}
                    maxLength={11}
                    placeholder="12345678901"
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="grade" className="text-xs sm:text-sm">Sınıfı * "Öğrencinin Aktif Olarak Eğitim Gördüğü Sınıf"</Label>
                  <select
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 border border-input bg-background rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sınıf seçin...</option>
                    {gradeOptions.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="birthDate" className="text-xs sm:text-sm">Doğum Tarihi *</Label>
                </div>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-xs sm:text-sm">Adres *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Öğrenci Anne Bilgileri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="motherName" className="text-xs sm:text-sm">Ad Soyad</Label>
                    <Input
                      id="motherName"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: capitalizeWords(e.target.value) })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherTc" className="text-xs sm:text-sm">TC <span className="text-[10px] sm:text-xs text-gray-500">(11 haneli)</span></Label>
                    <Input
                      id="motherTc"
                      value={formData.motherTc}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setFormData({ ...formData, motherTc: value })
                      }}
                      maxLength={11}
                      placeholder="12345678901"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherPhone" className="text-xs sm:text-sm">Telefon <span className="text-[10px] sm:text-xs text-gray-500">(5XX XXX XX XX)</span></Label>
                    <Input
                      id="motherPhone"
                      value={formData.motherPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setFormData({ ...formData, motherPhone: value })
                      }}
                      maxLength={10}
                      placeholder="5XXXXXXXXX"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherOccupation" className="text-xs sm:text-sm">Meslek</Label>
                    <Input
                      id="motherOccupation"
                      value={formData.motherOccupation}
                      onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 sm:mt-4">
                  <Label htmlFor="motherAddress" className="text-xs sm:text-sm">Adres</Label>
                  <Input
                    id="motherAddress"
                    value={formData.motherAddress}
                    onChange={(e) => setFormData({ ...formData, motherAddress: e.target.value })}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold">Öğrenci Baba Bilgileri</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ 
                      ...formData,
                      fatherName: formData.motherName,
                      fatherTc: formData.motherTc,
                      fatherPhone: formData.motherPhone,
                      fatherAddress: formData.motherAddress,
                      fatherOccupation: formData.motherOccupation
                    })}
                    className="text-xs sm:text-sm w-full sm:w-auto"
                  >
                    Anne Bilgilerini Kopyala
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="fatherName" className="text-xs sm:text-sm">Ad Soyad</Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: capitalizeWords(e.target.value) })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherTc" className="text-xs sm:text-sm">TC <span className="text-[10px] sm:text-xs text-gray-500">(11 haneli)</span></Label>
                    <Input
                      id="fatherTc"
                      value={formData.fatherTc}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setFormData({ ...formData, fatherTc: value })
                      }}
                      maxLength={11}
                      placeholder="12345678901"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherPhone" className="text-xs sm:text-sm">Telefon <span className="text-[10px] sm:text-xs text-gray-500">(5XX XXX XX XX)</span></Label>
                    <Input
                      id="fatherPhone"
                      value={formData.fatherPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setFormData({ ...formData, fatherPhone: value })
                      }}
                      maxLength={10}
                      placeholder="5XXXXXXXXX"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherOccupation" className="text-xs sm:text-sm">Meslek</Label>
                    <Input
                      id="fatherOccupation"
                      value={formData.fatherOccupation}
                      onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 sm:mt-4">
                  <Label htmlFor="fatherAddress" className="text-xs sm:text-sm">Adres</Label>
                  <Input
                    id="fatherAddress"
                    value={formData.fatherAddress}
                    onChange={(e) => setFormData({ ...formData, fatherAddress: e.target.value })}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Öğrenim Ücreti - Admin düzenleyebilir, Müdür ve Öğrenci İşleri salt okunur görebilir */}
              {(userRole === "admin" || userRole === "principal" || userRole === "student_affairs") && (
                <div className="border-t pt-3 sm:pt-4">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Öğrenim Ücreti</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="announcedTuitionFee" className="text-xs sm:text-sm">Kurumun İlan Ettiği Ücret</Label>
                      <Input
                        id="announcedTuitionFee"
                        type="text"
                        value={formData.announcedTuitionFee}
                        onChange={(e) => setFormData({ ...formData, announcedTuitionFee: e.target.value })}
                        placeholder="Örn: 50.000 TL"
                        readOnly={userRole !== "admin"}
                        className={`h-9 sm:h-10 text-xs sm:text-sm ${userRole !== "admin" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentTuitionFee" className="text-xs sm:text-sm">Öğrenci için Belirlenen Ücret</Label>
                      <Input
                        id="studentTuitionFee"
                        type="text"
                        value={formData.studentTuitionFee}
                        onChange={(e) => setFormData({ ...formData, studentTuitionFee: e.target.value })}
                        placeholder="Örn: 45.000 TL"
                        readOnly={userRole !== "admin"}
                        className={`h-9 sm:h-10 text-xs sm:text-sm ${userRole !== "admin" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button type="submit" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {editingStudent ? "Güncelle" : "Kaydet"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setShowForm(false)
                  setEditingStudent(null)
                  setFormData({
                    firstName: "",
                    lastName: "",
                    tcNumber: "",
                    birthDate: "",
                    grade: "",
                    address: "",
                    motherName: "",
                    motherTc: "",
                    motherPhone: "",
                    motherAddress: "",
                    motherOccupation: "",
                    fatherName: "",
                    fatherTc: "",
                    fatherPhone: "",
                    fatherAddress: "",
                    fatherOccupation: "",
                    announcedTuitionFee: "",
                    studentTuitionFee: ""
                  })
                }} className="w-full sm:w-auto text-xs sm:text-sm">
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci</th>
                  <th className="hidden lg:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TC</th>
                  <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                  <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                    Kayıt
                  </th>
                  <th className="hidden md:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                  <th className="hidden lg:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anne</th>
                  <th className="hidden md:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anne Tel</th>
                  <th className="hidden lg:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baba</th>
                  <th className="hidden md:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baba Tel</th>
                  <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(student)}>
                    <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="lg:hidden text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                        TC: {student.tcNumber}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {student.tcNumber}
                    </td>
                    <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {formatGrade(student.grade)}
                    </td>
                    <td
                      className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className={cn(
                          "inline-block max-w-[200px] text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md leading-snug",
                          registrationStatusClass(student.registrationStatusText)
                        )}
                      >
                        {student.registrationStatusText ?? "—"}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 max-w-xs truncate">
                      {student.address}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {student.motherName}
                    </td>
                    <td className="hidden md:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      <a href={`tel:${student.motherPhone}`} className="text-blue-600 hover:underline">
                        {student.motherPhone}
                      </a>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {student.fatherName}
                    </td>
                    <td className="hidden md:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      <a href={`tel:${student.fatherPhone}`} className="text-blue-600 hover:underline">
                        {student.fatherPhone}
                      </a>
                    </td>
                    <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                      <div className="flex gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(student)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(student.id)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm px-4">
                {searchTerm ? "Arama kriterlerinize uygun öğrenci bulunamadı." : "Henüz öğrenci eklenmemiş."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!regBrowseModal}
        onOpenChange={(open) => {
          if (!open) {
            setRegBrowseModal(null)
            prevRegBrowseSearchRef.current = null
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0 space-y-1 pr-8 text-left">
            <DialogTitle>
              {regBrowseModal === "renewed" && "Kayıt yenileyenler"}
              {regBrowseModal === "new_registration" && "Yeni kayıt (aktif akademik yıl)"}
              {regBrowseModal === "pre_enrollment" && "Ön kayıtlı öğrenciler"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {regBrowseModal === "renewed" &&
                (overview?.renewalTargetYear?.label
                  ? `Hedef yıla (${overview.renewalTargetYear.label}) kayıt yenilemesi olan öğrenciler. Arama, kademe ve sınıf filtreleri uygulanır.`
                  : "Kayıt yenilemesi tanımlı hedef yıla göre eşleşen öğrenciler.")}
              {regBrowseModal === "new_registration" &&
                "Aktif akademik yıla yeni kayıt sözleşmesi olan öğrenciler (yıl ortası geçişler). Arama, kademe ve sınıf filtreleri uygulanır."}
              {regBrowseModal === "pre_enrollment" &&
                (overview?.preEnrollmentTargetYear
                  ? `Aktif yıldan sonra başlayan yıla (ör. ${overview.preEnrollmentTargetYear.label}) yeni kaydı olan öğrenciler; bu yıl toplam sayıma dahil değillerdir.`
                  : "Gelecek akademik yıla ön kayıtlı öğrenciler.")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 shrink-0 space-y-3 border-b border-gray-100 pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-600">Kademe</Label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={regBrowseGradeBand === "" && !regBrowseGrade ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => {
                      setRegBrowseGradeBand("")
                      setRegBrowseGrade("")
                      setRegBrowsePage(1)
                    }}
                  >
                    Tümü
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={regBrowseGradeBand === "ortaokul" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => {
                      setRegBrowseGradeBand("ortaokul")
                      setRegBrowseGrade("")
                      setRegBrowsePage(1)
                    }}
                  >
                    Ortaokul (5–8)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={regBrowseGradeBand === "lise" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => {
                      setRegBrowseGradeBand("lise")
                      setRegBrowseGrade("")
                      setRegBrowsePage(1)
                    }}
                  >
                    Lise (9–12)
                  </Button>
                </div>
              </div>
              <div className="w-full min-w-0 sm:w-48 space-y-1">
                <Label htmlFor="reg-browse-grade" className="text-xs text-gray-600">
                  Sınıf düzeyi
                </Label>
                <select
                  id="reg-browse-grade"
                  value={regBrowseGrade}
                  onChange={(e) => {
                    setRegBrowseGrade(e.target.value)
                    setRegBrowseGradeBand("")
                    setRegBrowsePage(1)
                  }}
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">Tüm sınıflar (kademe filtresine göre)</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-browse-search" className="text-xs text-gray-600">
                Ara (ad, soyad, TC, sınıf)
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="reg-browse-search"
                  value={regBrowseSearchInput}
                  onChange={(e) => setRegBrowseSearchInput(e.target.value)}
                  placeholder="Yazdıktan kısa süre sonra liste güncellenir…"
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              {regBrowseLoading
                ? "Yükleniyor…"
                : `Bu görünümde ${regBrowseTotal} öğrenci${regBrowseTotalPages > 1 ? ` (sayfa ${regBrowsePage}/${regBrowseTotalPages})` : ""}.`}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-3">
            {regBrowseLoading && regBrowseStudents.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">Yükleniyor…</p>
            ) : regBrowseStudents.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                {regBrowseModal === "renewed" && "Kriterlere uygun kayıt yenilemesi olan öğrenci yok."}
                {regBrowseModal === "new_registration" &&
                  "Kriterlere uygun aktif yıl yeni kaydı olan öğrenci yok."}
                {regBrowseModal === "pre_enrollment" &&
                  "Kriterlere uygun ön kayıtlı öğrenci yok veya tanımlı yıl yok."}
              </p>
            ) : (
              <ul className="space-y-2 pr-1">
                {regBrowseStudents.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        regBrowseModal === "renewed" &&
                          "border-sky-100/80 bg-sky-50/40 hover:bg-sky-50/90",
                        regBrowseModal === "new_registration" &&
                          "border-emerald-100/80 bg-emerald-50/40 hover:bg-emerald-50/90",
                        regBrowseModal === "pre_enrollment" &&
                          "border-violet-100/80 bg-violet-50/40 hover:bg-violet-50/90"
                      )}
                      onClick={() => {
                        setRegBrowseModal(null)
                        handleEdit(s)
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-gray-900">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="text-xs font-medium text-gray-600">
                          {formatGrade(s.grade)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>TC: {s.tcNumber || "—"}</span>
                        {regBrowseModal === "pre_enrollment" ? (
                          <span className="font-medium px-2 py-0.5 rounded-md bg-violet-100 text-violet-900">
                            Ön kayıt
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "font-medium px-2 py-0.5 rounded-md",
                              registrationStatusClass(s.registrationStatusText)
                            )}
                          >
                            {s.registrationStatusText ?? "—"}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {regBrowseTotalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">
                Sayfa {regBrowsePage} / {regBrowseTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={regBrowsePage <= 1 || regBrowseLoading}
                  onClick={() => setRegBrowsePage((p) => Math.max(1, p - 1))}
                >
                  Önceki
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={regBrowsePage >= regBrowseTotalPages || regBrowseLoading}
                  onClick={() =>
                    setRegBrowsePage((p) => Math.min(regBrowseTotalPages, p + 1))
                  }
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!classModal}
        onOpenChange={(open) => {
          if (!open) setClassModal(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{classModal?.name ?? "Sınıf"}</DialogTitle>
            <DialogDescription>
              Bu yıl sayılan öğrenciler (gelecek yıl ön kayıtlı atamalar listede yok) ve kayıt durumu
            </DialogDescription>
          </DialogHeader>
          {classModalLoading ? (
            <p className="text-sm text-gray-500 py-4">Yükleniyor…</p>
          ) : classModalStudents.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Bu sınıfta öğrenci yok.</p>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {classModalStudents.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">
                      {s.firstName} {s.lastName}
                    </span>
                    <span className="text-xs text-gray-500">{formatGrade(s.grade)}</span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md w-fit",
                      registrationStatusClass(s.registrationStatusText)
                    )}
                  >
                    {s.registrationStatusText ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={notRenewedModalOpen}
        onOpenChange={(open) => {
          setNotRenewedModalOpen(open)
          if (!open) prevNotRenewedSearchRef.current = null
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0 space-y-1 pr-8 text-left">
            <DialogTitle>Kayıt yenilemeyen öğrenciler</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {overview?.renewalTargetYear?.label
                ? `Hedef yıl (${overview.renewalTargetYear.label}) için kayıt yenilemesi veya ilgili yeni kayıt kaydı olmayan öğrenciler. Mezunlar varsayılan olarak listede yoktur.`
                : "Kayıt yenilemesi veya ilgili yeni kayıt kaydı olmayan öğrenciler. Mezunlar varsayılan olarak listede yoktur."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 shrink-0 space-y-3 border-b border-gray-100 pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-600">Kademe</Label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={notRenewedGradeBand === "" && !notRenewedModalGrade ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => {
                      setNotRenewedGradeBand("")
                      setNotRenewedModalGrade("")
                      setNotRenewedModalPage(1)
                    }}
                  >
                    Tümü
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={notRenewedGradeBand === "ortaokul" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => {
                      setNotRenewedGradeBand("ortaokul")
                      setNotRenewedModalGrade("")
                      setNotRenewedModalPage(1)
                    }}
                  >
                    Ortaokul (5–8)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={notRenewedGradeBand === "lise" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => {
                      setNotRenewedGradeBand("lise")
                      setNotRenewedModalGrade("")
                      setNotRenewedModalPage(1)
                    }}
                  >
                    Lise (9–12)
                  </Button>
                </div>
              </div>
              <div className="w-full min-w-0 sm:w-48 space-y-1">
                <Label htmlFor="not-renewed-grade" className="text-xs text-gray-600">
                  Sınıf düzeyi
                </Label>
                <select
                  id="not-renewed-grade"
                  value={notRenewedModalGrade}
                  onChange={(e) => {
                    setNotRenewedModalGrade(e.target.value)
                    setNotRenewedGradeBand("")
                    setNotRenewedModalPage(1)
                  }}
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">Tüm sınıflar (kademe filtresine göre)</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="not-renewed-search" className="text-xs text-gray-600">
                Ara (ad, soyad, TC)
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="not-renewed-search"
                  value={notRenewedModalSearchInput}
                  onChange={(e) => setNotRenewedModalSearchInput(e.target.value)}
                  placeholder="Yazdıktan kısa süre sonra liste güncellenir…"
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              {notRenewedModalLoading
                ? "Yükleniyor…"
                : `Bu görünümde ${notRenewedModalTotal} öğrenci${notRenewedModalTotalPages > 1 ? ` (sayfa ${notRenewedModalPage}/${notRenewedModalTotalPages})` : ""}.`}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-3">
            {notRenewedModalLoading && notRenewedModalStudents.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">Yükleniyor…</p>
            ) : notRenewedModalStudents.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                Kriterlere uygun kayıt yenilemeyen öğrenci yok.
              </p>
            ) : (
              <ul className="space-y-2 pr-1">
                {notRenewedModalStudents.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-1 rounded-lg border border-amber-100/80 bg-amber-50/40 px-3 py-2.5 text-left text-sm transition-colors hover:bg-amber-50/90"
                      onClick={() => {
                        setNotRenewedModalOpen(false)
                        handleEdit(s)
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-gray-900">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="text-xs font-medium text-gray-600">
                          {formatGrade(s.grade)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>TC: {s.tcNumber || "—"}</span>
                        <span
                          className={cn(
                            "font-medium px-2 py-0.5 rounded-md",
                            registrationStatusClass(s.registrationStatusText)
                          )}
                        >
                          {s.registrationStatusText ?? "—"}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notRenewedModalTotalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">
                Sayfa {notRenewedModalPage} / {notRenewedModalTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={notRenewedModalPage <= 1 || notRenewedModalLoading}
                  onClick={() => setNotRenewedModalPage((p) => Math.max(1, p - 1))}
                >
                  Önceki
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={
                    notRenewedModalPage >= notRenewedModalTotalPages || notRenewedModalLoading
                  }
                  onClick={() =>
                    setNotRenewedModalPage((p) => Math.min(notRenewedModalTotalPages, p + 1))
                  }
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
            Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
            {(searchTerm || selectedGrade) && (
              <span className="ml-1 sm:ml-2 text-gray-500 block sm:inline mt-1 sm:mt-0">
                ({searchTerm && selectedGrade ? 'Arama ve Filtre' : searchTerm ? 'Arama' : 'Filtre'} sonuçları: {totalStudents} öğrenci)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-xs sm:text-sm"
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="text-xs sm:text-sm"
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
