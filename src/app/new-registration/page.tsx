"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Download, Plus } from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
}

export default function NewRegistrationPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showStudentForm, setShowStudentForm] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    tcNumber: "",
    birthDate: "",
    phone: "",
    email: "",
    address: "",
    parentName: "",
    parentPhone: "",
    parentEmail: ""
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

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newStudent = await response.json()
        setStudents([...students, newStudent])
        setSelectedStudent(newStudent)
        setShowStudentForm(false)
        setFormData({
          firstName: "",
          lastName: "",
          tcNumber: "",
          birthDate: "",
          phone: "",
          email: "",
          address: "",
          parentName: "",
          parentPhone: "",
          parentEmail: ""
        })
      }
    } catch (error) {
      console.error("Error creating student:", error)
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
          // Diğer sözleşme alanları buraya eklenecek
        }
      }

      const response = await fetch("/api/new-registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractData),
      })

      if (response.ok) {
        alert("Sözleşme başarıyla kaydedildi!")
      }
    } catch (error) {
      console.error("Error saving contract:", error)
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedStudent) return

    try {
      const response = await fetch(`/api/pdf/new-registration/${selectedStudent.id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `yeni-kayit-${selectedStudent.firstName}-${selectedStudent.lastName}.pdf`
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
        <h1 className="text-3xl font-bold text-gray-900">Yeni Kayıt Sözleşmesi</h1>
        <p className="text-gray-600 mt-2">Yeni öğrenci kayıt sözleşmesini oluşturun</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Öğrenci Seçimi */}
        <Card>
          <CardHeader>
            <CardTitle>Öğrenci Seçimi</CardTitle>
            <CardDescription>Kayıt yapılacak öğrenciyi seçin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setShowStudentForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Öğrenci
              </Button>
            </div>

            {showStudentForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Yeni Öğrenci Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Ad</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Soyad</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="tcNumber">TC Kimlik No</Label>
                      <Input
                        id="tcNumber"
                        value={formData.tcNumber}
                        onChange={(e) => setFormData({ ...formData, tcNumber: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="birthDate">Doğum Tarihi</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-posta</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="address">Adres</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="parentName">Veli Adı</Label>
                      <Input
                        id="parentName"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="parentPhone">Veli Telefon</Label>
                        <Input
                          id="parentPhone"
                          value={formData.parentPhone}
                          onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="parentEmail">Veli E-posta</Label>
                        <Input
                          id="parentEmail"
                          type="email"
                          value={formData.parentEmail}
                          onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Öğrenci Ekle</Button>
                      <Button type="button" variant="outline" onClick={() => setShowStudentForm(false)}>
                        İptal
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

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
            {selectedStudent ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-medium mb-2">Öğrenci Bilgileri</h3>
                  <p><strong>Ad Soyad:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                  <p><strong>TC Kimlik No:</strong> {selectedStudent.tcNumber}</p>
                </div>

                {/* Sözleşme alanları buraya eklenecek */}
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
                    <Label htmlFor="academicYear">Eğitim Öğretim Yılı</Label>
                    <Input
                      id="academicYear"
                      defaultValue="2024-2025"
                    />
                  </div>

                  <div>
                    <Label htmlFor="grade">Sınıf</Label>
                    <Input
                      id="grade"
                      placeholder="Örn: 9. Sınıf"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tuitionFee">Öğrenim Ücreti</Label>
                    <Input
                      id="tuitionFee"
                      type="number"
                      placeholder="0"
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
