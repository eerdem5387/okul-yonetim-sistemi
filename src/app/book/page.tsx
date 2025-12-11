"use client"

import { useState, useEffect, useCallback } from "react"
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
}

export default function BookPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [contractData, setContractData] = useState({
    bookSet: "",
    bookDeliveryDate: ""
  })

  const fetchStudents = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleSaveContract = async () => {
    if (!selectedStudent) return

    try {
      const response = await fetch("/api/book-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          contractData: {
            studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            tcNumber: selectedStudent.tcNumber,
            grade: selectedStudent.grade,
            bookSet: contractData.bookSet,
            deliveryDate: contractData.bookDeliveryDate
          }
        })
      })

      if (response.ok) {
        alert("Kitap sözleşmesi başarıyla kaydedildi!")
      } else {
        alert("Sözleşme kaydedilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving contract:", error)
      alert("Sözleşme kaydedilirken hata oluştu!")
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedStudent) return

    try {
      const response = await fetch(`/api/pdf/book/${selectedStudent.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractData: {
            studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            tcNumber: selectedStudent.tcNumber,
            grade: selectedStudent.grade,
            bookSet: contractData.bookSet,
            deliveryDate: contractData.bookDeliveryDate
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `kitap-sozlesmesi-${selectedStudent.firstName}-${selectedStudent.lastName}.pdf`
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
    <div className="p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Kitap Sözleşmesi</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">Öğrenci kitap sözleşmesini oluşturun</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">Kitap Sözleşmesi</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {selectedStudent 
                ? `${selectedStudent.firstName} ${selectedStudent.lastName} için kitap sözleşmesi oluşturuluyor`
                : "Önce bir öğrenci seçin"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {/* Öğrenci Seçimi */}
              <div className="mb-4 sm:mb-6">
                <Label htmlFor="studentSelect" className="text-xs sm:text-sm">Öğrenci Seçin *</Label>
                <select
                  id="studentSelect"
                  value={selectedStudent?.id || ""}
                  onChange={(e) => {
                    const student = students.find(s => s.id === e.target.value)
                    setSelectedStudent(student || null)
                  }}
                  className="w-full h-9 sm:h-10 lg:h-11 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-900 transition-all duration-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-500/10 focus:outline-none cursor-pointer"
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
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Önce <a href="/students" className="text-blue-600 hover:underline">Öğrenci Yönetimi</a> sayfasından öğrenci ekleyin.
                  </p>
                )}
              </div>

              {selectedStudent && (
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Seçilen Öğrenci Bilgileri</h3>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p><strong>Ad Soyad:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                    <p><strong>TC Kimlik No:</strong> {selectedStudent.tcNumber}</p>
                    <p><strong>Sınıf:</strong> {selectedStudent.grade}</p>
                    <p><strong>Adres:</strong> {selectedStudent.address}</p>
                  </div>
                </div>
              )}

              {selectedStudent ? (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label htmlFor="contractDate" className="text-xs sm:text-sm">Sözleşme Tarihi</Label>
                    <Input
                      id="contractDate"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="studentName" className="text-xs sm:text-sm">Öğrenci Ad Soyad</Label>
                      <Input
                        id="studentName"
                        value={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : ""}
                        disabled
                        className="bg-gray-100 h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentGrade" className="text-xs sm:text-sm">Sınıfı</Label>
                      <Input
                        id="studentGrade"
                        value={selectedStudent?.grade || ""}
                        disabled
                        className="bg-gray-100 h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bookSet" className="text-xs sm:text-sm">Kitap Seti</Label>
                    <Input
                      id="bookSet"
                      value={contractData.bookSet}
                      onChange={(e) => setContractData({ ...contractData, bookSet: e.target.value })}
                      placeholder="Örn: 9. Sınıf Seti"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bookDeliveryDate" className="text-xs sm:text-sm">Teslimat Tarihi</Label>
                    <Input
                      id="bookDeliveryDate"
                      type="date"
                      value={contractData.bookDeliveryDate}
                      onChange={(e) => setContractData({ ...contractData, bookDeliveryDate: e.target.value })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button onClick={handleSaveContract} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Sözleşmeyi Kaydet
                    </Button>
                    <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      PDF İndir
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-xs sm:text-sm">Lütfen bir öğrenci seçin</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}