"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, ExternalLink } from "lucide-react"
import Link from "next/link"

interface ContractData {
  // Öğrenci ve Sözleşme Bilgileri
  studentName: string
  studentClass: string
  studentTC: string
  studentBirthDate: string
  schoolLicenseNo: string
  contractNo: string
  registrationResponsible: string
  registrationDate: string
  
  // Sözleşme Metni
  contractStudentName: string
  contractParentName: string
  
  // Ödeme Bilgileri - Kurumun İlan Ettiği Ücretler
  announcedTuitionFee: string
  announcedClothingFee: string
  announcedCourseFee: string
  announcedStudyHallFee: string
  announcedTotal: string
  
  // Ödeme Bilgileri - Öğrenci İçin Belirlenen Ücretler
  studentTuitionFee: string
  studentClothingFee: string
  studentCourseFee: string
  studentStudyHallFee: string
  studentTotal: string
  
  // Ödeme Planı ve Muacceliyet
  academicYear: string
  paymentPlan: string
  paymentDueDate: string
  
  // İmza ve Tarih
  parentSignature: string
  contractDate: string
  registrarName: string
  registrarSignature: string
}

interface OtherContractData {
  uniformSize: string
  uniformPrice: string
  uniformDeliveryDate: string
  uniformItems: string[]
  paymentReceived: boolean
  paymentNotReceived: boolean
}

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

