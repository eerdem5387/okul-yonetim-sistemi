"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Plus, Edit, Trash2, Search } from "lucide-react"

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
  motherName: string
  motherTc: string
  motherPhone: string
  motherAddress: string
  motherOccupation: string
  fatherName: string
  fatherTc: string
  fatherPhone: string
  fatherAddress: string
  fatherOccupation: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    tcNumber: "",
    birthDate: "",
    grade: "",
    phone: "",
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

  const gradeOptions = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf"]

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

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(student =>
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.tcNumber.includes(searchTerm) ||
        student.grade.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [searchTerm, students])

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
      address: student.address,
      motherName: student.motherName,
      motherTc: student.motherTc,
      motherPhone: student.motherPhone,
      motherAddress: student.motherAddress,
      motherOccupation: student.motherOccupation,
      fatherName: student.fatherName,
      fatherTc: student.fatherTc,
      fatherPhone: student.fatherPhone,
      fatherAddress: student.fatherAddress,
      fatherOccupation: student.fatherOccupation
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
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
            <p className="text-gray-600 mt-2">Öğrenci bilgilerini ekleyin, düzenleyin ve yönetin</p>
          </div>
          <div className="mb-1">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium">
              Toplam Öğrenci: <span className="font-semibold">{students.length}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Öğrenci ara (ad, soyad, TC, sınıf)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={async () => {
          try {
            const res = await fetch('/api/students/export')
            if (!res.ok) throw new Error('Export failed')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'ogrenciler.xlsx'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
          } catch (e) {
            console.error('Export error:', e)
            alert('Excel dışa aktarım başarısız oldu')
          }
        }}>Excel’e Aktar</Button>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Öğrenci Ekle
        </Button>
        </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tcNumber">TC Kimlik No * <span className="text-xs text-gray-500">(11 haneli)</span></Label>
                  <Input
                    id="tcNumber"
                    value={formData.tcNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                      setFormData({ ...formData, tcNumber: value })
                    }}
                    maxLength={11}
                    placeholder="12345678901"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Sınıfı *</Label>
                  <select
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sınıf seçin...</option>
                    {gradeOptions.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="birthDate">Doğum Tarihi *</Label>
                </div>
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

              <div>
                <Label htmlFor="phone">Öğrenci Telefon <span className="text-xs text-gray-500">(5XX XXX XX XX)</span></Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormData({ ...formData, phone: value })
                  }}
                  maxLength={10}
                  placeholder="5XXXXXXXXX"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Öğrenci Anne Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="motherName">Ad Soyad</Label>
                    <Input
                      id="motherName"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherTc">TC <span className="text-xs text-gray-500">(11 haneli)</span></Label>
                    <Input
                      id="motherTc"
                      value={formData.motherTc}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setFormData({ ...formData, motherTc: value })
                      }}
                      maxLength={11}
                      placeholder="12345678901"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherPhone">Telefon <span className="text-xs text-gray-500">(5XX XXX XX XX)</span></Label>
                    <Input
                      id="motherPhone"
                      value={formData.motherPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setFormData({ ...formData, motherPhone: value })
                      }}
                      maxLength={10}
                      placeholder="5XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherOccupation">Meslek</Label>
                    <Input
                      id="motherOccupation"
                      value={formData.motherOccupation}
                      onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="motherAddress">Adres</Label>
                  <Input
                    id="motherAddress"
                    value={formData.motherAddress}
                    onChange={(e) => setFormData({ ...formData, motherAddress: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Öğrenci Baba Bilgileri</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ 
                      ...formData,
                      fatherName: formData.motherName,
                      fatherTc: formData.motherTc,
                      fatherPhone: formData.motherPhone,
                      fatherAddress: formData.motherAddress,
                      fatherOccupation: formData.motherOccupation
                    })}
                    className="text-xs"
                  >
                    Anne Bilgilerini Kopyala
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fatherName">Ad Soyad</Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherTc">TC <span className="text-xs text-gray-500">(11 haneli)</span></Label>
                    <Input
                      id="fatherTc"
                      value={formData.fatherTc}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setFormData({ ...formData, fatherTc: value })
                      }}
                      maxLength={11}
                      placeholder="12345678901"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherPhone">Telefon <span className="text-xs text-gray-500">(5XX XXX XX XX)</span></Label>
                    <Input
                      id="fatherPhone"
                      value={formData.fatherPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setFormData({ ...formData, fatherPhone: value })
                      }}
                      maxLength={10}
                      placeholder="5XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherOccupation">Meslek</Label>
                    <Input
                      id="fatherOccupation"
                      value={formData.fatherOccupation}
                      onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="fatherAddress">Adres</Label>
                  <Input
                    id="fatherAddress"
                    value={formData.fatherAddress}
                    onChange={(e) => setFormData({ ...formData, fatherAddress: e.target.value })}
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
                }}>
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci</th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TC</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anne</th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anne Tel</th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baba</th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baba Tel</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(student)}>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="lg:hidden text-xs text-gray-500 mt-1">
                        TC: {student.tcNumber}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.tcNumber}
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.grade}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {student.address}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.motherName}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a href={`tel:${student.motherPhone}`} className="text-blue-600 hover:underline">
                        {student.motherPhone}
                      </a>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.fatherName}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a href={`tel:${student.fatherPhone}`} className="text-blue-600 hover:underline">
                        {student.fatherPhone}
                      </a>
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(student)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Arama kriterlerinize uygun öğrenci bulunamadı." : "Henüz öğrenci eklenmemiş."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
