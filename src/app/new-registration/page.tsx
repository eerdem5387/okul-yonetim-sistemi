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
}

export default function NewRegistrationPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [clubs, setClubs] = useState<{id: string, name: string}[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // Sözleşme form verileri
  const [contractData, setContractData] = useState({
    // Yeni Kayıt Sözleşmesi
    academicYear: "2024-2025",
    grade: "",
    tuitionFee: "",
    
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
          type: "new-registration",
          data: {
            studentId: selectedStudent.id,
            contractData: {
              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              tcNumber: selectedStudent.tcNumber,
              academicYear: contractData.academicYear,
              grade: contractData.grade,
              tuitionFee: contractData.tuitionFee
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
              uniformSize: contractData.uniformSize,
              uniformPrice: contractData.uniformPrice,
              deliveryDate: contractData.uniformDeliveryDate
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
              mealType: contractData.mealType,
              mealPrice: contractData.mealPrice,
              startDate: contractData.mealStartDate
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
              bookSet: contractData.bookSet,
              bookPrice: contractData.bookPrice,
              deliveryDate: contractData.bookDeliveryDate
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
              route: contractData.serviceRoute,
              servicePrice: contractData.servicePrice,
              pickupTime: contractData.servicePickupTime
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
      // Tüm sözleşmeleri tek PDF'de birleştir
      const response = await fetch(`/api/pdf/combined/${selectedStudent.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractTypes: ["new-registration", "uniform", "meal", "book", "service"],
          contractData: contractData
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
        <h1 className="text-3xl font-bold text-gray-900">Yeni Kayıt Sözleşmesi</h1>
        <p className="text-gray-600 mt-2">Yeni öğrenci kayıt sözleşmesini oluşturun</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Sözleşme Detayları */}
        <Card>
          <CardHeader>
            <CardTitle>Yeni Kayıt Sözleşmesi</CardTitle>
            <CardDescription>
              {selectedStudent 
                ? `${selectedStudent.firstName} ${selectedStudent.lastName} için sözleşme oluşturuluyor`
                : "Önce bir öğrenci seçin"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Öğrenci Seçimi */}
              <div className="mb-6">
                <Label htmlFor="studentSelect">Öğrenci Seçin *</Label>
                <select
                  id="studentSelect"
                  value={selectedStudent?.id || ""}
                  onChange={(e) => {
                    const student = students.find(s => s.id === e.target.value)
                    setSelectedStudent(student || null)
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
                </div>
              )}

              {selectedStudent ? (
                <div className="space-y-4">

                {/* Yeni Kayıt Sözleşmesi */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-blue-600">Yeni Kayıt Sözleşmesi</h3>
                  <div>
                    <Label htmlFor="contractDate">Sözleşme Tarihi</Label>
                    <Input
                      id="contractDate"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="academicYear">Eğitim Öğretim Yılı</Label>
                    <Input
                      id="academicYear"
                      value={contractData.academicYear}
                      onChange={(e) => setContractData({ ...contractData, academicYear: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="grade">Sınıf</Label>
                    <Input
                      id="grade"
                      value={contractData.grade}
                      onChange={(e) => setContractData({ ...contractData, grade: e.target.value })}
                      placeholder="Örn: 9. Sınıf"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tuitionFee">Öğrenim Ücreti</Label>
                    <Input
                      id="tuitionFee"
                      type="number"
                      value={contractData.tuitionFee}
                      onChange={(e) => setContractData({ ...contractData, tuitionFee: e.target.value })}
                      placeholder="Örn: 50000"
                    />
                  </div>
                </div>

                {/* Forma Sözleşmesi */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-green-600">Forma Sözleşmesi</h3>
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
                        value={contractData.uniformSize}
                        onChange={(e) => setContractData({ ...contractData, uniformSize: e.target.value })}
                        placeholder="Örn: M, L, XL"
                      />
                    </div>
                    <div>
                      <Label htmlFor="uniformPrice">Forma Ücreti</Label>
                      <Input
                        id="uniformPrice"
                        type="number"
                        value={contractData.uniformPrice}
                        onChange={(e) => setContractData({ ...contractData, uniformPrice: e.target.value })}
                        placeholder="Örn: 500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="uniformDeliveryDate">Teslimat Tarihi</Label>
                    <Input
                      id="uniformDeliveryDate"
                      type="date"
                      value={contractData.uniformDeliveryDate}
                      onChange={(e) => setContractData({ ...contractData, uniformDeliveryDate: e.target.value })}
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
                              const currentItems = contractData.uniformItems || []
                              if (e.target.checked) {
                                setContractData({ ...contractData, uniformItems: [...currentItems, item] })
                              } else {
                                setContractData({ ...contractData, uniformItems: currentItems.filter(i => i !== item) })
                              }
                            }}
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Yemek Sözleşmesi */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-orange-600">Yemek Sözleşmesi</h3>
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
                              const currentPeriods = contractData.mealPeriods || []
                              if (e.target.checked) {
                                setContractData({ ...contractData, mealPeriods: [...currentPeriods, period] })
                              } else {
                                setContractData({ ...contractData, mealPeriods: currentPeriods.filter(p => p !== period) })
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
                      value={contractData.mealPrice}
                      onChange={(e) => setContractData({ ...contractData, mealPrice: e.target.value })}
                      placeholder="Örn: 2000"
                    />
                  </div>
                </div>

                {/* Kitap Sözleşmesi */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-purple-600">Kitap Sözleşmesi</h3>
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
                      value={contractData.bookSet}
                      onChange={(e) => setContractData({ ...contractData, bookSet: e.target.value })}
                      placeholder="Örn: 9. Sınıf Seti"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bookDeliveryDate">Teslimat Tarihi</Label>
                    <Input
                      id="bookDeliveryDate"
                      type="date"
                      value={contractData.bookDeliveryDate}
                      onChange={(e) => setContractData({ ...contractData, bookDeliveryDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Servis Sözleşmesi */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-red-600">Servis Sözleşmesi</h3>
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
                      value={contractData.serviceRegion}
                      onChange={(e) => setContractData({ ...contractData, serviceRegion: e.target.value })}
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
                      value={contractData.servicePrice}
                      onChange={(e) => setContractData({ ...contractData, servicePrice: e.target.value })}
                      placeholder="Örn: 800"
                    />
                  </div>
                </div>

                {/* Kulüp Seçimi */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-indigo-600">Kulüp Seçimi (En fazla 3 kulüp)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {clubs.map((club) => (
                      <label key={club.id} className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2"
                          onChange={(e) => {
                            const currentClubs = contractData.selectedClubs || []
                            if (e.target.checked && currentClubs.length < 3) {
                              setContractData({ ...contractData, selectedClubs: [...currentClubs, club.id] })
                            } else if (!e.target.checked) {
                              setContractData({ ...contractData, selectedClubs: currentClubs.filter(c => c !== club.id) })
                            }
                          }}
                          disabled={contractData.selectedClubs?.length >= 3 && !contractData.selectedClubs?.includes(club.id)}
                        />
                        {club.name}
                      </label>
                    ))}
                  </div>
                  {contractData.selectedClubs?.length > 0 && (
                    <div className="text-sm text-gray-600">
                      Seçilen kulüpler: {contractData.selectedClubs.map(clubId => 
                        clubs.find(c => c.id === clubId)?.name
                      ).join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveAllContracts}>
                    <Save className="h-4 w-4 mr-2" />
                    Tüm Sözleşmeleri Kaydet
                  </Button>
                  <Button onClick={handleDownloadCombinedPDF} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Tüm Sözleşmeleri PDF İndir
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Lütfen bir öğrenci seçin</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
