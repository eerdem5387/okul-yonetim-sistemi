"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Plus, Edit, Trash2 } from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  birthDate: string
  grade: string
  phone?: string
  email?: string
  address: string
  parentName: string
  parentPhone: string
  parentEmail: string
  parent2Name?: string
  parent2Phone?: string
  parent2Email?: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    tcNumber: "",
    birthDate: "",
    grade: "",
    phone: "",
    email: "",
    address: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parent2Name: "",
    parent2Phone: "",
    parent2Email: ""
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : "/api/students"
      const method = editingStudent ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchStudents()
        setShowForm(false)
        setEditingStudent(null)
        setFormData({
          firstName: "",
          lastName: "",
          tcNumber: "",
          birthDate: "",
          grade: "",
          phone: "",
          email: "",
          address: "",
          parentName: "",
          parentPhone: "",
          parentEmail: "",
          parent2Name: "",
          parent2Phone: "",
          parent2Email: ""
        })
        alert(editingStudent ? "Öğrenci başarıyla güncellendi!" : "Öğrenci başarıyla eklendi!")
      } else {
        alert(editingStudent ? "Öğrenci güncellenirken hata oluştu!" : "Öğrenci eklenirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving student:", error)
    }
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      tcNumber: student.tcNumber,
      birthDate: student.birthDate,
      grade: student.grade,
      phone: student.phone || "",
      email: student.email || "",
      address: student.address,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      parent2Name: student.parent2Name || "",
      parent2Phone: student.parent2Phone || "",
      parent2Email: student.parent2Email || ""
    })
    setShowForm(true)
  }

  const handleDelete = async (studentId: string) => {
    if (confirm("Bu öğrenciyi silmek istediğinizden emin misiniz?")) {
      try {
        const response = await fetch(`/api/students/${studentId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          fetchStudents()
          alert("Öğrenci başarıyla silindi!")
        } else {
          alert("Öğrenci silinirken hata oluştu!")
        }
      } catch (error) {
        console.error("Error deleting student:", error)
      }
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
        <p className="text-gray-600 mt-2">Öğrenci bilgilerini ekleyin, düzenleyin ve yönetin</p>
      </div>

      <div className="mb-6">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Öğrenci Ekle
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingStudent ? "Öğrenci Düzenle" : "Yeni Öğrenci Ekle"}</CardTitle>
            <CardDescription>
              {editingStudent ? "Öğrenci bilgilerini güncelleyin" : "Yeni öğrenci bilgilerini girin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Öğrenci Adı *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Öğrenci Soyadı *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tcNumber">TC Kimlik No *</Label>
                  <Input
                    id="tcNumber"
                    value={formData.tcNumber}
                    onChange={(e) => setFormData({ ...formData, tcNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Sınıfı *</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="Örn: 9. Sınıf"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="birthDate">Doğum Tarihi *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Adres *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Öğrenci Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Öğrenci E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">1. Veli Bilgileri *</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parentName">1. Veli Ad Soyad *</Label>
                    <Input
                      id="parentName"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="parentPhone">1. Veli Telefon *</Label>
                    <Input
                      id="parentPhone"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="parentEmail">1. Veli E-posta *</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">2. Veli Bilgileri (İsteğe Bağlı)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parent2Name">2. Veli Ad Soyad</Label>
                    <Input
                      id="parent2Name"
                      value={formData.parent2Name}
                      onChange={(e) => setFormData({ ...formData, parent2Name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent2Phone">2. Veli Telefon</Label>
                    <Input
                      id="parent2Phone"
                      value={formData.parent2Phone}
                      onChange={(e) => setFormData({ ...formData, parent2Phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="parent2Email">2. Veli E-posta</Label>
                  <Input
                    id="parent2Email"
                    type="email"
                    value={formData.parent2Email}
                    onChange={(e) => setFormData({ ...formData, parent2Email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingStudent ? "Güncelle" : "Kaydet"}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false)
                  setEditingStudent(null)
                  setFormData({
                    firstName: "",
                    lastName: "",
                    tcNumber: "",
                    birthDate: "",
                    grade: "",
                    phone: "",
                    email: "",
                    address: "",
                    parentName: "",
                    parentPhone: "",
                    parentEmail: "",
                    parent2Name: "",
                    parent2Phone: "",
                    parent2Email: ""
                  })
                }}>
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <Card key={student.id}>
            <CardHeader>
              <CardTitle className="text-lg">{student.firstName} {student.lastName}</CardTitle>
              <CardDescription>TC: {student.tcNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Sınıf:</strong> {student.grade}</p>
                <p><strong>Adres:</strong> {student.address}</p>
                <p><strong>1. Veli:</strong> {student.parentName}</p>
                <p><strong>Telefon:</strong> {student.parentPhone}</p>
                {student.parent2Name && (
                  <p><strong>2. Veli:</strong> {student.parent2Name}</p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(student)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(student.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
