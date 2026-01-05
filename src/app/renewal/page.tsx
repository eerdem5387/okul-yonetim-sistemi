"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Download, Users, Clock, TrendingUp, GraduationCap, List, Search } from "lucide-react"
import { useRouter } from "next/navigation"

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
  const [clubs, setClubs] = useState<{id: string, name: string}[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  
  // İstatistikler
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    sinifStats: {} as Record<string, number>,
  })

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
    registrationDate: "",
    
    // Sözleşme Metni
    contractStudentName: "",
    contractParentName: "",
    
    // Ödeme Bilgileri - Kurumun İlan Ettiği Ücretler
    announcedTuitionFee: "",
    announcedClothingFee: "",
    announcedCourseFee: "",
    announcedBookFee: "",
    announcedStationeryFee: "",
    announcedStudyHallFee: "",
    announcedTotal: "",
    
    // Ödeme Bilgileri - Öğrenci İçin Belirlenen Ücretler
    studentTuitionFee: "",
    studentClothingFee: "",
    studentCourseFee: "",
    studentBookFee: "",
    studentStationeryFee: "",
    studentStudyHallFee: "",
    studentTotal: "",
    
    // Ödeme Planı
    installmentStartDate: "",
    downPayment: "",
    installments: [] as { month: string; label: string; amount: string }[],
    achievementDiscountRate: "",
    achievementDiscountType: "none", // "none" or "percentage"
    
    // İndirimler
    siblingDiscount: false,
    staffChildDiscount: false,
    corporateDiscount: false,
    martyrVeteranDiscount: false,
    teacherChildDiscount: false,
    achievementDiscount: false,
    otherDiscount: false,
    otherDiscountDescription: "",
    
    // İmza ve Tarih
    parentSignature: "",
    contractDate: "",
    registrarName: "",
    registrarSignature: "",
    
    // Servis ve Kulüp Bilgileri
    serviceRegion: "",
    servicePrice: "",
    selectedClubs: [] as string[]
  })

  // Diğer Sözleşme Form Verileri
  const [otherContractData, setOtherContractData] = useState({
    // Forma Sözleşmesi
    uniformSize: "",
    uniformPrice: "",
    uniformDeliveryDate: "",
    uniformItems: [] as string[],
    
    // Yemek Sözleşmesi
    mealPeriods: [] as string[],
    mealPrice: "",
    
    // Kitap Sözleşmesi
    bookSet: "",
    bookDeliveryDate: "",
    
    // Servis Sözleşmesi
    usesService: false as boolean,
    serviceRegion: "",
    servicePrice: "",
    
    // Kulüp Seçimi
    selectedClubs: [] as string[]
  })

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return ""
    try {
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

  const fetchStudents = useCallback(async () => {
    try {
      // Kayıt yenileme ekranında tüm öğrencileri (mezunlar hariç) çekmek için
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

  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch("/api/clubs")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setClubs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching clubs:", error)
      setClubs([])
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
            sinifStats: data.sinifStats || {}
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
    fetchStudents()
    fetchClubs()
    fetchStats()
  }, [fetchStudents, fetchClubs, fetchStats])

  // Kullanıcı adını otomatik doldur (sadece bir kez)
  useEffect(() => {
    const staffName = localStorage.getItem("staff_name")
    if (staffName && !mainContractData.registrationResponsible) {
      setMainContractData(prev => ({
        ...prev,
        registrationResponsible: staffName
      }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleSaveClubSelections = async () => {
    if (!selectedStudent || !otherContractData.selectedClubs?.length) return

    try {
      // Kulüp seçimlerini kaydet
      const clubSelections = otherContractData.selectedClubs.map(clubId => ({
        clubId,
        studentId: selectedStudent.id
      }))

      const response = await fetch("/api/clubs/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubSelections })
      })

      if (response.ok) {
        alert("Kulüp seçimleri başarıyla kaydedildi!")
        // Kulüp listesini yenile
        fetchClubs()
      } else {
        const errorData = await response.json()
        if (errorData.error && errorData.existingClubs) {
          const clubNames = errorData.existingClubs.map((club: {name: string}) => club.name).join(", ")
          alert(`⚠️ Bu öğrenci zaten şu kulüplere kayıtlı:\n\n${clubNames}\n\nLütfen farklı kulüpler seçin.`)
        } else {
          alert("Kulüp seçimleri kaydedilirken hata oluştu!")
        }
      }
    } catch (error) {
      console.error("Error saving club selections:", error)
      alert("Kulüp seçimleri kaydedilirken hata oluştu!")
    }
  }

  const handleSaveAllContracts = async () => {
    if (!selectedStudent) return

    try {
      // Tüm sözleşmeleri ayrı ayrı kaydet
      const contracts = [
        {
          type: "renewal",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              ...mainContractData,
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              studentTC: selectedStudent.tcNumber,
              studentClass: selectedStudent.grade,
              studentBirthDate: formatDate(selectedStudent.birthDate),
              contractStudentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              contractParentName: ""
            }
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
              uniformItems: otherContractData.uniformItems
            }
          }
        },
        {
          type: "meal",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              tcNumber: selectedStudent.tcNumber,
              mealPeriods: otherContractData.mealPeriods,
              mealPrice: otherContractData.mealPrice
            }
          }
        },
        {
          type: "book",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              tcNumber: selectedStudent.tcNumber,
              bookSet: otherContractData.bookSet,
              deliveryDate: otherContractData.bookDeliveryDate
            }
          }
        },
        ...(otherContractData.usesService ? [{
          type: "service",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              tcNumber: selectedStudent.tcNumber,
              serviceRegion: otherContractData.serviceRegion,
              servicePrice: otherContractData.servicePrice,
              address: selectedStudent.address
            }
          }
        }] : [])
      ]

      // Tüm sözleşmeleri kaydet
      const responses = await Promise.all(
        contracts.map(contract => {
          // renewal type'ı için doğru endpoint kullan
          const endpoint = contract.type === "renewal" 
            ? "/api/renewals" 
            : `/api/${contract.type}-contracts`
          
          // Kulüp seçimlerini sadece ana sözleşmeye ekle
          const requestBody = contract.type === "renewal" 
            ? { ...contract.data, selectedClubs: mainContractData.selectedClubs }
            : contract.data
          
          return fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          })
        })
      )

      const allSuccessful = responses.every(response => response.ok)
      
      if (allSuccessful) {
        alert("Tüm sözleşmeler başarıyla kaydedildi!")
      } else {
        alert("Bazı sözleşmeler kaydedilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving contracts:", error)
      alert("Sözleşmeler kaydedilirken hata oluştu!")
    }
  }

  const handleDownloadCombinedPDF = async () => {
    if (!selectedStudent) {
      alert("⚠️ Lütfen önce bir öğrenci seçin!")
      return
    }

    try {
      // Önce sözleşmeleri kaydet (eğer kaydedilmemişse)
      // Tüm sözleşmeleri ayrı ayrı kaydet
      const contracts = [
        {
          type: "renewal",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              ...mainContractData,
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              studentTC: selectedStudent.tcNumber,
              studentClass: selectedStudent.grade,
              studentBirthDate: formatDate(selectedStudent.birthDate),
              contractStudentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              contractParentName: ""
            },
            selectedClubs: mainContractData.selectedClubs
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
              uniformItems: otherContractData.uniformItems
            }
          }
        },
        {
          type: "meal",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              tcNumber: selectedStudent.tcNumber,
              mealPeriods: otherContractData.mealPeriods,
              mealPrice: otherContractData.mealPrice
            }
          }
        },
        {
          type: "book",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              tcNumber: selectedStudent.tcNumber,
              bookSet: otherContractData.bookSet,
              deliveryDate: otherContractData.bookDeliveryDate
            }
          }
        },
        ...(otherContractData.usesService ? [{
          type: "service",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              tcNumber: selectedStudent.tcNumber,
              serviceRegion: otherContractData.serviceRegion,
              servicePrice: otherContractData.servicePrice,
              address: selectedStudent.address
            }
          }
        }] : [])
      ]

      // Tüm sözleşmeleri kaydet
      const responses = await Promise.all(
        contracts.map(contract => {
          const endpoint = contract.type === "renewal" 
            ? "/api/renewals" 
            : `/api/${contract.type}-contracts`
          
          const requestBody = contract.type === "renewal" 
            ? { ...contract.data, selectedClubs: mainContractData.selectedClubs }
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

      // Seçili kulüplerin detaylarını al (mainContractData'dan)
      const selectedClubsForPDF = (mainContractData.selectedClubs || [])
        .map((clubId: string) => {
          const club = clubs.find(c => c.id === clubId)
          return club ? { id: club.id, name: club.name } : null
        })
        .filter((club): club is { id: string; name: string } => club !== null)

      // PDF'i indir
      const response = await fetch(`/api/pdf/combined/${contractId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractTypes: [
            "renewal",
            "uniform",
            "meal",
            "book",
            ...(otherContractData.usesService ? ["service"] : [])
          ],
          mainContractData: mainContractData,
          otherContractData: otherContractData,
          selectedClubs: selectedClubsForPDF.length > 0 ? selectedClubsForPDF : undefined
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
    
    const formattedBirthDate = formatDate(student.birthDate)
    setMainContractData(prev => ({
      ...prev,
      studentName: `${student.firstName} ${student.lastName}`,
      studentTC: student.tcNumber,
      studentClass: student.grade,
      studentBirthDate: formattedBirthDate,
      contractStudentName: `${student.firstName} ${student.lastName}`,
      contractParentName: ""
    }))
    
    // Öğrencinin detaylarını çek (öğrenim ücreti dahil)
    try {
      const response = await fetch(`/api/students/${student.id}?format=legacy`)
      if (response.ok) {
        const studentDetails: Student = await response.json()
        if (studentDetails.announcedTuitionFee || studentDetails.studentTuitionFee) {
          setMainContractData(prev => ({
            ...prev,
            announcedTuitionFee: studentDetails.announcedTuitionFee || prev.announcedTuitionFee,
            studentTuitionFee: studentDetails.studentTuitionFee || prev.studentTuitionFee
          }))
        }
      }
    } catch (err) {
      console.error("Error fetching student details:", err)
    }
  }

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
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">Seçilen Öğrenci Bilgileri</h3>
                <p><strong>Ad Soyad:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p><strong>TC Kimlik No:</strong> {selectedStudent.tcNumber}</p>
                <p><strong>Sınıf:</strong> {selectedStudent.grade}</p>
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
                      <Label htmlFor="studentName">Öğrenci Adı</Label>
                      <Input
                        id="studentName"
                        value={mainContractData.studentName}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentClass">Sınıfı</Label>
                      <Input
                        id="studentClass"
                        value={mainContractData.studentClass}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentClass: e.target.value })}
                      />
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
                      <Label htmlFor="schoolLicenseNo">Okul Ruhsat No</Label>
                      <Input
                        id="schoolLicenseNo"
                        value={mainContractData.schoolLicenseNo}
                        onChange={(e) => setMainContractData({ ...mainContractData, schoolLicenseNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contractNo">Sözleşme No (Okul No)</Label>
                      <Input
                        id="contractNo"
                        value={mainContractData.contractNo}
                        onChange={(e) => setMainContractData({ ...mainContractData, contractNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationResponsible">Kayıt/Kayıt Yenileme Sorumlusu</Label>
                      <Input
                        id="registrationResponsible"
                        value={mainContractData.registrationResponsible}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationDate">Kayıt/Kayıt Yenileme Tarihi</Label>
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
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">ÖDEME BİLGİLERİ (2024-2025 Öğretim Yılı İçin)</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const announced = [
                            parseFloat(mainContractData.announcedTuitionFee) || 0,
                            parseFloat(mainContractData.announcedClothingFee) || 0,
                            parseFloat(mainContractData.announcedCourseFee) || 0,
                            parseFloat(mainContractData.announcedBookFee) || 0,
                            parseFloat(mainContractData.announcedStationeryFee) || 0,
                            parseFloat(mainContractData.announcedStudyHallFee) || 0
                          ]
                          const student = [
                            parseFloat(mainContractData.studentTuitionFee) || 0,
                            parseFloat(mainContractData.studentClothingFee) || 0,
                            parseFloat(mainContractData.studentCourseFee) || 0,
                            parseFloat(mainContractData.studentBookFee) || 0,
                            parseFloat(mainContractData.studentStationeryFee) || 0,
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
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                      />
                      <Input
                        value={mainContractData.studentTuitionFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentTuitionFee: e.target.value })}
                        placeholder="0"
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
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
                      <div className="pl-4">Kitap Ücreti</div>
                      <Input
                        value={mainContractData.announcedBookFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, announcedBookFee: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        value={mainContractData.studentBookFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentBookFee: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="pl-4">Kırtasiye Ücreti</div>
                      <Input
                        value={mainContractData.announcedStationeryFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, announcedStationeryFee: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        value={mainContractData.studentStationeryFee}
                        onChange={(e) => setMainContractData({ ...mainContractData, studentStationeryFee: e.target.value })}
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

                  {/* Ödeme Planı */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Ödeme Planı</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="installmentStartDate">Taksit Başlangıç Tarihi</Label>
                        <Input
                          id="installmentStartDate"
                          type="date"
                          value={mainContractData.installmentStartDate}
                          onChange={(e) => setMainContractData({ ...mainContractData, installmentStartDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="downPayment">Peşinat</Label>
                        <Input
                          id="downPayment"
                          value={mainContractData.downPayment}
                          onChange={(e) => setMainContractData({ ...mainContractData, downPayment: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Taksit Ayları ve Tutarları</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                          {(() => {
                            const year = new Date().getFullYear()
                            const monthsTR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"]
                            return monthsTR.map((name, idx) => {
                              const m = String(idx + 1).padStart(2, '0')
                              const month = `${year}-${m}`
                              const label = `${name} ${year}`
                              const selected = mainContractData.installments.find(i => i.month === month)
                              return (
                                <div key={month} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={!!selected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setMainContractData({
                                            ...mainContractData,
                                            installments: [...mainContractData.installments, { month, label, amount: "" }]
                                          })
                                        } else {
                                          setMainContractData({
                                            ...mainContractData,
                                            installments: mainContractData.installments.filter(i => i.month !== month)
                                          })
                                        }
                                      }}
                                    />
                                    <span>{label}</span>
                                  </label>
                                  <Input
                                    placeholder="0"
                                    value={selected?.amount || ""}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setMainContractData({
                                        ...mainContractData,
                                        installments: selected
                                          ? mainContractData.installments.map(i => i.month === month ? { ...i, amount: val } : i)
                                          : [...mainContractData.installments, { month, label, amount: val }]
                                      })
                                    }}
                                    className="w-32"
                                    disabled={!selected}
                                  />
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="achievementDiscountRate">Başarı İndirimi Oranı</Label>
                        <div className="flex gap-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="achievementDiscountType"
                              value="none"
                              checked={mainContractData.achievementDiscountType === "none"}
                              onChange={(e) => setMainContractData({ ...mainContractData, achievementDiscountType: e.target.value })}
                              className="mr-1"
                            />
                            Yok
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="achievementDiscountType"
                              value="percentage"
                              checked={mainContractData.achievementDiscountType === "percentage"}
                              onChange={(e) => setMainContractData({ ...mainContractData, achievementDiscountType: e.target.value })}
                              className="mr-1"
                            />
                            %
                          </label>
                          {mainContractData.achievementDiscountType === "percentage" && (
                            <Input
                              value={mainContractData.achievementDiscountRate}
                              onChange={(e) => setMainContractData({ ...mainContractData, achievementDiscountRate: e.target.value })}
                              placeholder="0"
                              className="w-20"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* İndirimler */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">İNDİRİMLER</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={mainContractData.siblingDiscount}
                            onChange={(e) => setMainContractData({ ...mainContractData, siblingDiscount: e.target.checked })}
                            className="mr-2"
                          />
                          Kardeş İndirimi
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={mainContractData.staffChildDiscount}
                            onChange={(e) => setMainContractData({ ...mainContractData, staffChildDiscount: e.target.checked })}
                            className="mr-2"
                          />
                          Personel Çocuğu İndirimi
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={mainContractData.corporateDiscount}
                            onChange={(e) => setMainContractData({ ...mainContractData, corporateDiscount: e.target.checked })}
                            className="mr-2"
                          />
                          Kurumsal İndirim
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={mainContractData.martyrVeteranDiscount}
                            onChange={(e) => setMainContractData({ ...mainContractData, martyrVeteranDiscount: e.target.checked })}
                            className="mr-2"
                          />
                          Şehit/Gazi Çocuğu İndirimi
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={mainContractData.otherDiscount}
                            onChange={(e) => setMainContractData({ ...mainContractData, otherDiscount: e.target.checked })}
                            className="mr-2"
                          />
                          Diğer İndirimler
                        </label>
                        {mainContractData.otherDiscount && (
                          <Input
                            value={mainContractData.otherDiscountDescription}
                            onChange={(e) => setMainContractData({ ...mainContractData, otherDiscountDescription: e.target.value })}
                            placeholder="İndirim açıklaması"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={mainContractData.teacherChildDiscount}
                            onChange={(e) => setMainContractData({ ...mainContractData, teacherChildDiscount: e.target.checked })}
                            className="mr-2"
                          />
                          Öğretmen Çocuğu İndirimi
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={mainContractData.achievementDiscount}
                            onChange={(e) => setMainContractData({ ...mainContractData, achievementDiscount: e.target.checked })}
                            className="mr-2"
                          />
                          Başarı İndirimi
                        </label>
                      </div>
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
                          onChange={(e) => setMainContractData({ ...mainContractData, contractDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="registrarName">Kaydı Yapan</Label>
                        <Input
                          id="registrarName"
                          value={mainContractData.registrarName}
                          onChange={(e) => setMainContractData({ ...mainContractData, registrarName: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Forma Sözleşmesi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Forma Sözleşmesi</CardTitle>
                <CardDescription>Öğrenci forma sözleşmesi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contractDate">Sözleşme Tarihi</Label>
                    <Input
                      id="contractDate"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
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
                      <Label htmlFor="uniformPrice">Forma Ücreti</Label>
                      <Input
                        id="uniformPrice"
                        type="number"
                        value={otherContractData.uniformPrice}
                        onChange={(e) => setOtherContractData({ ...otherContractData, uniformPrice: e.target.value })}
                        placeholder="Örn: 500"
                      />
                    </div>
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
                  <div>
                    <Label htmlFor="uniformItems">Teslim Edilecek Formalar</Label>
                    <div className="space-y-2 mt-2">
                      {['eşofman takımı', 'eşofman takımı + 2 tişört', 'tişört 2 adet'].map((item) => (
                        <label key={item} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2"
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

            {/* Yemek Sözleşmesi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Yemek Sözleşmesi</CardTitle>
                <CardDescription>Öğrenci yemek sözleşmesi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contractDate">Sözleşme Tarihi</Label>
                    <Input
                      id="contractDate"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mealPeriods">Ödeme Dönemleri</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {['eylül', 'ekim', 'kasım', 'aralık', 'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', '1.dönem', '2.dönem', 'tüm yıl'].map((period) => (
                        <label key={period} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2"
                            onChange={(e) => {
                              const currentPeriods = otherContractData.mealPeriods || []
                              if (e.target.checked) {
                                setOtherContractData({ ...otherContractData, mealPeriods: [...currentPeriods, period] })
                              } else {
                                setOtherContractData({ ...otherContractData, mealPeriods: currentPeriods.filter(p => p !== period) })
                              }
                            }}
                          />
                          {period}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="mealPrice">Yemek Ücreti</Label>
                    <Input
                      id="mealPrice"
                      type="number"
                      value={otherContractData.mealPrice}
                      onChange={(e) => setOtherContractData({ ...otherContractData, mealPrice: e.target.value })}
                      placeholder="Örn: 2000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kitap Sözleşmesi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-600">Kitap Sözleşmesi</CardTitle>
                <CardDescription>Öğrenci kitap sözleşmesi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contractDate">Sözleşme Tarihi</Label>
                    <Input
                      id="contractDate"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="studentName">Öğrenci Ad Soyad</Label>
                      <Input
                        id="studentName"
                        value={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : ""}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentGrade">Sınıfı</Label>
                      <Input
                        id="studentGrade"
                        value={selectedStudent?.grade || ""}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bookSet">Kitap Seti</Label>
                    <Input
                      id="bookSet"
                      value={otherContractData.bookSet}
                      onChange={(e) => setOtherContractData({ ...otherContractData, bookSet: e.target.value })}
                      placeholder="Örn: 9. Sınıf Seti"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bookDeliveryDate">Teslimat Tarihi</Label>
                    <Input
                      id="bookDeliveryDate"
                      type="date"
                      value={otherContractData.bookDeliveryDate}
                      onChange={(e) => setOtherContractData({ ...otherContractData, bookDeliveryDate: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Servis Sözleşmesi */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-red-600">Servis Sözleşmesi</CardTitle>
                    <CardDescription>Öğrenci servis sözleşmesi</CardDescription>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={otherContractData.usesService}
                      onChange={(e) => setOtherContractData({ ...otherContractData, usesService: e.target.checked })}
                    />
                    Öğrenci Servis Kullanacaktır.
                  </label>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contractDate">Sözleşme Tarihi</Label>
                    <Input
                      id="contractDate"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      disabled={!otherContractData.usesService}
                      className={!otherContractData.usesService ? "bg-gray-100" : undefined}
                    />
                  </div>
                  <div>
                    <Label htmlFor="serviceRegion">Servis Bölgesi</Label>
                    <select
                      id="serviceRegion"
                      value={otherContractData.serviceRegion}
                      onChange={(e) => setOtherContractData({ ...otherContractData, serviceRegion: e.target.value })}
                      className="w-full h-11 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-900 transition-all duration-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none cursor-pointer"
                      disabled={!otherContractData.usesService}
                    >
                      <option value="">Bölge seçin...</option>
                      <option value="1.bölge">1. Bölge</option>
                      <option value="2.bölge">2. Bölge</option>
                      <option value="3.bölge">3. Bölge</option>
                      <option value="4.bölge">4. Bölge</option>
                      <option value="5.bölge">5. Bölge</option>
                      <option value="6.bölge">6. Bölge</option>
                      <option value="çayeli">Çayeli</option>
                      <option value="pazar/ardeşen">Pazar/Ardeşen</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="studentAddress">Adres</Label>
                    <Input
                      id="studentAddress"
                      value={selectedStudent?.address || ""}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="servicePrice">Servis Ücreti - Dönemlik</Label>
                    <Input
                      id="servicePrice"
                      type="number"
                      value={otherContractData.servicePrice}
                      onChange={(e) => setOtherContractData({ ...otherContractData, servicePrice: e.target.value })}
                      placeholder="Örn: 800"
                      disabled={!otherContractData.usesService}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kulüp Seçimi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-indigo-600">Kulüp Seçimi (En fazla 3 kulüp)</CardTitle>
                <CardDescription>Öğrenci kulüp seçimi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clubs.map((club: { id: string; name: string; selections?: unknown[]; capacity?: number }) => {
                    const isSelected = otherContractData.selectedClubs?.includes(club.id)
                    const currentSelections = club.selections?.length || 0
                    const capacity = club.capacity || 0
                    const isFull = currentSelections >= capacity
                    const capacityPercentage = (currentSelections / capacity) * 100
                    
                    return (
                      <label 
                        key={club.id} 
                        className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                          isFull && !isSelected 
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                            : isSelected
                            ? 'bg-blue-50 border-blue-500'
                            : 'hover:bg-gray-50 border-gray-200 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            className="mr-3"
                            checked={isSelected}
                            onChange={(e) => {
                              const currentClubs = otherContractData.selectedClubs || []
                              if (e.target.checked && currentClubs.length < 3) {
                                setOtherContractData({ ...otherContractData, selectedClubs: [...currentClubs, club.id] })
                              } else if (!e.target.checked) {
                                setOtherContractData({ ...otherContractData, selectedClubs: currentClubs.filter(c => c !== club.id) })
                              }
                            }}
                            disabled={(otherContractData.selectedClubs?.length >= 3 && !isSelected) || (isFull && !isSelected)}
                          />
                          <div className="flex-1">
                            <span className={`font-medium ${isFull && !isSelected ? 'text-gray-400' : 'text-gray-900'}`}>
                              {club.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {currentSelections}/{capacity}
                              </span>
                              {isFull && !isSelected && (
                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                  DOLU
                                </span>
                              )}
                              {capacityPercentage >= 80 && capacityPercentage < 100 && (
                                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                  AZ YER
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {otherContractData.selectedClubs?.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    Seçilen kulüpler: {otherContractData.selectedClubs.map(clubId => 
                      clubs.find(c => c.id === clubId)?.name
                    ).join(", ")}
                  </div>
                )}
                <div className="mt-4">
                  <Button 
                    onClick={handleSaveClubSelections} 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={!otherContractData.selectedClubs?.length}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Kulüp Seçimlerini Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Kaydet ve PDF İndir Butonları */}
            <div className="flex gap-2">
              <Button onClick={handleSaveAllContracts} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                Tüm Sözleşmeleri Kaydet
              </Button>
              <Button onClick={handleDownloadCombinedPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Tüm Sözleşmeleri PDF İndir
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}