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

export default function MealPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  const handleSaveContract = async () => {
    if (!selectedStudent) return

    try {
      const contractData = {
        studentId: selectedStudent.id,
        contractData: {
          studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
          tcNumber: selectedStudent.tcNumber,
        }
      }

      const response = await fetch("/api/meal-contracts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractData),
      })

      if (response.ok) {
        alert("Yemek sözleşmesi başarıyla kaydedildi!")
      }
    } catch (error) {
      console.error("Error saving contract:", error)
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedStudent) return

    try {
      const response = await fetch(`/api/pdf/meal/${selectedStudent.id}`)
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Öğrenci Seçimi</CardTitle>
            <CardDescription>Yemek sözleşmesi yapılacak öğrenciyi seçin</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Mevcut Öğrenciler</Label>
              <div className="mt-2 space-y-2">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedStudent?.id === student.id ? "bg-blue-50 border-blue-500" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="font-medium">{student.firstName} {student.lastName}</div>
                    <div className="text-sm text-gray-500">TC: {student.tcNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yemek Sözleşmesi</CardTitle>
            <CardDescription>
              {selectedStudent 
                ? `${selectedStudent.firstName} ${selectedStudent.lastName} için sözleşme oluşturuluyor`
                : "Önce bir öğrenci seçin"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedStudent ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-medium mb-2">Öğrenci Bilgileri</h3>
                  <p><strong>Ad Soyad:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                  <p><strong>TC Kimlik No:</strong> {selectedStudent.tcNumber}</p>
                </div>

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
                    <Label htmlFor="mealType">Yemek Türü</Label>
                    <Input
                      id="mealType"
                      placeholder="Öğle yemeği, Kahvaltı, vb."
                    />
                  </div>

                  <div>
                    <Label htmlFor="mealPrice">Yemek Ücreti</Label>
                    <Input
                      id="mealPrice"
                      type="number"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="startDate">Başlangıç Tarihi</Label>
                    <Input
                      id="startDate"
                      type="date"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveContract}>
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