export default function EditNewRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const pathname = usePathname()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [otherContractData, setOtherContractData] = useState<OtherContractData>({
    uniformSize: "",
    uniformPrice: "",
    uniformDeliveryDate: "",
    uniformItems: [],
    paymentReceived: false,
    paymentNotReceived: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contractId, setContractId] = useState<string>("")
  const [studentId, setStudentId] = useState<string>("")
  const [studentAddress, setStudentAddress] = useState<string>("") // Öğrenci adresi için state

  // URL'den ID'yi al
  useEffect(() => {
    let isMounted = true
    
    const extractIdFromPath = async () => {
      try {
        const pathId = pathname?.split('/').pop() || ""
        let id = pathId
        if (!id || id === "edit-new-registration") {
          const resolvedParams = await params
          id = resolvedParams.id
        }
        
        if (id && isMounted) {
          setContract(null)
          setLoading(true)
          setContractId(id)
        }
      } catch (error) {
        console.error("[Edit New Registration] Error extracting ID:", error)
      }
    }
    
    extractIdFromPath()
    
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return ""
    try {
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

  const formatDateForDisplay = (date: string | Date | null | undefined) => {
    if (!date) return ""
    try {
      if (typeof date === "string" && date.includes('.') && date.length === 10) {
        return date
      }
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

  // Öğrencinin sınıfına göre fiyat tablosunu al
  const getPriceTableForGrade = () => {
    if (!contract) return null
    const grade = contract.studentClass
    if (!grade) return null
    return bookAndUniformPrices[grade] || null
  }

  const fetchContract = useCallback(async () => {
    if (!contractId) return
    
    try {
      setLoading(true)
      
      const response = await fetch(`/api/new-registrations/${contractId}`)
      if (!response.ok) {
        console.error("[Edit New Registration] Failed to fetch contract:", response.status)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      const fetchedStudentId = data.studentId
      if (!fetchedStudentId) {
        console.error("[Edit New Registration] Student ID not found")
        setLoading(false)
        return
      }
      setStudentId(fetchedStudentId)
      
      const studentData = data.student
      if (!studentData) {
        console.error("[Edit New Registration] Student data not found")
        setLoading(false)
        return
      }
      
      // Öğrenci adresini sakla
      setStudentAddress(studentData.address || "")
      
      const contractData = data.contractData || {}
      
      // Ana sözleşme verilerini güncelle
      const updatedContractData: ContractData = {
        studentName: contractData.studentName || `${studentData.firstName || ""} ${studentData.lastName || ""}`.trim(),
        studentClass: contractData.studentClass || studentData.grade || "",
        studentTC: contractData.studentTC || studentData.tcNumber || "",
        studentBirthDate: contractData.studentBirthDate || formatDate(studentData.birthDate),
        schoolLicenseNo: contractData.schoolLicenseNo || "",
        contractNo: contractData.contractNo || "",
        registrationResponsible: contractData.registrationResponsible || "",
        registrationDate: contractData.registrationDate || new Date().toISOString().split("T")[0],
        contractStudentName: contractData.contractStudentName || `${studentData.firstName || ""} ${studentData.lastName || ""}`.trim(),
        contractParentName: contractData.contractParentName || "",
        announcedTuitionFee: contractData.announcedTuitionFee || "",
        announcedClothingFee: contractData.announcedClothingFee || "",
        announcedCourseFee: contractData.announcedCourseFee || "",
        announcedStudyHallFee: contractData.announcedStudyHallFee || "",
        announcedTotal: contractData.announcedTotal || "",
        studentTuitionFee: contractData.studentTuitionFee || "",
        studentClothingFee: contractData.studentClothingFee || "",
        studentCourseFee: contractData.studentCourseFee || "",
        studentStudyHallFee: contractData.studentStudyHallFee || "",
        studentTotal: contractData.studentTotal || "",
        academicYear: contractData.academicYear || "",
        paymentPlan: contractData.paymentPlan || "",
        paymentDueDate: contractData.paymentDueDate || "",
        parentSignature: contractData.parentSignature || "",
        contractDate: contractData.contractDate || new Date().toISOString().split("T")[0],
        registrarName: contractData.registrarName || "",
        registrarSignature: contractData.registrarSignature || "",
      }
      
      setContract(updatedContractData)
      
      // Yan sözleşmeleri çek
      const uniformRes = await fetch(`/api/uniform-contracts?studentId=${fetchedStudentId}`)
      if (uniformRes.ok) {
        const uniforms = await uniformRes.json()
        if (uniforms.length > 0) {
          const uniformData = uniforms[0].contractData as Record<string, unknown>
          setOtherContractData({
            uniformSize: (uniformData.uniformSize as string) || "",
            uniformPrice: (uniformData.uniformPrice as string) || "",
            uniformDeliveryDate: (uniformData.deliveryDate as string) || (uniformData.uniformDeliveryDate as string) || "",
            uniformItems: Array.isArray(uniformData.uniformItems) ? (uniformData.uniformItems as string[]) : [],
            paymentReceived: (uniformData.paymentReceived as boolean) || false,
            paymentNotReceived: (uniformData.paymentNotReceived as boolean) || false,
          })
        }
      }
      
    } catch (error) {
      console.error("Error fetching contract:", error)
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    if (contractId) {
      fetchContract()
    }
  }, [contractId, fetchContract])

  const handleSave = async () => {
    if (!contract || !studentId) return
    
    setSaving(true)
    try {
      // Öğrenci bilgilerini güncelle (tüm alanlar)
      const studentNameParts = contract.studentName?.split(" ") || []
      const firstName = studentNameParts[0] || ""
      const lastName = studentNameParts.slice(1).join(" ") || ""
      
      const studentUpdateData: Record<string, unknown> = {
        firstName,
        lastName,
        tcNumber: contract.studentTC || "",
        grade: contract.studentClass || "",
        birthDate: contract.studentBirthDate || undefined,
        address: studentAddress || "", // Mevcut adresi koru
      }
      
      // Öğrenci bilgilerini güncelle
      const studentResponse = await fetch(`/api/students/${studentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentUpdateData),
      })
      
      if (!studentResponse.ok) {
        const errorData = await studentResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || "Öğrenci bilgileri güncellenirken hata oluştu"
        console.error("Error updating student:", errorMessage)
        
        // TC numarası çakışması varsa kullanıcıya açık bir mesaj göster
        if (errorData.code === "TC_NUMBER_EXISTS") {
          alert(`⚠️ TC Numarası Güncellenemedi!\n\n${errorMessage}\n\nLütfen TC numarasını kontrol edin veya önce diğer öğrencinin TC numarasını değiştirin.`)
          setSaving(false)
          return // TC numarası güncellenemediyse sözleşmeyi de kaydetme
        } else {
          // Diğer hatalar için de kullanıcıya bilgi ver
          alert(`⚠️ Öğrenci Bilgileri Güncellenemedi!\n\n${errorMessage}`)
          setSaving(false)
          return
        }
      }

      const studentData = await studentResponse.json()
      // Merge yapıldıysa sözleşme artık başka öğrenciye bağlı; tüm API çağrılarında o öğrenci id'sini kullan
      const effectiveStudentId = (studentData.merged && studentData.student?.id) ? studentData.student.id : studentId
      
      // Ana sözleşmeyi güncelle
      const response = await fetch(`/api/new-registrations/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contractData: contract }),
      })

      if (!response.ok) {
        alert("Sözleşme güncellenirken bir hata oluştu.")
        return
      }

      // Yan sözleşmeleri güncelle (uniform contract) — merge sonrası hedef öğrenci id'si kullan
      const uniformContractsRes = await fetch(`/api/uniform-contracts?studentId=${effectiveStudentId}`)
      if (uniformContractsRes.ok) {
        const uniformContracts = await uniformContractsRes.json()
        if (uniformContracts.length > 0) {
          const uniformContractId = uniformContracts[0].id
          await fetch(`/api/uniform-contracts/${uniformContractId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contractData: {
                studentName: contract.studentName,
                tcNumber: contract.studentTC,
                studentClass: contract.studentClass,
                uniformSize: otherContractData.uniformSize,
                uniformPrice: otherContractData.uniformPrice,
                deliveryDate: otherContractData.uniformDeliveryDate,
                uniformItems: otherContractData.uniformItems,
                paymentReceived: otherContractData.paymentReceived,
                paymentNotReceived: otherContractData.paymentNotReceived,
              }
            }),
          })
        } else {
          // Yan sözleşme yoksa oluştur
          await fetch(`/api/uniform-contracts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              studentId: effectiveStudentId,
              contractData: {
                studentName: contract.studentName,
                tcNumber: contract.studentTC,
                studentClass: contract.studentClass,
                uniformSize: otherContractData.uniformSize,
                uniformPrice: otherContractData.uniformPrice,
                deliveryDate: otherContractData.uniformDeliveryDate,
                uniformItems: otherContractData.uniformItems,
                paymentReceived: otherContractData.paymentReceived,
                paymentNotReceived: otherContractData.paymentNotReceived,
              }
            }),
          })
        }
      }

      if (studentData.merged) {
        alert("Sözleşme bu öğrenciye bağlandı. Listede \"2 sözleşme\" (veya ilgili sayı) olarak görünecektir.")
      } else {
        alert("Sözleşme başarıyla güncellendi!")
      }
      window.location.href = "/new-registrations/list"
    } catch (error) {
      console.error("Error updating contract:", error)
      alert("Sözleşme güncellenirken bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Yükleniyor...</div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Sözleşme bulunamadı</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/new-registrations/list">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri Dön
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Yeni Kayıt Sözleşmesi Düzenle</h1>
        </div>
        <p className="text-gray-600">Sözleşme bilgilerini düzenleyin ve kaydedin</p>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
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
                    value={contract.studentName}
                    onChange={(e) => setContract({ ...contract, studentName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="studentClass">Sınıfı</Label>
                  <Input
                    id="studentClass"
                    value={contract.studentClass}
                    onChange={(e) => setContract({ ...contract, studentClass: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="studentTC">TC</Label>
                  <Input
                    id="studentTC"
                    value={contract.studentTC}
                    onChange={(e) => setContract({ ...contract, studentTC: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="studentBirthDate">Doğum Tarihi (GG.AA.YYYY)</Label>
                  <Input
                    id="studentBirthDate"
                    type="text"
                    value={formatDateForDisplay(contract.studentBirthDate)}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '')
                      if (value.length > 8) value = value.slice(0, 8)
                      
                      let formatted = value
                      if (value.length > 2) {
                        formatted = value.slice(0, 2) + '.' + value.slice(2)
                      }
                      if (value.length > 4) {
                        formatted = value.slice(0, 2) + '.' + value.slice(2, 4) + '.' + value.slice(4)
                      }
                      
                      let isoDate = formatted
                      if (value.length === 8) {
                        const day = value.slice(0, 2)
                        const month = value.slice(2, 4)
                        const year = value.slice(4, 8)
                        isoDate = `${year}-${month}-${day}`
                      }
                      
                      setContract({ ...contract, studentBirthDate: isoDate })
                    }}
                    placeholder="GG.AA.YYYY (örn: 12.07.2016)"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label>Okul Ruhsat No</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant={contract.schoolLicenseNo === "574450" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContract({ ...contract, schoolLicenseNo: "574450" })}
                    >
                      Anadolu Lisesi
                    </Button>
                    <Button
                      type="button"
                      variant={contract.schoolLicenseNo === "574451" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContract({ ...contract, schoolLicenseNo: "574451" })}
                    >
                      Fen Lisesi
                    </Button>
                    <Button
                      type="button"
                      variant={contract.schoolLicenseNo === "574449" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContract({ ...contract, schoolLicenseNo: "574449" })}
                    >
                      Ortaokul
                    </Button>
                  </div>
                  {contract.schoolLicenseNo && (
                    <div className="mt-2 text-sm text-gray-600">
                      Seçilen Ruhsat No: <span className="font-semibold">{contract.schoolLicenseNo}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="contractNo">Sözleşme No</Label>
                  <Input
                    id="contractNo"
                    value={contract.contractNo}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label htmlFor="registrationResponsible">Kayıt/Kayıt Yenileme Sorumlusu</Label>
                  <Input
                    id="registrationResponsible"
                    value={contract.registrationResponsible}
                    onChange={(e) => setContract({ ...contract, registrationResponsible: e.target.value })}
                    placeholder="Kayıt sorumlusunun adı soyadı"
                  />
                </div>
                <div>
                  <Label htmlFor="registrationDate">Kayıt/Kayıt Yenileme Tarihi</Label>
                  <Input
                    id="registrationDate"
                    type="date"
                    value={contract.registrationDate}
                    onChange={(e) => setContract({ ...contract, registrationDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Ödeme Bilgileri */}
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <h3 className="text-lg font-semibold">ÖDEME BİLGİLERİ (</h3>
                    <select
                      value={contract.academicYear}
                      onChange={(e) => setContract({ ...contract, academicYear: e.target.value })}
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
                        parseFloat(contract.announcedTuitionFee) || 0,
                        parseFloat(contract.announcedClothingFee) || 0,
                        parseFloat(contract.announcedCourseFee) || 0,
                        parseFloat(contract.announcedStudyHallFee) || 0
                      ]
                      const student = [
                        parseFloat(contract.studentTuitionFee) || 0,
                        parseFloat(contract.studentClothingFee) || 0,
                        parseFloat(contract.studentCourseFee) || 0,
                        parseFloat(contract.studentStudyHallFee) || 0
                      ]
                      const announcedTotal = announced.reduce((a, b) => a + b, 0)
                      const studentTotal = student.reduce((a, b) => a + b, 0)
                      setContract({
                        ...contract,
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
                    value={contract.announcedTuitionFee}
                    onChange={(e) => setContract({ ...contract, announcedTuitionFee: e.target.value })}
                    placeholder="0"
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <Input
                    value={contract.studentTuitionFee}
                    onChange={(e) => setContract({ ...contract, studentTuitionFee: e.target.value })}
                    placeholder="0"
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>KIYAFET ÜCRETİ</div>
                  <Input
                    value={contract.announcedClothingFee}
                    onChange={(e) => setContract({ ...contract, announcedClothingFee: e.target.value })}
                    placeholder="0"
                  />
                  <Input
                    value={contract.studentClothingFee}
                    onChange={(e) => setContract({ ...contract, studentClothingFee: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="pl-4">Takviye Kursu Ücreti</div>
                  <Input
                    value={contract.announcedCourseFee}
                    onChange={(e) => setContract({ ...contract, announcedCourseFee: e.target.value })}
                    placeholder="0"
                  />
                  <Input
                    value={contract.studentCourseFee}
                    onChange={(e) => setContract({ ...contract, studentCourseFee: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="pl-4">Etüt Ücreti</div>
                  <Input
                    value={contract.announcedStudyHallFee}
                    onChange={(e) => setContract({ ...contract, announcedStudyHallFee: e.target.value })}
                    placeholder="0"
                  />
                  <Input
                    value={contract.studentStudyHallFee}
                    onChange={(e) => setContract({ ...contract, studentStudyHallFee: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 font-semibold">
                  <div>ÜCRETLER TOPLAMI</div>
                  <Input
                    value={contract.announcedTotal}
                    onChange={(e) => setContract({ ...contract, announcedTotal: e.target.value })}
                    placeholder="0"
                    className="font-semibold"
                  />
                  <Input
                    value={contract.studentTotal}
                    onChange={(e) => setContract({ ...contract, studentTotal: e.target.value })}
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
                      value={contract.registrationDate}
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
                        if (contract.registrationDate) {
                          const regDate = new Date(contract.registrationDate)
                          const dueDate = new Date(regDate)
                          dueDate.setDate(dueDate.getDate() + 15)
                          return dueDate.toISOString().split("T")[0]
                        }
                        return contract.paymentDueDate || ""
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
                        checked={contract.paymentPlan === plan}
                        onChange={(e) => setContract({ ...contract, paymentPlan: e.target.value })}
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
                      value={contract.contractDate}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label htmlFor="registrarName">Kaydı Yapan</Label>
                    <Input
                      id="registrarName"
                      value={contract.registrarName}
                      onChange={(e) => setContract({ ...contract, registrarName: e.target.value })}
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
                    {contract.studentClass || "Sınıf Seçilmemiş"} - Kitap ve Forma Ücret Tablosu
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

              {/* Forma Alanları */}
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

        {/* Kaydet Butonu */}
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
          <Link href="/new-registrations/list" className="flex-1">
            <Button variant="outline" className="w-full">
              İptal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
