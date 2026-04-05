"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Users, Clock, TrendingUp, GraduationCap, List, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  contractYearLabelFromAcademicYear,
  resolveActiveAndNextAcademicYear,
  type AcademicYearListItem,
} from "@/lib/academic-year-ui"

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

export default function NewRegistrationPage() {
  const router = useRouter()
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [academicYearChoices, setAcademicYearChoices] = useState<{
    active: AcademicYearListItem | null
    next: AcademicYearListItem | null
  }>({ active: null, next: null })
  const [academicYearsLoading, setAcademicYearsLoading] = useState(true)
  /** Sözleşme JSON — API doğrulaması için zorunlu */
  const [contractAcademicYearId, setContractAcademicYearId] = useState("")

  // İstatistikler
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    sinifStats: {} as Record<string, number>,
    academicYearStats: {} as Record<string, number>,
  })
  
  // Öğrenci Bilgileri Formu
  const [studentFormData, setStudentFormData] = useState({
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
    fatherOccupation: ""
  })

  // Ana Sözleşme Form Verileri
  const [mainContractData, setMainContractData] = useState<{
    studentName: string
    studentClass: string
    studentTC: string
    studentBirthDate: string
    schoolLicenseNo: string
    contractNo: string
    registrationResponsible: string
    registrationDate: string
    contractStudentName: string
    contractParentName: string
    announcedTuitionFee: string
    announcedClothingFee: string
    announcedCourseFee: string
    announcedStudyHallFee: string
    announcedTotal: string
    studentTuitionFee: string
    studentClothingFee: string
    studentCourseFee: string
    studentStudyHallFee: string
    studentTotal: string
    parentSignature: string
    contractDate: string
    registrarName: string
    registrarSignature: string
    academicYear: string
    paymentPlan: string
    paymentDueDate: string
  }>({
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
    paymentDueDate: "",
    
    // İmza ve Tarih
    parentSignature: "",
    contractDate: "",
    registrarName: "",
    registrarSignature: "",
    
    // Servis Bilgileri
    
    // Öğretim Yılı ve Ödeme Planı
    academicYear: "",
    paymentPlan: ""
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
    const grade = mainContractData.studentClass || studentFormData.grade
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


  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/new-registrations/stats`)
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
            academicYearStats: data.academicYearStats || {}
          })
        } else {
          console.error("[New Registration] Invalid stats data format:", data)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("[New Registration] Stats API error:", response.status, errorData)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [])

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
    fetchStats()
  }, [fetchStats, mainContractData.academicYear])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setAcademicYearsLoading(true)
      try {
        const res = await fetch("/api/neredeyiz/academic-years?forContracts=1")
        if (!res.ok) throw new Error("academic-years")
        const data = (await res.json()) as AcademicYearListItem[]
        if (cancelled) return
        const { active, next } = resolveActiveAndNextAcademicYear(Array.isArray(data) ? data : [])
        setAcademicYearChoices({ active, next })
        setMainContractData((prev) => {
          if (prev.academicYear) return prev
          if (!active) return prev
          return { ...prev, academicYear: contractYearLabelFromAcademicYear(active) }
        })
        setContractAcademicYearId((prev) => {
          if (prev) return prev
          return active?.id ?? ""
        })
      } catch {
        if (!cancelled) setAcademicYearChoices({ active: null, next: null })
      } finally {
        if (!cancelled) setAcademicYearsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
        setMainContractData(prev => ({
          ...prev,
          registrationResponsible: prev.registrationResponsible || staffName,
          registrarName: prev.registrarName || staffName,
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


  const handleDownloadCombinedPDF = async () => {
    // Çift tıklama koruması
    if (isSubmitting) {
      return
    }

    // Öğrenci bilgilerini kontrol et - zorunlu alanlar
    if (!studentFormData.firstName || !studentFormData.lastName || !studentFormData.tcNumber || !studentFormData.grade || !studentFormData.birthDate) {
      alert("⚠️ Lütfen öğrenci bilgilerini eksiksiz doldurun!\n\nZorunlu alanlar:\n- Ad\n- Soyad\n- TC Kimlik No\n- Doğum Tarihi\n- Sınıf")
      return
    }

    if (!mainContractData.schoolLicenseNo) {
      alert("⚠️ Okul ruhsat no seçmelisiniz!")
      return
    }

    if (!mainContractData.academicYear || !contractAcademicYearId) {
      alert("⚠️ Eğitim öğretim yılı seçmelisiniz!")
      return
    }

    // TC numarası kontrolü
    if (studentFormData.tcNumber.length !== 11 || !/^\d+$/.test(studentFormData.tcNumber)) {
      alert("⚠️ TC Kimlik Numarası 11 haneli olmalı ve sadece rakamlardan oluşmalıdır!")
      return
    }

    setIsSubmitting(true)
    try {
      // Öğrenciyi bul veya oluştur (TC numarasına göre kontrol et)
      let studentId = createdStudentId
      
      if (!studentId) {
        // Önce TC numarasına göre öğrenci var mı kontrol et (tam eşleşme)
        const existingStudentResponse = await fetch(`/api/students?search=${studentFormData.tcNumber}&limit=100`)
        let existingStudent = null
        
        if (existingStudentResponse.ok) {
          const studentsData = await existingStudentResponse.json()
          const students = Array.isArray(studentsData) ? studentsData : (studentsData.students || [])
          // TC numarasına göre tam eşleşme bul
          existingStudent = students.find((s: { tcNumber: string }) => s.tcNumber === studentFormData.tcNumber)
        }
        
        if (existingStudent) {
          // Mevcut öğrenciyi kullan (çift öğrenci oluşturma)
          studentId = existingStudent.id
          setCreatedStudentId(studentId)
        } else {
          // Yeni öğrenci oluştur
          const studentResponse = await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentFormData)
          })

          if (!studentResponse.ok) {
            const errorData = await studentResponse.json()
            // TC numarası zaten varsa tekrar kontrol et
            if (errorData.error && errorData.error.includes("TC") && errorData.error.includes("unique")) {
              // TC numarasına göre tekrar ara
              const retryResponse = await fetch(`/api/students?search=${studentFormData.tcNumber}&limit=100`)
              if (retryResponse.ok) {
                const retryData = await retryResponse.json()
                const retryStudents = Array.isArray(retryData) ? retryData : (retryData.students || [])
                const foundStudent = retryStudents.find((s: { tcNumber: string }) => s.tcNumber === studentFormData.tcNumber)
                if (foundStudent) {
                  studentId = foundStudent.id
                  setCreatedStudentId(studentId)
                } else {
                  alert("⚠️ Bu TC Kimlik Numarası ile kayıtlı bir öğrenci zaten mevcut!\n\nLütfen TC numarasını kontrol edin.")
                  setIsSubmitting(false)
                  return
                }
              } else {
                alert("⚠️ Bu TC Kimlik Numarası ile kayıtlı bir öğrenci zaten mevcut!\n\nLütfen TC numarasını kontrol edin.")
                setIsSubmitting(false)
                return
              }
            } else {
              alert(errorData.error || "Öğrenci oluşturulurken hata oluştu!")
              setIsSubmitting(false)
              return
            }
          } else {
            const newStudent = await studentResponse.json()
            // API response formatı: { success: true, student: {...} } veya direkt student objesi
            studentId = newStudent.student?.id || newStudent.id
            if (!studentId) {
              alert("⚠️ Öğrenci oluşturuldu ancak ID alınamadı!")
              setIsSubmitting(false)
              return
            }
            setCreatedStudentId(studentId)
          }
        }
      }

      // Akademik yıl bazlı kontrol - backend'de yapılıyor, burada sadece hata mesajını göster

      // Sonra sözleşmeleri kaydet
      const contracts = [
        {
          type: "new-registration",
          data: {
            studentId: studentId,
            contractData: {
              ...mainContractData,
              academicYearId: contractAcademicYearId,
              studentName: `${studentFormData.firstName} ${studentFormData.lastName}`,
              studentClass: studentFormData.grade,
              studentTC: studentFormData.tcNumber,
              studentBirthDate: formatDate(studentFormData.birthDate),
              contractStudentName: `${studentFormData.firstName} ${studentFormData.lastName}`,
              contractParentName: "",
              address: studentFormData.address
            },
          }
        },
        {
          type: "uniform",
          data: {
            studentId: studentId,
            contractData: {
              studentName: `${studentFormData.firstName} ${studentFormData.lastName}`,
              tcNumber: studentFormData.tcNumber,
            uniformSize: otherContractData.uniformSize,
            uniformPrice: otherContractData.uniformPrice,
            deliveryDate: otherContractData.uniformDeliveryDate,
            uniformItems: otherContractData.uniformItems,
            paymentReceived: otherContractData.paymentReceived,
            paymentNotReceived: otherContractData.paymentNotReceived
            }
          }
        },
      ]

      // Tüm sözleşmeleri kaydet
      const responses = await Promise.all(
        contracts.map(contract => {
          const endpoint = contract.type === "new-registration" 
            ? "/api/new-registrations" 
            : `/api/${contract.type}-contracts`
          
          return fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contract.data)
          })
        })
      )

      const allSuccessful = responses.every(response => response.ok)
      
      if (!allSuccessful) {
        // Hata detaylarını topla
        const errorDetails = await Promise.all(
          responses.map(async (response, index) => {
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              // Akademik yıl bazlı çift kayıt hatası için özel mesaj
              if (errorData.code === "DUPLICATE_REGISTRATION") {
                return `⚠️ Bu öğrenci için seçilen akademik yılda (${mainContractData.academicYear}) zaten yeni kayıt yapılmış!\n\nFarklı bir akademik yıl seçebilir veya mevcut kaydı kullanabilirsiniz.`
              }
              return `${contracts[index].type}: ${errorData.error || errorData.details || "Bilinmeyen hata"}`
            }
            return null
          })
        )
        const errorMessages = errorDetails.filter(msg => msg !== null)
        alert(`⚠️ Sözleşmeler kaydedilirken hata oluştu!\n\n${errorMessages.join("\n")}`)
        setIsSubmitting(false)
        return
      }
      
      // Tüm sözleşmeler başarıyla kaydedildi
      // Ana sözleşme ID'sini al
      const mainContractResponse = await responses[0].json()
      const contractId = mainContractResponse.id || mainContractResponse.newRegistration?.id
      
      if (!contractId) {
        alert("⚠️ Sözleşme kaydedildi ancak ID alınamadı!")
        return
      }

      // Seçili kulüplerin detaylarını al (mainContractData'dan)

      // PDF'i indir
      const pdfResponse = await fetch(`/api/pdf/combined/${contractId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractTypes: [
            "new-registration",
            "uniform",
          ],
          mainContractData: mainContractData,
          otherContractData: otherContractData
        })
      })

      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `tum-sozlesmeler-${studentFormData.firstName}-${studentFormData.lastName}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Başarı mesajı
        alert(`✅ Kayıt başarıyla tamamlandı!\n\n` +
          `Öğrenci: ${studentFormData.firstName} ${studentFormData.lastName}\n` +
          `TC: ${studentFormData.tcNumber}\n\n` +
          `✓ Öğrenci sisteme eklendi\n` +
          `✓ Sözleşmeler kaydedildi\n` +
          `✓ Öğrenci "Geçmiş Sözleşmeler" sayfasında görünecek\n` +
          `✓ Öğrenci "Öğrenci Yönetimi" sayfasında görünecek\n\n` +
          `PDF dosyası indirildi.`)
        
        // Formu temizle
        setStudentFormData({
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
          fatherOccupation: ""
        })
        setCreatedStudentId(null)
        
        // İstatistikleri yenile
        await fetchStats()
      } else {
        const errorData = await pdfResponse.json().catch(() => ({}))
        alert(`⚠️ PDF oluşturulurken hata oluştu!\n\n${errorData.error || errorData.details || "Bilinmeyen hata"}`)
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("PDF indirilirken hata oluştu!")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Yeni Kayıt Sözleşmesi</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Yeni öğrenci kayıt sözleşmesini oluşturun</p>
        </div>
        <Button
          onClick={() => router.push('/new-registrations/list')}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
        >
          <List className="h-4 w-4 mr-2" />
          Kayıtları Görüntüle
        </Button>
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
              Sınıf Bazında Kayıtlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
              {siniflar.map((sinif) => {
                const count = stats.sinifStats[sinif] || 0
                return (
                  <div
                    key={sinif}
                    className="p-2 sm:p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <p className="text-xs text-gray-600 mb-1 truncate">{sinif}</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        {/* Öğrenci Bilgileri Formu */}
        <Card className="border-2 border-blue-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-2xl text-blue-700">Yeni Öğrenci Bilgileri</CardTitle>
            <CardDescription className="text-base mt-2">
              <strong>Önemli:</strong> Yeni kayıt yapılacak öğrenci sistemde bulunmamalıdır. 
              Lütfen öğrencinin tüm bilgilerini eksiksiz girin. Kayıt tamamlandığında öğrenci 
              otomatik olarak sisteme eklenecek ve hem geçmiş sözleşmelerde hem de öğrenci yönetimi sayfasında görünecektir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Öğrenci Temel Bilgileri */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Öğrenci Temel Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Ad *</Label>
                    <Input
                      id="firstName"
                      value={studentFormData.firstName}
                      onChange={(e) => {
                        setStudentFormData({ ...studentFormData, firstName: e.target.value })
                        setMainContractData(prev => ({
                          ...prev,
                          studentName: `${e.target.value} ${studentFormData.lastName}`,
                          contractStudentName: `${e.target.value} ${studentFormData.lastName}`
                        }))
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Soyad *</Label>
                    <Input
                      id="lastName"
                      value={studentFormData.lastName}
                      onChange={(e) => {
                        setStudentFormData({ ...studentFormData, lastName: e.target.value })
                        setMainContractData(prev => ({
                          ...prev,
                          studentName: `${studentFormData.firstName} ${e.target.value}`,
                          contractStudentName: `${studentFormData.firstName} ${e.target.value}`
                        }))
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tcNumber">TC Kimlik No *</Label>
                    <Input
                      id="tcNumber"
                      value={studentFormData.tcNumber}
                      onChange={(e) => {
                        setStudentFormData({ ...studentFormData, tcNumber: e.target.value })
                        setMainContractData(prev => ({ ...prev, studentTC: e.target.value }))
                      }}
                      maxLength={11}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Doğum Tarihi * (GG.AA.YYYY)</Label>
                    <Input
                      id="birthDate"
                      type="text"
                      value={studentFormData.birthDate}
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
                        
                        setStudentFormData({ ...studentFormData, birthDate: formatted })
                        // ISO formatına çevir (YYYY-MM-DD) - backend için
                        let isoDate = ''
                        if (value.length === 8) {
                          const day = value.slice(0, 2)
                          const month = value.slice(2, 4)
                          const year = value.slice(4, 8)
                          isoDate = `${year}-${month}-${day}`
                        }
                        setMainContractData(prev => ({ ...prev, studentBirthDate: isoDate || formatted }))
                      }}
                      placeholder="GG.AA.YYYY (örn: 12.07.2016)"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="grade">Sınıf *</Label>
                    <select
                      id="grade"
                      value={studentFormData.grade}
                      onChange={(e) => {
                        setStudentFormData({ ...studentFormData, grade: e.target.value })
                        setMainContractData(prev => ({ ...prev, studentClass: e.target.value }))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sınıf Seçiniz</option>
                      {siniflar.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="address">Adres</Label>
                    <Input
                      id="address"
                      value={studentFormData.address}
                      onChange={(e) => setStudentFormData({ ...studentFormData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Anne Bilgileri */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Anne Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="motherName">Anne Adı Soyadı</Label>
                    <Input
                      id="motherName"
                      value={studentFormData.motherName}
                      onChange={(e) => setStudentFormData({ ...studentFormData, motherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherTc">Anne TC Kimlik No</Label>
                    <Input
                      id="motherTc"
                      value={studentFormData.motherTc}
                      onChange={(e) => setStudentFormData({ ...studentFormData, motherTc: e.target.value })}
                      maxLength={11}
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherPhone">Anne Telefon</Label>
                    <Input
                      id="motherPhone"
                      value={studentFormData.motherPhone}
                      onChange={(e) => setStudentFormData({ ...studentFormData, motherPhone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherAddress">Anne Adres</Label>
                    <Input
                      id="motherAddress"
                      value={studentFormData.motherAddress}
                      onChange={(e) => setStudentFormData({ ...studentFormData, motherAddress: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherOccupation">Anne Meslek</Label>
                    <Input
                      id="motherOccupation"
                      value={studentFormData.motherOccupation}
                      onChange={(e) => setStudentFormData({ ...studentFormData, motherOccupation: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Baba Bilgileri */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Baba Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fatherName">Baba Adı Soyadı</Label>
                    <Input
                      id="fatherName"
                      value={studentFormData.fatherName}
                      onChange={(e) => setStudentFormData({ ...studentFormData, fatherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherTc">Baba TC Kimlik No</Label>
                    <Input
                      id="fatherTc"
                      value={studentFormData.fatherTc}
                      onChange={(e) => setStudentFormData({ ...studentFormData, fatherTc: e.target.value })}
                      maxLength={11}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherPhone">Baba Telefon</Label>
                    <Input
                      id="fatherPhone"
                      value={studentFormData.fatherPhone}
                      onChange={(e) => setStudentFormData({ ...studentFormData, fatherPhone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherAddress">Baba Adres</Label>
                    <Input
                      id="fatherAddress"
                      value={studentFormData.fatherAddress}
                      onChange={(e) => setStudentFormData({ ...studentFormData, fatherAddress: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherOccupation">Baba Meslek</Label>
                    <Input
                      id="fatherOccupation"
                      value={studentFormData.fatherOccupation}
                      onChange={(e) => setStudentFormData({ ...studentFormData, fatherOccupation: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {studentFormData.firstName && studentFormData.lastName && studentFormData.tcNumber && studentFormData.grade && (
          <>
            {/* Ana Sözleşme Formu */}
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">EĞİTİM ÖĞRETİM HİZMET SÖZLEŞMESİ</CardTitle>
                <CardDescription>Ana sözleşme formu - Öğrenci ve ödeme bilgileri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Öğrenci ve Sözleşme Bilgileri */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="studentName">Öğrenci Adı Soyadı</Label>
                      <Input
                        id="studentName"
                        value={mainContractData.studentName}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentClass">Sınıfı</Label>
                      <select
                        id="studentClass"
                        value={(() => {
                          const g = (mainContractData.studentClass || "").trim()
                          const num = parseInt(g.replace(/\D/g, ""), 10)
                          if (!isNaN(num) && num >= 5 && num <= 12) return `${num}. Sınıf`
                          return g || ""
                        })()}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentClass: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                      >
                        <option value="">Seçiniz</option>
                        {[5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={`${n}. Sınıf`}>{n}. Sınıf</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="studentTC">TC</Label>
                      <Input
                        id="studentTC"
                        value={mainContractData.studentTC}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentTC: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentBirthDate">Doğum Tarihi</Label>
                      <Input
                        id="studentBirthDate"
                        type="date"
                        value={mainContractData.studentBirthDate}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentBirthDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Okul Ruhsat No</Label>
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
                      <Label htmlFor="contractNo">Sözleşme No</Label>
                      <Input
                        id="contractNo"
                        value={mainContractData.contractNo}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationResponsible">Kayıt/Kayıt Yenileme Sorumlusu</Label>
                      <Input
                        id="registrationResponsible"
                        value={mainContractData.registrationResponsible}
                        onChange={(e) => setMainContractData(prev => ({ ...prev, registrationResponsible: e.target.value }))}
                        placeholder="Kayıt sorumlusunun adı soyadı"
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationDate">Kayıt/Kayıt Yenileme Tarihi</Label>
                      <Input
                        id="registrationDate"
                        type="date"
                        value={mainContractData.registrationDate}
                        onChange={(e) => {
                          const regDate = e.target.value
                          const regDateObj = new Date(regDate)
                          const dueDateObj = new Date(regDateObj)
                          dueDateObj.setDate(dueDateObj.getDate() + 15)
                          setMainContractData({ 
                            ...mainContractData, 
                            registrationDate: regDate,
                            paymentDueDate: dueDateObj.toISOString().split("T")[0]
                          })
                        }}
                      />
                    </div>
                  </div>

                  {/* Ödeme Bilgileri */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                      <div className="flex flex-col gap-2 flex-1 min-w-[240px]">
                        <h3 className="text-lg font-semibold">ÖDEME BİLGİLERİ — Öğretim yılı</h3>
                        <p className="text-xs text-gray-600">
                          Yeni kayıt yalnızca <strong>aktif</strong> akademik yıl veya tanımlıysa onu takip eden{" "}
                          <strong>bir sonraki</strong> akademik yıl için seçilebilir (ör. yaz tatilinde gelecek yıl
                          kaydı). Kayıt yenileme bu ekrandan yapılmaz; sadece bir sonraki yıl için ayrı akıştır.
                        </p>
                        {academicYearsLoading ? (
                          <p className="text-sm text-gray-500">Akademik yıllar yükleniyor…</p>
                        ) : !academicYearChoices.active && !academicYearChoices.next ? (
                          <p className="text-sm text-amber-700">
                            Tanımlı akademik yıl bulunamadı. Önce sistemde akademik yıl oluşturup bir yılı aktif
                            yapın (Neredeyiz / ileride Ayarlar).
                          </p>
                        ) : (
                          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                            {academicYearChoices.active && (
                              <label className="flex cursor-pointer items-start gap-2 text-sm">
                                <input
                                  type="radio"
                                  name="newRegAcademicYear"
                                  className="mt-1"
                                  checked={
                                    mainContractData.academicYear ===
                                    contractYearLabelFromAcademicYear(academicYearChoices.active)
                                  }
                                  onChange={() => {
                                    setContractAcademicYearId(academicYearChoices.active!.id)
                                    setMainContractData({
                                      ...mainContractData,
                                      academicYear: contractYearLabelFromAcademicYear(academicYearChoices.active!),
                                    })
                                  }}
                                />
                                <span>
                                  <span className="font-medium">Aktif akademik yıl</span>
                                  <span className="block text-gray-600">
                                    {academicYearChoices.active.name} (
                                    {contractYearLabelFromAcademicYear(academicYearChoices.active)})
                                  </span>
                                </span>
                              </label>
                            )}
                            {academicYearChoices.next && (
                              <label className="flex cursor-pointer items-start gap-2 text-sm">
                                <input
                                  type="radio"
                                  name="newRegAcademicYear"
                                  className="mt-1"
                                  checked={
                                    mainContractData.academicYear ===
                                    contractYearLabelFromAcademicYear(academicYearChoices.next)
                                  }
                                  onChange={() => {
                                    setContractAcademicYearId(academicYearChoices.next!.id)
                                    setMainContractData({
                                      ...mainContractData,
                                      academicYear: contractYearLabelFromAcademicYear(academicYearChoices.next!),
                                    })
                                  }}
                                />
                                <span>
                                  <span className="font-medium">Bir sonraki akademik yıl</span>
                                  <span className="block text-gray-600">
                                    {academicYearChoices.next.name} (
                                    {contractYearLabelFromAcademicYear(academicYearChoices.next)})
                                  </span>
                                </span>
                              </label>
                            )}
                            {academicYearChoices.active && !academicYearChoices.next && (
                              <p className="text-xs text-gray-600">
                                Bir sonraki yıl için kayıt alabilmek üzere veritabanında aktif yılı takip eden ikinci
                                bir akademik yıl kaydı oluşturmanız gerekir.
                              </p>
                            )}
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
                      <div className="font-semibold text-center">Kurumun İlan Ettiği Ücretler (KDV Dahil)</div>
                      <div className="font-semibold text-center">Öğrenci İçin Belirlenen Ücretler (KDV Dahil)</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>Öğrenim Ücreti</div>
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
                      <div>KIYAFET ÜCRETİ</div>
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
                      <div className="pl-4">Takviye Kursu Ücreti</div>
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
                      <div className="pl-4">Etüt Ücreti</div>
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
                      <div>ÜCRETLER TOPLAMI</div>
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
                        <Label htmlFor="registrationDateMuacceliyet">Kayıt İşleminin Gerçekleştirildiği Tarih</Label>
                        <Input
                          id="registrationDateMuacceliyet"
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
                    <h3 className="text-lg font-semibold">Ödeme Planı</h3>
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
                        <Label htmlFor="contractDate">Tarih</Label>
                        <Input
                          id="contractDate"
                          type="date"
                          value={mainContractData.contractDate}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <Label htmlFor="registrarName">Kaydı Yapan</Label>
                        <Input
                          id="registrarName"
                          value={mainContractData.registrarName}
                          onChange={(e) => setMainContractData(prev => ({ ...prev, registrarName: e.target.value }))}
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
                        {mainContractData.studentClass || studentFormData.grade} - Kitap ve Forma Ücret Tablosu
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
                    <Label>Ödeme Durumu</Label>
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
                      <Label htmlFor="uniformSize">Forma Bedeni</Label>
                      <Input
                        id="uniformSize"
                        value={otherContractData.uniformSize}
                        onChange={(e) => setOtherContractData({ ...otherContractData, uniformSize: e.target.value })}
                        placeholder="Örn: M, L, XL"
                      />
                    </div>
                    <div>
                      <Label htmlFor="uniformDeliveryDate">Teslimat Tarihi</Label>
                      <Input
                        id="uniformDeliveryDate"
                        type="date"
                        value={otherContractData.uniformDeliveryDate}
                        onChange={(e) => setOtherContractData({ ...otherContractData, uniformDeliveryDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="uniformItems">Teslim Edilecek Formalar</Label>
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
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  onClick={handleDownloadCombinedPDF} 
                  variant="outline"
                  disabled={isSubmitting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isSubmitting ? "İşleniyor..." : "Tüm Sözleşmeleri PDF İndir"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}