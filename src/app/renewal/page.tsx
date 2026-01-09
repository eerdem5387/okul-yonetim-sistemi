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
    registrationDate: new Date().toISOString().split("T")[0],
    
    // Sözleşme Metni
    contractStudentName: "",
    contractParentName: "",
    
    // Ödeme Bilgileri - Kurumun İlan Ettiği Ücretler
    announcedTuitionFee: "",
    announcedClothingFee: "",
    announcedCourseFee: "",
    announcedBookFee: "",
    announcedStudyHallFee: "",
    announcedTotal: "",
    
    // Ödeme Bilgileri - Öğrenci İçin Belirlenen Ücretler
    studentTuitionFee: "",
    studentClothingFee: "",
    studentCourseFee: "",
    studentBookFee: "",
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
    serviceRegion: "",
    servicePrice: ""
  })

  // Diğer Sözleşme Form Verileri
  const [otherContractData, setOtherContractData] = useState({
    // Forma Sözleşmesi
    uniformSize: "",
    uniformPrice: "",
    uniformDeliveryDate: "",
    uniformItems: [] as string[],
    
    // Kitap Sözleşmesi
    bookSet: "",
    bookDeliveryDate: "",
    
    // Servis Sözleşmesi
    usesService: false as boolean,
    serviceRegion: "",
    servicePrice: ""
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          
          const requestBody = contract.data
          
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

    if (!mainContractData.schoolLicenseNo) {
      alert("⚠️ Okul ruhsat no seçmelisiniz!")
      return
    }

    if (!mainContractData.academicYear) {
      alert("⚠️ Eğitim öğretim yılı seçmelisiniz!")
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
            "book",
            ...(otherContractData.usesService ? ["service"] : [])
          ],
          mainContractData: mainContractData,
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
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <h3 className="text-lg font-semibold">ÖDEME BİLGİLERİ (</h3>
                        <select
                          value={mainContractData.academicYear}
                          onChange={(e) => setMainContractData({ ...mainContractData, academicYear: e.target.value })}
                          className="w-40 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">Seçiniz</option>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = 2025 + i
                            return (
                              <option key={year} value={`${year}-${year + 1}`}>
                                {year}-{year + 1}
                              </option>
                            )
                          })}
                        </select>
                        <h3 className="text-lg font-semibold">Öğretim Yılı İçin)</h3>
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
                            parseFloat(mainContractData.announcedBookFee) || 0,
                            parseFloat(mainContractData.announcedStudyHallFee) || 0
                          ]
                          const student = [
                            parseFloat(mainContractData.studentTuitionFee) || 0,
                            parseFloat(mainContractData.studentClothingFee) || 0,
                            parseFloat(mainContractData.studentCourseFee) || 0,
                            parseFloat(mainContractData.studentBookFee) || 0,
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
                    <h3 className="text-lg font-semibold">Ödeme Planı</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        "İŞBANK KREDİ KARTI 2+4 TAKSİT",
                        "ZİRAATBANK KREDİ KARTI 2+8 TAKSİT",
                        "YAPIKREDİ KREDİ KARTI 3 TAKSİT",
                        "AKBANK KREDİ KARTI 2+8+4 TAKSİT",
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
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
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


            {/* Kaydet ve PDF İndir Butonları */}
            <div className="flex gap-2">
              <Button onClick={handleDownloadCombinedPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Tüm Sözleşmeleri PDF İndir ve Kaydet
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}