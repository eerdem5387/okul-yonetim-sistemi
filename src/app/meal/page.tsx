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
}

export default function MealPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [contractData, setContractData] = useState({
    mealPeriods: [] as string[],
    mealPrice: ""
  })

  useEffect(() => {
    fetchStudents()
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

  const handleSaveContract = async () => {
    if (!selectedStudent) return

    try {
      const response = await fetch("/api/meal-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          contractData: {
            studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            tcNumber: selectedStudent.tcNumber,
            mealPeriods: contractData.mealPeriods,
            mealPrice: contractData.mealPrice
          }
        })
      })

      if (response.ok) {
        alert("Yemek sözleşmesi başarıyla kaydedildi!")
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
      const response = await fetch(`/api/pdf/meal/${selectedStudent.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractData: {
            studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            tcNumber: selectedStudent.tcNumber,
            mealPeriods: contractData.mealPeriods,
            mealPrice: contractData.mealPrice
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `yemek-sozlesmesi-${selectedStudent.firstName}-${selectedStudent.lastName}.pdf`
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
        <h1 className="text-3xl font-bold text-gray-900">Yemek Sözleşmesi</h1>
        <p className="text-gray-600 mt-2">Öğrenci yemek sözleşmesini oluşturun</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Yemek Sözleşmesi</CardTitle>
            <CardDescription>
              {selectedStudent 
                ? `${selectedStudent.firstName} ${selectedStudent.lastName} için yemek sözleşmesi oluşturuluyor`
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