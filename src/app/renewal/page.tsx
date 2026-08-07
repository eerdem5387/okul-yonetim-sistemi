"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Users, Clock, TrendingUp, GraduationCap, List, Search, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  contractYearLabelFromAcademicYear,
  getRenewalTargetYearFromList,
  getRenewalYearSetupIssue,
  renewalSetupErrorMessage,
  type AcademicYearListItem,
} from "@/lib/academic-year-ui"
import {
  formatPersonName,
  formatTcInput,
  formatValidationAlert,
  validateContractFields,
  validateUniformFields,
} from "@/lib/registration-form-validation"
import { renewalTargetClassLabel } from "@/lib/student-grade-level"
import { RenewalGradeExplainer } from "@/components/registration/RenewalGradeExplainer"
import { RENEWAL_STATS_FRACTION_HINT } from "@/lib/renewal-grade-display"

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  address: string
  birthDate: string
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
}

interface YearlyHistoryOverview {
  totalStudents: number
  renewedCount: number
  notRenewedCount: number
  newRegistrationCount: number
  notNewRegistrationCount: number
  notRenewedStudents: Array<{
    id: string
    firstName: string
    lastName: string
    tcNumber: string
    grade: string
  }>
}

const siniflar = [
  "5. Sınıf",
  "6. Sınıf",
  "7. Sınıf",
  "8. Sınıf",
  "9. Sınıf",
  "10. Sınıf",
  "11. Sınıf",
  "12. Sınıf",
]

