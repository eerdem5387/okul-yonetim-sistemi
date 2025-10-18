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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Kitap Sözleşmesi</h1>
        <p className="text-gray-600 mt-2">Öğrenci kitap sözleşmesini oluşturun</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Kitap Sözleşmesi</CardTitle>
            <CardDescription>
              {selectedStudent 
                ? `${selectedStudent.firstName} ${selectedStudent.lastName} için kitap sözleşmesi oluşturuluyor`
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

                  <div className="flex gap-2">
                    <Button onClick={handleSaveContract}>
                      <Save className="h-4 w-4 mr-2" />
                      Sözleşmeyi Kaydet
                    </Button>
                    <Button onClick={handleDownloadPDF} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      PDF İndir
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Lütfen bir öğrenci seçin</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}