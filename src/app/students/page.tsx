"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Plus, Edit, Trash2, Search, X, ArrowUp } from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  birthDate: string
  grade: string
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
  announcedTuitionFee?: string | null
  studentTuitionFee?: string | null
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalStudents, setTotalStudents] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [confirmPromote, setConfirmPromote] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    tcNumber: "",
    birthDate: "",
    grade: "",
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
    fatherOccupation: "",
    announcedTuitionFee: "",
    studentTuitionFee: ""
  })

  const gradeOptions = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Mezun"]

  // Kullanıcı rolünü kontrol et
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      setUserRole(role)
    }
  }, [])

  // Her kelimenin ilk harfini büyük, diğerlerini küçük yapan fonksiyon
  const capitalizeWords = (text: string): string => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const fetchStudents = useCallback(async (page: number = 1, search: string = "", grade: string = "") => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10"
      })
      if (search.trim()) {
        params.append("search", search.trim())
      }
      if (grade.trim()) {
        params.append("grade", grade.trim())
      }
      
      const response = await fetch(`/api/students?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      if (data.students && data.pagination) {
        setStudents(data.students)
        setTotalPages(data.pagination.totalPages)
        setTotalStudents(data.pagination.total)
      } else {
        // Fallback: eski format (array)
        setStudents(Array.isArray(data) ? data : [])
        setTotalPages(1)
        setTotalStudents(Array.isArray(data) ? data.length : 0)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
      setTotalPages(1)
      setTotalStudents(0)
    }
  }, [])

  // İlk yükleme
  useEffect(() => {
    fetchStudents(1, "", selectedGrade)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Arama veya sınıf filtresi değiştiğinde ilk sayfaya dön
  useEffect(() => {
    setCurrentPage(1)
    fetchStudents(1, searchTerm, selectedGrade)
  }, [searchTerm, selectedGrade, fetchStudents])

  // Sayfa değiştiğinde
  useEffect(() => {
    if (currentPage > 0) {
      fetchStudents(currentPage, searchTerm, selectedGrade)
    }
  }, [currentPage, fetchStudents, searchTerm, selectedGrade])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : "/api/students"
      const method = editingStudent ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole || "",
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
          fatherOccupation: "",
          announcedTuitionFee: "",
          studentTuitionFee: ""
        })
        alert(editingStudent ? "Öğrenci başarıyla güncellendi!" : "Öğrenci başarıyla eklendi!")
        // Listeyi yenile
        fetchStudents(currentPage, searchTerm, selectedGrade)
      } else {
        alert(editingStudent ? "Öğrenci güncellenirken hata oluştu!" : "Öğrenci eklenirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving student:", error)
    }
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    // Doğum tarihini YYYY-MM-DD formatına çevir
    let birthDateFormatted = ""
    if (student.birthDate) {
      try {
        const date = new Date(student.birthDate)
        if (!isNaN(date.getTime())) {
          birthDateFormatted = date.toISOString().split('T')[0]
        }
      } catch (e) {
        console.error("Date parse error:", e)
      }
    }
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      tcNumber: student.tcNumber,
      birthDate: birthDateFormatted,
      grade: student.grade,
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
      fatherOccupation: student.fatherOccupation,
      announcedTuitionFee: student.announcedTuitionFee || "",
      studentTuitionFee: student.studentTuitionFee || ""
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
          fetchStudents(currentPage, searchTerm, selectedGrade)
          alert("Öğrenci başarıyla silindi!")
        } else {
          alert("Öğrenci silinirken hata oluştu!")
        }
      } catch (error) {
        console.error("Error deleting student:", error)
      }
    }
  }

  const handlePromoteAll = async () => {
    try {
      const response = await fetch("/api/students/promote-all", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || "Öğrenciler başarıyla yükseltildi!")
        fetchStudents(currentPage, searchTerm, selectedGrade)
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Öğrenciler yükseltilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error promoting students:", error)
      alert("Öğrenciler yükseltilirken hata oluştu!")
    } finally {
      setConfirmPromote(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">Öğrenci bilgilerini ekleyin, düzenleyin ve yönetin</p>
          </div>
          <div className="mb-1 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs sm:text-sm font-medium">
              {selectedGrade ? (
                <>
                  <span className="font-semibold truncate">{selectedGrade}</span> <span className="hidden sm:inline">Öğrenci Sayısı:</span> <span className="sm:hidden">:</span> <span className="font-semibold">{totalStudents}</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Toplam Öğrenci:</span> <span className="sm:hidden">Toplam:</span> <span className="font-semibold">{totalStudents}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-2 items-stretch sm:items-center w-full sm:min-w-[300px]">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
            <Input
              placeholder="Öğrenci ara (ad, soyad, TC, sınıf)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>
          <div className="flex-shrink-0 w-full sm:w-auto">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full sm:w-auto h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tüm Sınıflar</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {confirmPromote ? (
          <>
            <Button type="button" variant="destructive" size="sm" onClick={handlePromoteAll} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Eminim, Yükselt</span>
              <span className="sm:hidden">Yükselt</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmPromote(false)} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              İptal
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmPromote(true)} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Sınıf Yükselt</span>
            <span className="sm:hidden">Yükselt</span>
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={async () => {
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
        }} className="flex-1 sm:flex-initial text-xs sm:text-sm">
          <span className="hidden sm:inline">Excel&apos;e Aktar</span>
          <span className="sm:hidden">Excel</span>
        </Button>
        <Button onClick={() => setShowForm(true)} size="sm" className="flex-1 sm:flex-initial text-xs sm:text-sm">
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Yeni Öğrenci Ekle</span>
          <span className="sm:hidden">Yeni Ekle</span>
        </Button>
        </div>
      </div>

      {/* Modal Overlay */}
      {showForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" 
          onClick={() => {
            setShowForm(false)
            setEditingStudent(null)
            setFormData({
              firstName: "",
              lastName: "",
              tcNumber: "",
              birthDate: "",
              grade: "",
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
              fatherOccupation: "",
              announcedTuitionFee: "",
              studentTuitionFee: ""
            })
          }}
        >
          <Card 
            className="w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto bg-white shadow-2xl rounded-none sm:rounded-lg" 
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">{editingStudent ? "Öğrenci Düzenle" : "Yeni Öğrenci Ekle"}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {editingStudent ? "Öğrenci bilgilerini güncelleyin" : "Yeni öğrenci bilgilerini girin"}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setEditingStudent(null)
                    setFormData({
                      firstName: "",
                      lastName: "",
                      tcNumber: "",
                      birthDate: "",
                      grade: "",
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
                      fatherOccupation: "",
                      announcedTuitionFee: "",
                      studentTuitionFee: ""
                    })
                  }}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-xs sm:text-sm">Öğrenci Adı *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: capitalizeWords(e.target.value) })}
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs sm:text-sm">Öğrenci Soyadı *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: capitalizeWords(e.target.value) })}
                    required
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="tcNumber" className="text-xs sm:text-sm">TC Kimlik No * <span className="text-[10px] sm:text-xs text-gray-500">(11 haneli)</span></Label>
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
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="grade" className="text-xs sm:text-sm">Sınıfı *</Label>
                  <select
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 border border-input bg-background rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
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
                  <Label htmlFor="birthDate" className="text-xs sm:text-sm">Doğum Tarihi *</Label>
                </div>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-xs sm:text-sm">Adres *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Öğrenci Anne Bilgileri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="motherName" className="text-xs sm:text-sm">Ad Soyad</Label>
                    <Input
                      id="motherName"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: capitalizeWords(e.target.value) })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherTc" className="text-xs sm:text-sm">TC <span className="text-[10px] sm:text-xs text-gray-500">(11 haneli)</span></Label>
                    <Input
                      id="motherTc"
                      value={formData.motherTc}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setFormData({ ...formData, motherTc: value })
                      }}
                      maxLength={11}
                      placeholder="12345678901"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherPhone" className="text-xs sm:text-sm">Telefon <span className="text-[10px] sm:text-xs text-gray-500">(5XX XXX XX XX)</span></Label>
                    <Input
                      id="motherPhone"
                      value={formData.motherPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setFormData({ ...formData, motherPhone: value })
                      }}
                      maxLength={10}
                      placeholder="5XXXXXXXXX"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherOccupation" className="text-xs sm:text-sm">Meslek</Label>
                    <Input
                      id="motherOccupation"
                      value={formData.motherOccupation}
                      onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 sm:mt-4">
                  <Label htmlFor="motherAddress" className="text-xs sm:text-sm">Adres</Label>
                  <Input
                    id="motherAddress"
                    value={formData.motherAddress}
                    onChange={(e) => setFormData({ ...formData, motherAddress: e.target.value })}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold">Öğrenci Baba Bilgileri</h3>
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
                    className="text-xs sm:text-sm w-full sm:w-auto"
                  >
                    Anne Bilgilerini Kopyala
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="fatherName" className="text-xs sm:text-sm">Ad Soyad</Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: capitalizeWords(e.target.value) })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherTc" className="text-xs sm:text-sm">TC <span className="text-[10px] sm:text-xs text-gray-500">(11 haneli)</span></Label>
                    <Input
                      id="fatherTc"
                      value={formData.fatherTc}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setFormData({ ...formData, fatherTc: value })
                      }}
                      maxLength={11}
                      placeholder="12345678901"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherPhone" className="text-xs sm:text-sm">Telefon <span className="text-[10px] sm:text-xs text-gray-500">(5XX XXX XX XX)</span></Label>
                    <Input
                      id="fatherPhone"
                      value={formData.fatherPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setFormData({ ...formData, fatherPhone: value })
                      }}
                      maxLength={10}
                      placeholder="5XXXXXXXXX"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherOccupation" className="text-xs sm:text-sm">Meslek</Label>
                    <Input
                      id="fatherOccupation"
                      value={formData.fatherOccupation}
                      onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 sm:mt-4">
                  <Label htmlFor="fatherAddress" className="text-xs sm:text-sm">Adres</Label>
                  <Input
                    id="fatherAddress"
                    value={formData.fatherAddress}
                    onChange={(e) => setFormData({ ...formData, fatherAddress: e.target.value })}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Öğrenim Ücreti - Sadece Admin */}
              {userRole === "admin" && (
                <div className="border-t pt-3 sm:pt-4">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Öğrenim Ücreti</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="announcedTuitionFee" className="text-xs sm:text-sm">Kurumun İlan Ettiği Ücret</Label>
                      <Input
                        id="announcedTuitionFee"
                        type="text"
                        value={formData.announcedTuitionFee}
                        onChange={(e) => setFormData({ ...formData, announcedTuitionFee: e.target.value })}
                        placeholder="Örn: 50.000 TL"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentTuitionFee" className="text-xs sm:text-sm">Öğrenci İçin Belirlenen Ücret</Label>
                      <Input
                        id="studentTuitionFee"
                        type="text"
                        value={formData.studentTuitionFee}
                        onChange={(e) => setFormData({ ...formData, studentTuitionFee: e.target.value })}
                        placeholder="Örn: 45.000 TL"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button type="submit" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {editingStudent ? "Güncelle" : "Kaydet"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setShowForm(false)
                  setEditingStudent(null)
                  setFormData({
                    firstName: "",
                    lastName: "",
                    tcNumber: "",
                    birthDate: "",
                    grade: "",
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
                    fatherOccupation: "",
                    announcedTuitionFee: "",
                    studentTuitionFee: ""
                  })
                }} className="w-full sm:w-auto text-xs sm:text-sm">
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci</th>
                  <th className="hidden lg:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TC</th>
                  <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                  <th className="hidden md:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                  <th className="hidden lg:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anne</th>
                  <th className="hidden md:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anne Tel</th>
                  <th className="hidden lg:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baba</th>
                  <th className="hidden md:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baba Tel</th>
                  <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(student)}>
                    <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="lg:hidden text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                        TC: {student.tcNumber}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {student.tcNumber}
                    </td>
                    <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {student.grade}
                    </td>
                    <td className="hidden md:table-cell px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 max-w-xs truncate">
                      {student.address}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {student.motherName}
                    </td>
                    <td className="hidden md:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      <a href={`tel:${student.motherPhone}`} className="text-blue-600 hover:underline">
                        {student.motherPhone}
                      </a>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {student.fatherName}
                    </td>
                    <td className="hidden md:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      <a href={`tel:${student.fatherPhone}`} className="text-blue-600 hover:underline">
                        {student.fatherPhone}
                      </a>
                    </td>
                    <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                      <div className="flex gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(student)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(student.id)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm px-4">
                {searchTerm ? "Arama kriterlerinize uygun öğrenci bulunamadı." : "Henüz öğrenci eklenmemiş."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
            Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
            {(searchTerm || selectedGrade) && (
              <span className="ml-1 sm:ml-2 text-gray-500 block sm:inline mt-1 sm:mt-0">
                ({searchTerm && selectedGrade ? 'Arama ve Filtre' : searchTerm ? 'Arama' : 'Filtre'} sonuçları: {totalStudents} öğrenci)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-xs sm:text-sm"
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="text-xs sm:text-sm"
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
