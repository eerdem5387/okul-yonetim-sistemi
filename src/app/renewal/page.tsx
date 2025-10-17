"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Download } from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  address: string
  birthDate: string
  parentName: string
  parentPhone: string
  parentEmail: string
  parent2Name?: string
  parent2Phone?: string
  parent2Email?: string
}

export default function RenewalPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [clubs, setClubs] = useState<{id: string, name: string}[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

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
    installmentDetails: "",
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
    registrationDate: "",
    registrarSignature: ""
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
    serviceRegion: "",
    servicePrice: "",
    
    // Kulüp Seçimi
    selectedClubs: [] as string[]
  })

  useEffect(() => {
    fetchStudents()
    fetchClubs()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    }
  }

  const fetchClubs = async () => {
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
              studentBirthDate: selectedStudent.birthDate,
              contractStudentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              contractParentName: selectedStudent.parentName
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
        {
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
        }
      ]

      // Tüm sözleşmeleri kaydet
      const responses = await Promise.all(
        contracts.map(contract => 
          fetch(`/api/${contract.type}-contracts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contract.data)
          })
        )
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
    if (!selectedStudent) return

    try {
      const response = await fetch(`/api/pdf/combined/${selectedStudent.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractTypes: ["renewal", "uniform", "meal", "book", "service"],
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
      } else {
        alert("PDF oluşturulurken hata oluştu!")
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Kayıt Yenileme Sözleşmesi</h1>
        <p className="text-gray-600 mt-2">Öğrenci kayıt yenileme sözleşmesini oluşturun</p>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Öğrenci Seçimi */}
        <Card>
          <CardHeader>
            <CardTitle>Öğrenci Seçimi</CardTitle>
            <CardDescription>Kayıt yenileme yapılacak öğrenciyi seçin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Label htmlFor="studentSelect">Öğrenci Seçin *</Label>
              <select
                id="studentSelect"
                value={selectedStudent?.id || ""}
                onChange={(e) => {
                  const student = students.find(s => s.id === e.target.value)
                  setSelectedStudent(student || null)
                  if (student) {
                    setMainContractData(prev => ({
                      ...prev,
                      studentName: `${student.firstName} ${student.lastName}`,
                      studentTC: student.tcNumber,
                      studentClass: student.grade,
                      studentBirthDate: student.birthDate,
                      contractStudentName: `${student.firstName} ${student.lastName}`,
                      contractParentName: student.parentName
                    }))
                  }
                }}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Öğrenci seçin...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} - {student.tcNumber} - {student.grade}
                  </option>
                ))}
              </select>
              {!students.length && (
                <p className="text-sm text-gray-500 mt-1">
                  Önce <a href="/students" className="text-blue-600 hover:underline">Öğrenci Yönetimi</a> sayfasından öğrenci ekleyin.
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
                <p><strong>1. Veli:</strong> {selectedStudent.parentName} ({selectedStudent.parentPhone})</p>
                {selectedStudent.parent2Name && <p><strong>2. Veli:</strong> {selectedStudent.parent2Name} ({selectedStudent.parent2Phone})</p>}
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
                        onChange={(e) => setMainContractData({ ...mainContractData, registrationResponsible: e.target.value })}
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
                    <h3 className="text-lg font-semibold">ÖDEME BİLGİLERİ (2024-2025 Öğretim Yılı İçin)</h3>
                    
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
                      <div>
                        <Label htmlFor="installmentDetails">Taksit Sayısı ve Tutarı</Label>
                        <Input
                          id="installmentDetails"
                          value={mainContractData.installmentDetails}
                          onChange={(e) => setMainContractData({ ...mainContractData, installmentDetails: e.target.value })}
                          placeholder="Örn: 10 taksit x 5000 TL"
                        />
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
                <CardTitle className="text-red-600">Servis Sözleşmesi</CardTitle>
                <CardDescription>Öğrenci servis sözleşmesi</CardDescription>
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
                    <Label htmlFor="serviceRegion">Servis Bölgesi</Label>
                    <select
                      id="serviceRegion"
                      value={otherContractData.serviceRegion}
                      onChange={(e) => setOtherContractData({ ...otherContractData, serviceRegion: e.target.value })}
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <div className="grid grid-cols-2 gap-2">
                  {clubs.map((club) => (
                    <label key={club.id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        onChange={(e) => {
                          const currentClubs = otherContractData.selectedClubs || []
                          if (e.target.checked && currentClubs.length < 3) {
                            setOtherContractData({ ...otherContractData, selectedClubs: [...currentClubs, club.id] })
                          } else if (!e.target.checked) {
                            setOtherContractData({ ...otherContractData, selectedClubs: currentClubs.filter(c => c !== club.id) })
                          }
                        }}
                        disabled={otherContractData.selectedClubs?.length >= 3 && !otherContractData.selectedClubs?.includes(club.id)}
                      />
                      {club.name}
                    </label>
                  ))}
                </div>
                {otherContractData.selectedClubs?.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    Seçilen kulüpler: {otherContractData.selectedClubs.map(clubId => 
                      clubs.find(c => c.id === clubId)?.name
                    ).join(", ")}
                  </div>
                )}
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