export default function RenewalPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [hasExistingRenewal, setHasExistingRenewal] = useState(false)
  const [existingRenewalInfo, setExistingRenewalInfo] = useState<string>("")
  const [renewalTarget, setRenewalTarget] = useState<{
    id: string
    name: string
    label: string
  } | null>(null)
  const [renewalSetupMessage, setRenewalSetupMessage] = useState<string | null>(null)
  const [renewalYearLoading, setRenewalYearLoading] = useState(true)
  
  // İstatistikler
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    sinifStats: {} as Record<string, number>,
    sinifBreakdown: {} as Record<
      string,
      { renewed: number; total: number; percent: number }
    >,
    academicYearStats: {} as Record<string, number>,
  })
  const [historyYearOptions, setHistoryYearOptions] = useState<string[]>([])
  const [selectedHistoryYear, setSelectedHistoryYear] = useState("")
  const [yearlyHistoryLoading, setYearlyHistoryLoading] = useState(false)
  const [yearlyHistory, setYearlyHistory] = useState<YearlyHistoryOverview | null>(null)

  // Ana Sözleşme Form Verileri
  const [mainContractData, setMainContractData] = useState({
    // Öğrenci ve Sözleşme Bilgileri
    studentName: "",
    studentClass: "",
    studentTC: "",
    studentBirthDate: "",
    schoolLicenseNo: "",
    contractNo: "",
    registrationResponsible: "",
    registrationDate: new Date().toISOString().split("T")[0],
    
    // Sözleşme Metni
    contractStudentName: "",
    contractParentName: "",
    
    // Ödeme Bilgileri - Kurumun İlan Ettiği Ücretler
    announcedTuitionFee: "",
    announcedClothingFee: "",
    announcedCourseFee: "",
    announcedStudyHallFee: "",
    announcedTotal: "",
    
    // Ödeme Bilgileri - Öğrenci İçin Belirlenen Ücretler
    studentTuitionFee: "",
    studentClothingFee: "",
    studentCourseFee: "",
    studentStudyHallFee: "",
    studentTotal: "",
    
    // Ödeme Planı ve Muacceliyet
    academicYear: "",
    paymentPlan: "",
    paymentDueDate: "",
    
    // İmza ve Tarih
    parentSignature: "",
    contractDate: "",
    registrarName: "",
    registrarSignature: "",
    
    // Servis Bilgileri
  })

  // Diğer Sözleşme Form Verileri
  const [otherContractData, setOtherContractData] = useState({
    // Kitap ve Forma Sözleşmesi
    uniformSize: "",
    uniformPrice: "",
    uniformDeliveryDate: "",
    uniformItems: [] as string[],
    paymentReceived: false,
    paymentNotReceived: false,
  })

  // Sınıf bazlı kitap ve forma ücret tablosu (TL)
  const bookAndUniformPrices: Record<string, Record<string, number>> = {
    "5. Sınıf": {
      "Şubat": 51348,
      "Mart": 52883,
      "Nisan": 54464,
      "Mayıs": 56093,
      "Haziran": 57770,
      "Temmuz": 59497,
      "Ağustos": 61276,
      "Eylül": 63108,
    },
    "6. Sınıf": {
      "Şubat": 48396,
      "Mart": 49843,
      "Nisan": 51333,
      "Mayıs": 52868,
      "Haziran": 54448,
      "Temmuz": 56076,
      "Ağustos": 57753,
      "Eylül": 59480,
    },
    "7. Sınıf": {
      "Şubat": 48396,
      "Mart": 49843,
      "Nisan": 51333,
      "Mayıs": 52868,
      "Haziran": 54448,
      "Temmuz": 56076,
      "Ağustos": 57753,
      "Eylül": 59480,
    },
    "8. Sınıf": {
      "Şubat": 48396,
      "Mart": 49843,
      "Nisan": 51333,
      "Mayıs": 52868,
      "Haziran": 54448,
      "Temmuz": 56076,
      "Ağustos": 57753,
      "Eylül": 59480,
    },
    "9. Sınıf": {
      "Şubat": 48444,
      "Mart": 49892,
      "Nisan": 51384,
      "Mayıs": 52920,
      "Haziran": 54502,
      "Temmuz": 56132,
      "Ağustos": 57810,
      "Eylül": 59539,
    },
    "10. Sınıf": {
      "Şubat": 45492,
      "Mart": 46852,
      "Nisan": 48253,
      "Mayıs": 49695,
      "Haziran": 51181,
      "Temmuz": 52712,
      "Ağustos": 54288,
      "Eylül": 55911,
    },
    "11. Sınıf": {
      "Şubat": 45492,
      "Mart": 46852,
      "Nisan": 48253,
      "Mayıs": 49695,
      "Haziran": 51181,
      "Temmuz": 52712,
      "Ağustos": 54288,
      "Eylül": 55911,
    },
    "12. Sınıf": {
      "Şubat": 48660,
      "Mart": 50114,
      "Nisan": 51613,
      "Mayıs": 53156,
      "Haziran": 54745,
      "Temmuz": 56382,
      "Ağustos": 58068,
      "Eylül": 59805,
    },
  }

  // Öğrencinin sınıfına göre fiyat tablosunu al
  const getPriceTableForGrade = () => {
    let grade = mainContractData.studentClass
    if (!grade && selectedStudent) {
      // Sınıf formatını "X. Sınıf" formatına çevir
      const studentGrade = selectedStudent.grade || ""
      if (studentGrade.includes("Sınıf")) {
        grade = studentGrade
      } else {
        const gradeNum = parseInt(studentGrade.replace(/\D/g, ''))
        if (!isNaN(gradeNum) && gradeNum >= 5 && gradeNum <= 12) {
          grade = `${gradeNum}. Sınıf`
        }
      }
    }
    if (!grade) return null
    return bookAndUniformPrices[grade] || null
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return ""
    try {
      // Eğer DD.MM.YYYY formatındaysa ISO formatına çevir
      if (typeof date === "string" && date.includes('.') && date.length === 10) {
        const parts = date.split('.')
        if (parts.length === 3) {
          const [day, month, year] = parts
          return `${year}-${month}-${day}`
        }
      }
      const parsed = new Date(date)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0]
      }
      const stringDate = typeof date === "string" ? date : ""
      return stringDate.includes("T") ? stringDate.split("T")[0] : stringDate
    } catch {
      const stringDate = typeof date === "string" ? date : ""
      return stringDate.includes("T") ? stringDate.split("T")[0] : stringDate
    }
  }

  // ISO formatından DD.MM.YYYY formatına çevir (görüntüleme için)
  const formatDateForDisplay = (date: string | Date | null | undefined) => {
    if (!date) return ""
    try {
      // Eğer zaten DD.MM.YYYY formatındaysa olduğu gibi döndür
      if (typeof date === "string" && date.includes('.') && date.length === 10) {
        return date
      }
      // ISO formatından (YYYY-MM-DD) DD.MM.YYYY'ye çevir
      if (typeof date === "string" && date.includes('-') && date.length === 10) {
        const parts = date.split('-')
        if (parts.length === 3) {
          return `${parts[2]}.${parts[1]}.${parts[0]}`
        }
      }
      const parsed = new Date(date)
      if (!isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0')
        const month = String(parsed.getMonth() + 1).padStart(2, '0')
        const year = parsed.getFullYear()
        return `${day}.${month}.${year}`
      }
      return String(date)
    } catch {
      return String(date || "")
    }
  }

  const fetchStudents = useCallback(async () => {
    try {
      // Kayıt yenileme ekranında listelenen öğrenciler (API varsayılanı: 5–12. sınıf)
      // pagination'ı yüksek bir limit ile kullanıyoruz.
      const response = await fetch("/api/students?limit=1000")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (Array.isArray(data)) {
        setStudents(data as Student[])
      } else if (data.students) {
        setStudents(data.students as Student[])
      } else {
        setStudents([])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    }
  }, [])


  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/renewals/stats`)
      if (response.ok) {
        const data = await response.json()
        // API response formatını kontrol et ve state'e set et
        if (data && typeof data === 'object') {
          setStats({
            total: data.total || 0,
            today: data.today || 0,
            thisWeek: data.thisWeek || 0,
            thisMonth: data.thisMonth || 0,
            sinifStats: data.sinifStats || {},
            sinifBreakdown: data.sinifBreakdown || {},
            academicYearStats: data.academicYearStats || {}
          })
        } else {
          console.error("[Renewal] Invalid stats data format:", data)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("[Renewal] Stats API error:", response.status, errorData)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setRenewalYearLoading(true)
      try {
        const res = await fetch("/api/neredeyiz/academic-years?forContracts=1")
        if (!res.ok) throw new Error("academic-years")
        const data = (await res.json()) as AcademicYearListItem[]
        if (cancelled) return
        const rows = Array.isArray(data) ? data : []
        const yearLabels = rows.map((r) => contractYearLabelFromAcademicYear(r))
        setHistoryYearOptions(yearLabels)
        const t = getRenewalTargetYearFromList(rows)
        setRenewalTarget(t)
        if (t) {
          setRenewalSetupMessage(null)
        } else {
          const issue = getRenewalYearSetupIssue(rows)
          setRenewalSetupMessage(
            issue ? renewalSetupErrorMessage(issue, rows) : "Akademik yıl ayarları kayıt yenileme için uygun değil."
          )
        }
      } catch {
        if (!cancelled) {
          setRenewalTarget(null)
          setRenewalSetupMessage("Akademik yıllar yüklenemedi. Sayfayı yenileyin veya Ayarlar → Akademik Yıllar bölümünü kontrol edin.")
        }
      } finally {
        if (!cancelled) setRenewalYearLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchYearlyHistory = useCallback(async (academicYear: string) => {
    if (!academicYear) {
      setYearlyHistory(null)
      return
    }
    setYearlyHistoryLoading(true)
    try {
      const res = await fetch(
        `/api/registration-history/yearly?academicYear=${encodeURIComponent(academicYear)}`
      )
      if (!res.ok) throw new Error("yearly-history")
      const data = (await res.json()) as YearlyHistoryOverview
      setYearlyHistory(data)
    } catch (error) {
      console.error("Error fetching yearly renewal history:", error)
      setYearlyHistory(null)
    } finally {
      setYearlyHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!renewalTarget) return
    setMainContractData((prev) => ({ ...prev, academicYear: renewalTarget.label }))
  }, [renewalTarget])

  // Registration date ve payment due date'i otomatik ayarla
  useEffect(() => {
    if (mainContractData.registrationDate && !mainContractData.paymentDueDate) {
      const regDate = new Date(mainContractData.registrationDate)
      const dueDate = new Date(regDate)
      dueDate.setDate(dueDate.getDate() + 15)
      setMainContractData(prev => ({
        ...prev,
        paymentDueDate: dueDate.toISOString().split("T")[0]
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainContractData.registrationDate])

  useEffect(() => {
    fetchStudents()
    fetchStats()
  }, [fetchStudents, fetchStats])

  useEffect(() => {
    const mergedOptions = [
      ...new Set([
        ...historyYearOptions,
        ...Object.keys(stats.academicYearStats || {}),
        renewalTarget?.label || "",
      ].filter(Boolean)),
    ]
    if (!selectedHistoryYear && mergedOptions.length > 0) {
      setSelectedHistoryYear(renewalTarget?.label || mergedOptions[0] || "")
    }
  }, [historyYearOptions, renewalTarget, selectedHistoryYear, stats.academicYearStats])

  useEffect(() => {
    if (!selectedHistoryYear) return
    fetchYearlyHistory(selectedHistoryYear)
  }, [selectedHistoryYear, fetchYearlyHistory])

  // Sözleşme numarasını otomatik oluştur
  const generateContractNumber = async (date: string) => {
    if (!date) return ""
    
    // Tarihi DDMMYYYY formatına çevir
    const dateObj = new Date(date)
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    const datePrefix = `${day}${month}${year}`
    
    try {
      // O tarihte kaç sözleşme (new-registration + renewal) yapıldığını say
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const [newRegRes, renewalRes] = await Promise.all([
        fetch(`/api/new-registrations/stats?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`),
        fetch(`/api/renewals/stats?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`)
      ])
      
      const newRegData = newRegRes.ok ? await newRegRes.json() : { total: 0 }
      const renewalData = renewalRes.ok ? await renewalRes.json() : { total: 0 }
      
      const totalContracts = (newRegData.total || 0) + (renewalData.total || 0)
      const sequenceNumber = totalContracts + 1
      
      return `${datePrefix}-${sequenceNumber}`
    } catch (error) {
      console.error("Error generating contract number:", error)
      // Hata durumunda sadece tarih + 1 döndür
      return `${datePrefix}-1`
    }
  }

  // Kullanıcı adını, tarihi ve sözleşme numarasını otomatik doldur (sadece bir kez)
  useEffect(() => {
    const staffName = localStorage.getItem("staff_name")
    const today = new Date().toISOString().split("T")[0]
    
    const updateData = async () => {
      if (staffName) {
        const formattedStaffName = formatPersonName(staffName)
        setMainContractData(prev => ({
          ...prev,
          registrationResponsible: prev.registrationResponsible || formattedStaffName,
          registrarName: prev.registrarName || formattedStaffName,
          contractDate: prev.contractDate || today,
          registrationDate: prev.registrationDate || today
        }))
      } else {
        setMainContractData(prev => ({
          ...prev,
          contractDate: prev.contractDate || today,
          registrationDate: prev.registrationDate || today
        }))
      }
      
      // Sözleşme numarasını oluştur
      const contractNo = await generateContractNumber(today)
      if (contractNo) {
        setMainContractData(prev => ({
          ...prev,
          contractNo
        }))
      }
    }
    
    updateData()
  }, [])

  // Öğrenci seçildiğinde öğrenim ücreti bilgilerini otomatik doldur
  useEffect(() => {
    if (selectedStudent) {
      // Öğrencinin güncel bilgilerini çek (öğrenim ücreti dahil)
      fetch(`/api/students/${selectedStudent.id}?format=legacy`)
        .then(res => res.json())
        .then((student: Student) => {
          if (student.announcedTuitionFee || student.studentTuitionFee) {
            setMainContractData(prev => ({
              ...prev,
              announcedTuitionFee: student.announcedTuitionFee || prev.announcedTuitionFee,
              studentTuitionFee: student.studentTuitionFee || prev.studentTuitionFee
            }))
          }
        })
        .catch(err => {
          console.error("Error fetching student details:", err)
        })
    }
  }, [selectedStudent?.id]) // eslint-disable-line react-hooks/exhaustive-deps


  const handleDownloadCombinedPDF = async () => {
    if (!selectedStudent) {
      alert("⚠️ Lütfen önce bir öğrenci seçin!")
      return
    }

    if (!renewalTarget) {
      alert(
        `⚠️ ${renewalSetupMessage ?? "Kayıt yenileme için akademik yıl ayarları eksik veya uyumsuz."}\n\nAna menüden Ayarlar → Akademik Yıllar sekmesine gidin.`
      )
      return
    }

    // Mevcut kayıt yenileme kontrolü
    if (hasExistingRenewal) {
      alert(`⚠️ ${existingRenewalInfo}\n\nBu öğrenci için seçilen akademik yılda zaten kayıt yenileme yapılmış. Tekrar kayıt yenileme yapılamaz!`)
      return
    }

    const renewalClass = renewalTargetClassLabel(selectedStudent.grade)
    if (!renewalClass) {
      alert(
        "⚠️ Öğrencinin sınıfı kayıt yenileme için uygun değil (5–12. sınıf olmalıdır)."
      )
      return
    }

    const contractPayload = {
      ...mainContractData,
      academicYear: renewalTarget.label,
      studentClass: renewalClass,
    }
    const contractErrors = validateContractFields(contractPayload)
    const uniformErrors = validateUniformFields(otherContractData)
    const allErrors = [...contractErrors, ...uniformErrors]
    if (allErrors.length > 0) {
      alert(formatValidationAlert(allErrors))
      return
    }

    try {
      // Hedef sınıf (studentClass) sözleşmede kaydedilir; öğrencinin aktif sınıf düzeyi değişmez.
      const contracts = [
        {
          type: "renewal",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              ...mainContractData,
              academicYear: renewalTarget.label,
              academicYearId: renewalTarget.id,
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              studentTC: selectedStudent.tcNumber,
              studentClass: renewalClass,
              studentBirthDate: formatDate(selectedStudent.birthDate),
              contractStudentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              contractParentName: ""
            },
          }
        },
        {
          type: "uniform",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              tcNumber: selectedStudent.tcNumber,
              uniformSize: otherContractData.uniformSize,
              uniformPrice: otherContractData.uniformPrice,
              deliveryDate: otherContractData.uniformDeliveryDate,
              uniformItems: otherContractData.uniformItems,
              paymentReceived: otherContractData.paymentReceived,
              paymentNotReceived: otherContractData.paymentNotReceived,
              studentClass: renewalClass,
            }
          }
        },
      ]

      // Tüm sözleşmeleri kaydet
      const responses = await Promise.all(
        contracts.map(contract => {
          const endpoint = contract.type === "renewal" 
            ? "/api/renewals" 
            : `/api/${contract.type}-contracts`
          
          const requestBody = contract.type === "renewal" 
            ? contract.data
            : contract.data
          
          return fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          })
        })
      )

      const allSuccessful = responses.every(response => response.ok)

      if (!allSuccessful) {
        const errorResponses = responses.filter(r => !r.ok)
        const errorMessages = await Promise.all(
          errorResponses.map(async (r) => {
            const errorData = await r.json().catch(() => ({}))
            return errorData.error || "Bilinmeyen hata"
          })
        )
        alert(`⚠️ Sözleşmeler kaydedilirken hata oluştu!\n\n${errorMessages.join("\n")}`)
        return
      }

      // Ana sözleşme (renewal) ID'sini al
      const mainContractResponse = await responses[0].json()
      const contractId = mainContractResponse.id || mainContractResponse.renewal?.id

      if (!contractId) {
        alert("⚠️ Sözleşme ID'si alınamadı!")
        return
      }

      // PDF'i indir
      const response = await fetch(`/api/pdf/combined/${contractId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractTypes: [
            "renewal",
            "uniform",
          ],
          mainContractData: { ...mainContractData, studentClass: renewalClass },
          otherContractData: otherContractData
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `tum-sozlesmeler-${selectedStudent.firstName}-${selectedStudent.lastName}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        alert(`✅ Kayıt yenileme başarıyla tamamlandı!\n\n` +
          `Öğrenci: ${selectedStudent.firstName} ${selectedStudent.lastName}\n` +
          `TC: ${selectedStudent.tcNumber}\n\n` +
          `✓ Sözleşmeler kaydedildi\n` +
          `✓ PDF dosyası indirildi.`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`⚠️ PDF oluşturulurken hata oluştu!\n\n${errorData.error || errorData.details || "Bilinmeyen hata"}`)
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("PDF indirilirken hata oluştu!")
    }
  }

  // Filtrelenmiş öğrenci listesi (ad-soyad ile arama)
  const filteredStudents = students.filter(student => {
    if (!studentSearchTerm.trim()) return false
    const search = studentSearchTerm.toLowerCase().trim()
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase()
    return fullName.includes(search) || 
           student.firstName.toLowerCase().includes(search) || 
           student.lastName.toLowerCase().includes(search)
  })

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudent(student)
    setStudentSearchTerm("") // Arama terimini temizle
    setHasExistingRenewal(false)
    setExistingRenewalInfo("")
    
    const formattedBirthDate = formatDate(student.birthDate)
    const nextClass = renewalTargetClassLabel(student.grade) ?? ""
    const fullName = formatPersonName(`${student.firstName} ${student.lastName}`)
    setMainContractData(prev => ({
      ...prev,
      studentName: fullName,
      studentTC: formatTcInput(student.tcNumber || ""),
      studentClass: nextClass,
      studentBirthDate: formattedBirthDate, // ISO formatında sakla (YYYY-MM-DD)
      contractStudentName: fullName,
      contractParentName: ""
    }))
    
    // Öğrencinin detaylarını çek (öğrenim ücreti dahil)
    try {
      const response = await fetch(`/api/students/${student.id}?format=legacy`)
      if (response.ok) {
        const studentDetails: Student = await response.json()
        const refreshedClass = renewalTargetClassLabel(studentDetails.grade)
        if (
          studentDetails.announcedTuitionFee ||
          studentDetails.studentTuitionFee ||
          refreshedClass
        ) {
          setMainContractData(prev => ({
            ...prev,
            announcedTuitionFee:
              studentDetails.announcedTuitionFee || prev.announcedTuitionFee,
            studentTuitionFee:
              studentDetails.studentTuitionFee || prev.studentTuitionFee,
            ...(refreshedClass ? { studentClass: refreshedClass } : {}),
          }))
        }
      }
    } catch (err) {
      console.error("Error fetching student details:", err)
    }
  }

  const handleSelectFromHistory = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}?format=legacy`)
      if (!response.ok) throw new Error("student-not-found")
      const studentDetails = (await response.json()) as Student
      await handleStudentSelect(studentDetails)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("Error selecting student from history:", error)
      alert("Öğrenci bilgileri yüklenemedi.")
    }
  }

  // Akademik yıl değiştiğinde veya öğrenci seçildiğinde mevcut kayıt yenilemeyi kontrol et
  useEffect(() => {
    const checkExistingRenewal = async () => {
      if (!selectedStudent || !mainContractData.academicYear) {
        setHasExistingRenewal(false)
        setExistingRenewalInfo("")
        return
      }

      try {
        const response = await fetch(`/api/renewals?studentId=${selectedStudent.id}&academicYear=${encodeURIComponent(mainContractData.academicYear)}`)
        if (response.ok) {
          const renewals = await response.json()
          if (Array.isArray(renewals) && renewals.length > 0) {
            setHasExistingRenewal(true)
            const renewal = renewals[0]
            const createdAt = new Date(renewal.createdAt).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
            setExistingRenewalInfo(`Bu öğrenci için ${mainContractData.academicYear} akademik yılında zaten kayıt yenileme yapılmış. (Tarih: ${createdAt})`)
          } else {
            setHasExistingRenewal(false)
            setExistingRenewalInfo("")
          }
        }
      } catch (err) {
        console.error("Error checking existing renewal:", err)
        setHasExistingRenewal(false)
        setExistingRenewalInfo("")
      }
    }

    checkExistingRenewal()
  }, [selectedStudent, mainContractData.academicYear])

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kayıt Yenileme Sözleşmesi</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Öğrenci kayıt yenileme sözleşmesini oluşturun</p>
          </div>
          <Button
            onClick={() => router.push('/renewal/list')}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            <List className="h-4 w-4 mr-2" />
            Kayıtları Görüntüle
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1 truncate">Toplam Kayıt</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-blue-200 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-emerald-600 text-white">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-green-100 text-xs sm:text-sm font-medium mb-1 truncate">Bugün</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.today}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-green-200 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-600 to-amber-600 text-white">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-orange-100 text-xs sm:text-sm font-medium mb-1 truncate">Bu Hafta</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.thisWeek}</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-orange-200 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-purple-100 text-xs sm:text-sm font-medium mb-1 truncate">Bu Ay</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.thisMonth}</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-purple-200 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sınıf Bazında İstatistikler */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Sınıf Bazında Kayıtlar (mevcut sınıfa göre)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RenewalGradeExplainer compact className="mb-3" />
            <p className="text-xs text-gray-500 mb-3">{RENEWAL_STATS_FRACTION_HINT}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
              {siniflar.map((sinif) => {
                const b = stats.sinifBreakdown[sinif]
                const renewed = b?.renewed ?? stats.sinifStats[sinif] ?? 0
                const total = b?.total ?? 0
                const pct = b?.percent ?? 0
                return (
                  <div
                    key={sinif}
                    className="p-2 sm:p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <p className="text-xs text-gray-600 mb-1 truncate">{sinif}</p>
                    <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 tabular-nums">
                      {renewed}/{total}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500 tabular-nums">%{pct}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Akademik Yıl Geçmişi (Kayıt Yenileme)</CardTitle>
            <CardDescription>
              Geçmiş yıllara göre yenileyen/yenilemeyen öğrencileri inceleyin, isterseniz öğrenciyi doğrudan forma aktarın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md">
              <Label htmlFor="historyAcademicYear">Akademik Yıl Seçimi</Label>
              <select
                id="historyAcademicYear"
                value={selectedHistoryYear}
                onChange={(e) => setSelectedHistoryYear(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Yıl seçiniz</option>
                {[...new Set([...historyYearOptions, ...Object.keys(stats.academicYearStats || {})])]
                  .filter(Boolean)
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </div>

            {yearlyHistoryLoading ? (
              <p className="text-sm text-gray-500">Yıl verileri yükleniyor...</p>
            ) : yearlyHistory ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">Toplam Öğrenci</p>
                    <p className="text-xl font-semibold">{yearlyHistory.totalStudents}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-green-50">
                    <p className="text-xs text-gray-500">Kayıt Yenileyen</p>
                    <p className="text-xl font-semibold text-green-700">{yearlyHistory.renewedCount}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-amber-50">
                    <p className="text-xs text-gray-500">Kayıt Yenilemeyen</p>
                    <p className="text-xl font-semibold text-amber-700">{yearlyHistory.notRenewedCount}</p>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <p className="text-sm font-medium">Kayıt Yenilemeyen Öğrenciler</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y">
                    {yearlyHistory.notRenewedStudents.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">Bu yıl için yenilemeyen öğrenci bulunamadı.</p>
                    ) : (
                      yearlyHistory.notRenewedStudents.slice(0, 100).map((student) => (
                        <div key={student.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {student.grade} • {student.tcNumber}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectFromHistory(student.id)}
                          >
                            Yenileme Başlat
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Seçilen yıl için veri bulunamadı.</p>
            )}
          </CardContent>
        </Card>

        {/* Öğrenci Seçimi */}
        <Card>
          <CardHeader>
            <CardTitle>Öğrenci Seçimi</CardTitle>
            <CardDescription>Kayıt yenileme yapılacak öğrenciyi seçin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Label htmlFor="studentSearch">Öğrenci Ara (Ad Soyad) *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="studentSearch"
                  type="text"
                  placeholder="Öğrenci adı veya soyadı ile ara..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-900 transition-all duration-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
                />
              </div>
              {studentSearchTerm && filteredStudents.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStudents.slice(0, 10).map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleStudentSelect(student)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      {student.firstName} {student.lastName} - {student.grade} ({student.tcNumber})
                    </button>
                  ))}
                </div>
              )}
              {studentSearchTerm && filteredStudents.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Arama kriterinize uygun öğrenci bulunamadı.
                </p>
              )}
              {!studentSearchTerm && (
                <p className="text-sm text-gray-500 mt-1">
                  Öğrenci adı veya soyadı ile arama yapın.
                </p>
              )}
            </div>

            {selectedStudent && (
              <div className={`p-4 rounded ${hasExistingRenewal ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50'}`}>
                <h3 className="font-medium mb-2">Seçilen Öğrenci Bilgileri</h3>
                {hasExistingRenewal && (
                  <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded text-red-800">
                    <p className="font-semibold">⚠️ Uyarı!</p>
                    <p className="text-sm">{existingRenewalInfo}</p>
                    <p className="text-sm mt-1">Bu öğrenci için seçilen akademik yılda kayıt yenileme yapılamaz.</p>
                  </div>
                )}
                <p><strong>Ad Soyad:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p><strong>TC Kimlik No:</strong> {selectedStudent.tcNumber}</p>
                <p><strong>Mevcut sınıf (bu yıl):</strong> {selectedStudent.grade}</p>
                {mainContractData.studentClass && (
                  <p><strong>Hedef sınıf (yenileme):</strong> {mainContractData.studentClass}</p>
                )}
                <p><strong>Adres:</strong> {selectedStudent.address}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <h4 className="font-medium">Öğrenci Anne Bilgileri</h4>
                    <p className="text-sm text-gray-600">{selectedStudent.motherName} • TC: {selectedStudent.motherTc}</p>
                    <p className="text-sm text-gray-600">Tel: {selectedStudent.motherPhone}</p>
                    <p className="text-sm text-gray-600">Adres: {selectedStudent.motherAddress}</p>
                    <p className="text-sm text-gray-600">Meslek: {selectedStudent.motherOccupation}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Öğrenci Baba Bilgileri</h4>
                    <p className="text-sm text-gray-600">{selectedStudent.fatherName} • TC: {selectedStudent.fatherTc}</p>
                    <p className="text-sm text-gray-600">Tel: {selectedStudent.fatherPhone}</p>
                    <p className="text-sm text-gray-600">Adres: {selectedStudent.fatherAddress}</p>
                    <p className="text-sm text-gray-600">Meslek: {selectedStudent.fatherOccupation}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedStudent && (
          <>
            {/* Ana Sözleşme Formu */}
            <Card className={hasExistingRenewal ? 'opacity-60 pointer-events-none' : ''}>
              <CardHeader>
                <CardTitle className="text-blue-600">EĞİTİM ÖĞRETİM HİZMET SÖZLEŞMESİ</CardTitle>
                <CardDescription>Ana sözleşme formu - Öğrenci ve ödeme bilgileri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Öğrenci ve Sözleşme Bilgileri */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="studentName">Öğrenci Adı *</Label>
                      <Input
                        id="studentName"
                        value={mainContractData.studentName}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentName: formatPersonName(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor="studentClass">Kayıt yenileme hedef sınıfı *</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mevcut kayıtlı sınıf:{" "}
                        <span className="font-medium text-foreground">
                          {selectedStudent.grade?.trim() || "—"}
                        </span>
                        . Hedef, bir üst düzeydir (12. sınıfta hedef yine 12. sınıftır); kullanıcı
                        değiştiremez.
                      </p>
                      <Input
                        id="studentClass"
                        readOnly
                        tabIndex={-1}
                        value={mainContractData.studentClass || "—"}
                        className="mt-1.5 bg-muted/60 cursor-default"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentTC">TC *</Label>
                      <Input
                        id="studentTC"
                        value={mainContractData.studentTC}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentTC: formatTcInput(e.target.value) })}
                        maxLength={11}
                        inputMode="numeric"
                        placeholder="11 haneli TC"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentBirthDate">Doğum Tarihi * (GG.AA.YYYY)</Label>
                      <Input
                        id="studentBirthDate"
                        type="text"
                        value={formatDateForDisplay(mainContractData.studentBirthDate)}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '') // Sadece rakamları al
                          // Maksimum 8 rakam (DDMMYYYY)
                          if (value.length > 8) value = value.slice(0, 8)
                          
                          // Formatla: DD.MM.YYYY
                          let formatted = value
                          if (value.length > 2) {
                            formatted = value.slice(0, 2) + '.' + value.slice(2)
                          }
                          if (value.length > 4) {
                            formatted = value.slice(0, 2) + '.' + value.slice(2, 4) + '.' + value.slice(4)
                          }
                          
                          // ISO formatına çevir (YYYY-MM-DD) - backend için
                          let isoDate = formatted
                          if (value.length === 8) {
                            const day = value.slice(0, 2)
                            const month = value.slice(2, 4)
                            const year = value.slice(4, 8)
                            isoDate = `${year}-${month}-${day}`
                          }
                          
                          setMainContractData({ ...mainContractData, studentBirthDate: isoDate })
                        }}
                        placeholder="GG.AA.YYYY (örn: 12.07.2016)"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <Label>Okul Ruhsat No *</Label>
                      <div className="flex gap-2 mt-1">
                        <Button
                          type="button"
                          variant={mainContractData.schoolLicenseNo === "574450" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMainContractData({ ...mainContractData, schoolLicenseNo: "574450" })}
                        >
                          Anadolu Lisesi
                        </Button>
                        <Button
                          type="button"
                          variant={mainContractData.schoolLicenseNo === "574451" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMainContractData({ ...mainContractData, schoolLicenseNo: "574451" })}
                        >
                          Fen Lisesi
                        </Button>
                        <Button
                          type="button"
                          variant={mainContractData.schoolLicenseNo === "574449" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMainContractData({ ...mainContractData, schoolLicenseNo: "574449" })}
                        >
                          Ortaokul
                        </Button>
                      </div>
                      {mainContractData.schoolLicenseNo && (
                        <div className="mt-2 text-sm text-gray-600">
                          Seçilen Ruhsat No: <span className="font-semibold">{mainContractData.schoolLicenseNo}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="contractNo">Sözleşme No *</Label>
                      <Input
                        id="contractNo"
                        value={mainContractData.contractNo}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationResponsible">Kayıt/Kayıt Yenileme Sorumlusu *</Label>
                      <Input
                        id="registrationResponsible"
                        value={mainContractData.registrationResponsible}
                        onChange={(e) => setMainContractData(prev => ({ ...prev, registrationResponsible: formatPersonName(e.target.value) }))}
                        placeholder="Kayıt sorumlusunun adı soyadı"
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationDate">Kayıt/Kayıt Yenileme Tarihi *</Label>
                      <Input
                        id="registrationDate"
                        type="date"
                        value={mainContractData.registrationDate}
                        onChange={(e) => setMainContractData({ ...mainContractData, registrationDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Ödeme Bilgileri */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                      <div className="flex flex-col gap-2 flex-1 min-w-[240px]">
                        <h3 className="text-lg font-semibold">ÖDEME BİLGİLERİ — Öğretim yılı</h3>
                        <p className="text-xs text-gray-600">
                          Kayıt yenileme <strong>yalnızca Ayarlar’da açık olan kayıt yenileme dönemi</strong> ile
                          yapılır; aktif öğretim yılından otomatik kaymaz. Sözleşme etiketi ve kimliği açık
                          döneme aittir.
                        </p>
                        {renewalYearLoading ? (
                          <p className="text-sm text-gray-500">Kayıt yenileme dönemi yükleniyor…</p>
                        ) : renewalTarget ? (
                          <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm">
                            <p className="font-semibold text-indigo-900">Açık kayıt yenileme dönemi</p>
                            <p className="text-indigo-800 mt-1">
                              {renewalTarget.name}{" "}
                              <span className="text-indigo-600">({renewalTarget.label})</span>
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 space-y-3">
                            <p className="leading-relaxed">
                              {renewalSetupMessage ??
                                "Kayıt yenileme dönemi açık değil. Ayarlar’dan «Kayıt Yenileme Dönemi» switch’ini açın."}
                            </p>
                            <Link
                              href="/yonetim/ayarlar"
                              className="inline-flex h-9 items-center justify-center rounded-md border border-amber-300 bg-background px-3 text-sm font-medium shadow-sm hover:bg-amber-100/60"
                            >
                              Ayarlar — Kayıt Yenileme Dönemi
                            </Link>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const announced = [
                            parseFloat(mainContractData.announcedTuitionFee) || 0,
                            parseFloat(mainContractData.announcedClothingFee) || 0,
                            parseFloat(mainContractData.announcedCourseFee) || 0,
                            parseFloat(mainContractData.announcedStudyHallFee) || 0
                          ]
                          const student = [
                            parseFloat(mainContractData.studentTuitionFee) || 0,
                            parseFloat(mainContractData.studentClothingFee) || 0,
                            parseFloat(mainContractData.studentCourseFee) || 0,
                            parseFloat(mainContractData.studentStudyHallFee) || 0
                          ]
                          const announcedTotal = announced.reduce((a, b) => a + b, 0)
                          const studentTotal = student.reduce((a, b) => a + b, 0)
                          setMainContractData({
                            ...mainContractData,
                            announcedTotal: announcedTotal.toString(),
                            studentTotal: studentTotal.toString()
                          })
                        }}
                        className="text-xs"
                      >
                        Toplamı Hesapla
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="font-semibold">Ücret Türü</div>
                      <div className="font-semibold text-center">Meb&apos;in Belirlediği Ücret (KDV Dahil)</div>
                      <div className="font-semibold text-center">Öğrenci Ücreti (KDV Dahil)</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>Öğrenim Ücreti *</div>
                      <Input
                        value={mainContractData.announcedTuitionFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, announcedTuitionFee: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        value={mainContractData.studentTuitionFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentTuitionFee: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>KIYAFET ÜCRETİ *</div>
                      <Input
                        value={mainContractData.announcedClothingFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, announcedClothingFee: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        value={mainContractData.studentClothingFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentClothingFee: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="pl-4">Takviye Kursu Ücreti *</div>
                      <Input
                        value={mainContractData.announcedCourseFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, announcedCourseFee: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        value={mainContractData.studentCourseFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentCourseFee: e.target.value })}
                        placeholder="0"
                      />
                    </div>


                    <div className="grid grid-cols-3 gap-4">
                      <div className="pl-4">Etüt Ücreti *</div>
                      <Input
                        value={mainContractData.announcedStudyHallFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, announcedStudyHallFee: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        value={mainContractData.studentStudyHallFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentStudyHallFee: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 font-semibold">
                      <div>ÜCRETLER TOPLAMI *</div>
                      <Input
                        value={mainContractData.announcedTotal}
                        onChange={(e) => setMainContractData({ ...mainContractData, announcedTotal: e.target.value })}
                        placeholder="0"
                        className="font-semibold"
                      />
                      <Input
                        value={mainContractData.studentTotal}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentTotal: e.target.value })}
                        placeholder="0"
                        className="font-semibold"
                      />
                    </div>
                  </div>

                  {/* Borç Muacceliyet Tarihi */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Borç Muacceliyet Tarihi</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="registrationDateMuacceliyetRenewal">Kayıt İşleminin Gerçekleştirildiği Tarih</Label>
                        <Input
                          id="registrationDateMuacceliyetRenewal"
                          type="date"
                          value={mainContractData.registrationDate}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <Label htmlFor="paymentDueDate">Ödemenin Yapılması Gereken Son Tarih</Label>
                        <Input
                          id="paymentDueDate"
                          type="date"
                          value={(() => {
                            if (mainContractData.registrationDate) {
                              const regDate = new Date(mainContractData.registrationDate)
                              const dueDate = new Date(regDate)
                              dueDate.setDate(dueDate.getDate() + 15)
                              return dueDate.toISOString().split("T")[0]
                            }
                            return ""
                          })()}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-yellow-900">
                        MUACCELİYET TARİHİ SONRASI AYLIK GECİKME ZAMMI ORANI % 3,02 OLARAK UYGULANACAKTIR.
                      </p>
                    </div>
                  </div>

                  {/* Ödeme Planı */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Ödeme Planı *</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        "İŞBANK KREDİ KARTI 2+4 TAKSİT",
                        "ZİRAATBANK KREDİ KARTI 2+8 TAKSİT",
                        "YAPIKREDİ KREDİ KARTI 3 TAKSİT",
                        "AKBANK KREDİ KARTI 2 + 4 TAKSİT",
                        "BONUS KREDİ KARTI 2 TAKSİT",
                        "DİĞER KREDİ KARTLARI 2 TAKSİT",
                        "İŞBANKASI OTS 3 TAKSİT",
                        "VAKIFBANK OTS 3 TAKSİT",
                        "AKBANK OTS 3 TAKSİT",
                        "ZİRAAT OTS 4 TAKSİT"
                      ].map((plan) => (
                        <label key={plan} className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="paymentPlan"
                            value={plan}
                            checked={mainContractData.paymentPlan === plan}
                            onChange={(e) => setMainContractData({ ...mainContractData, paymentPlan: e.target.value })}
                            className="w-4 h-4 flex-shrink-0"
                          />
                          <span className="text-xs">{plan}</span>
                        </label>
                      ))}
                    </div>
                  </div>



                  {/* İmza ve Tarih */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">İmza ve Tarih</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contractDate">Tarih *</Label>
                        <Input
                          id="contractDate"
                          type="date"
                          value={mainContractData.contractDate}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <Label htmlFor="registrarName">Kaydı Yapan *</Label>
                        <Input
                          id="registrarName"
                          value={mainContractData.registrarName}
                          onChange={(e) => setMainContractData(prev => ({ ...prev, registrarName: formatPersonName(e.target.value) }))}
                          placeholder="Kaydı yapan kişinin adı soyadı"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kitap ve Forma Sözleşmesi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Kitap ve Forma Sözleşmesi</CardTitle>
                <CardDescription>Öğrenci kitap ve forma sözleşmesi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sınıf Bazlı Fiyat Tablosu */}
                  {getPriceTableForGrade() && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold mb-3 text-gray-700">
                        {mainContractData.studentClass || "—"} - Kitap ve Forma Ücret Tablosu
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-blue-100">
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Ay</th>
                              <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Tutar (TL)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(getPriceTableForGrade()!).map(([month, price]) => (
                              <tr key={month} className="hover:bg-gray-100">
                                <td className="border border-gray-300 px-3 py-2 text-sm">{month}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">
                                  {price.toLocaleString('tr-TR')} ₺
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Ödeme Linki Butonu */}
                  <div>
                    <Button
                      type="button"
                      onClick={() => window.open('https://kitap.leventokullari.com', '_blank')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ödeme Yapmak İçin Tıklayın
                    </Button>
                  </div>

                  {/* Ödeme Durumu Checkboxları */}
                  <div className="space-y-2">
                    <Label>Ödeme Durumu *</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={otherContractData.paymentReceived}
                          onChange={(e) => {
                            setOtherContractData({
                              ...otherContractData,
                              paymentReceived: e.target.checked,
                              paymentNotReceived: e.target.checked ? false : otherContractData.paymentNotReceived,
                            })
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Ödeme Alındı</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={otherContractData.paymentNotReceived}
                          onChange={(e) => {
                            setOtherContractData({
                              ...otherContractData,
                              paymentNotReceived: e.target.checked,
                              paymentReceived: e.target.checked ? false : otherContractData.paymentReceived,
                            })
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Ödeme Alınmadı</span>
                      </label>
                    </div>
                  </div>

                  {/* Eski Forma Alanları (Opsiyonel) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="uniformSize">Forma Bedeni *</Label>
                      <Input
                        id="uniformSize"
                        value={otherContractData.uniformSize}
                        onChange={(e) => setOtherContractData({ ...otherContractData, uniformSize: e.target.value })}
                        placeholder="Örn: M, L, XL"
                      />
                    </div>
                    <div>
                      <Label htmlFor="uniformDeliveryDate">Teslimat Tarihi *</Label>
                      <Input
                        id="uniformDeliveryDate"
                        type="date"
                        value={otherContractData.uniformDeliveryDate}
                        onChange={(e) => setOtherContractData({ ...otherContractData, uniformDeliveryDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="uniformItems">Teslim Edilecek Formalar *</Label>
                    <div className="space-y-2 mt-2">
                      {['eşofman takımı', 'eşofman takımı + 2 tişört', 'tişört 2 adet'].map((item) => (
                        <label key={item} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={otherContractData.uniformItems.includes(item)}
                            onChange={(e) => {
                              const currentItems = otherContractData.uniformItems || []
                              if (e.target.checked) {
                                setOtherContractData({ ...otherContractData, uniformItems: [...currentItems, item] })
                              } else {
                                setOtherContractData({ ...otherContractData, uniformItems: currentItems.filter(i => i !== item) })
                              }
                            }}
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Kaydet ve PDF İndir Butonları */}
            <div className="flex gap-2">
              <Button 
                onClick={handleDownloadCombinedPDF} 
                variant="outline"
                disabled={hasExistingRenewal}
              >
                <Download className="h-4 w-4 mr-2" />
                {hasExistingRenewal ? "Kayıt Yenileme Yapılamaz" : "Tüm Sözleşmeleri PDF İndir ve Kaydet"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}