"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Users, Clock, TrendingUp, GraduationCap, List } from "lucide-react"
import { useRouter } from "next/navigation"

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
  
  // İstatistikler
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    sinifStats: {} as Record<string, number>,
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
    announcedServiceFee: string
    announcedBookFee: string
    announcedStudyHallFee: string
    announcedTotal: string
    studentTuitionFee: string
    studentClothingFee: string
    studentCourseFee: string
    studentServiceFee: string
    studentBookFee: string
    studentStudyHallFee: string
    studentTotal: string
    parentSignature: string
    contractDate: string
    registrarName: string
    registrarSignature: string
    serviceRegion: string
    servicePrice: string
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
    announcedServiceFee: "",
    announcedBookFee: "",
    announcedStudyHallFee: "",
    announcedTotal: "",
    
    // Ödeme Bilgileri - Öğrenci İçin Belirlenen Ücretler
    studentTuitionFee: "",
    studentClothingFee: "",
    studentCourseFee: "",
    studentServiceFee: "",
    studentBookFee: "",
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
    serviceRegion: "",
    servicePrice: "",
    
    // Öğretim Yılı ve Ödeme Planı
    academicYear: "",
    paymentPlan: ""
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
            sinifStats: data.sinifStats || {}
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
  }, [fetchStats])

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
    // Öğrenci bilgilerini kontrol et - zorunlu alanlar
    if (!studentFormData.firstName || !studentFormData.lastName || !studentFormData.tcNumber || !studentFormData.grade || !studentFormData.birthDate) {
      alert("⚠️ Lütfen öğrenci bilgilerini eksiksiz doldurun!\n\nZorunlu alanlar:\n- Ad\n- Soyad\n- TC Kimlik No\n- Doğum Tarihi\n- Sınıf")
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

    // TC numarası kontrolü
    if (studentFormData.tcNumber.length !== 11 || !/^\d+$/.test(studentFormData.tcNumber)) {
      alert("⚠️ TC Kimlik Numarası 11 haneli olmalı ve sadece rakamlardan oluşmalıdır!")
      return
    }

    try {
      // Önce öğrenciyi oluştur (yeni kayıt için her zaman yeni öğrenci oluşturulur)
      let studentId = createdStudentId
      
      if (!studentId) {
        // Yeni öğrenci oluştur
        const studentResponse = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(studentFormData)
        })

        if (!studentResponse.ok) {
          const errorData = await studentResponse.json()
          // TC numarası zaten varsa özel mesaj
          if (errorData.error && errorData.error.includes("TC") && errorData.error.includes("unique")) {
            alert("⚠️ Bu TC Kimlik Numarası ile kayıtlı bir öğrenci zaten mevcut!\n\nLütfen TC numarasını kontrol edin veya 'Kayıt Yenileme' sayfasını kullanın.")
          } else {
            alert(errorData.error || "Öğrenci oluşturulurken hata oluştu!")
          }
          return
        }

        const newStudent = await studentResponse.json()
        // API response formatı: { success: true, student: {...} } veya direkt student objesi
        studentId = newStudent.student?.id || newStudent.id
        if (!studentId) {
          alert("⚠️ Öğrenci oluşturuldu ancak ID alınamadı!")
          return
        }
        setCreatedStudentId(studentId)
      }

      // Sonra sözleşmeleri kaydet
      const contracts = [
        {
          type: "new-registration",
          data: {
            studentId: studentId,
            contractData: {
              ...mainContractData,
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
              uniformItems: otherContractData.uniformItems
            }
          }
        },
        {
          type: "book",
          data: {
            studentId: studentId,
            contractData: {
              studentName: `${studentFormData.firstName} ${studentFormData.lastName}`,
              tcNumber: studentFormData.tcNumber,
              bookSet: otherContractData.bookSet,
              deliveryDate: otherContractData.bookDeliveryDate
            }
          }
        },
        {
          type: "service",
          data: {
            studentId: studentId,
            contractData: {
              studentName: `${studentFormData.firstName} ${studentFormData.lastName}`,
              tcNumber: studentFormData.tcNumber,
              serviceRegion: otherContractData.serviceRegion,
              servicePrice: otherContractData.servicePrice,
              address: studentFormData.address
            }
          }
        }
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
              return `${contracts[index].type}: ${errorData.error || errorData.details || "Bilinmeyen hata"}`
            }
            return null
          })
        )
        const errorMessages = errorDetails.filter(msg => msg !== null)
        alert(`⚠️ Sözleşmeler kaydedilirken hata oluştu!\n\n${errorMessages.join("\n")}`)
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
            "book",
            ...(otherContractData.usesService ? ["service"] : [])
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
                    <Label htmlFor="birthDate">Doğum Tarihi *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={studentFormData.birthDate}
                      onChange={(e) => {
                        setStudentFormData({ ...studentFormData, birthDate: e.target.value })
                        setMainContractData(prev => ({ ...prev, studentBirthDate: e.target.value }))
                      }}
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
                      {[5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                        <option key={grade} value={grade.toString()}>
                          {grade}. Sınıf
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
                        value={`${studentFormData.firstName} ${studentFormData.lastName}`}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentGrade">Sınıfı</Label>
                      <Input
                        id="studentGrade"
                        value={studentFormData.grade}
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
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      value={studentFormData.address}
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
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={handleDownloadCombinedPDF} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Tüm Sözleşmeleri PDF İndir
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}