"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  Users,
  Mail,
  Phone,
} from "lucide-react"

type StaffDepartment =
  | "OGRETMEN"
  | "OGRENCI_ISLERI"
  | "MUDUR"
  | "MUDUR_YARDIMCISI"
  | "REHBERLIK"
  | "MUHASEBE"
  | "GUZEL_SANATLAR"
  | "SPOR"
  | "KUTUPHANE"
  | "TEKNIK"
  | "TEMIZLIK"
  | "GUVENLIK"
  | "DIGER"

interface Staff {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  email: string | null
  phone: string | null
  department: StaffDepartment
  position: string | null
  subject: string | null
  grades: string[]
  isActive: boolean
  hireDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const departmentLabels: Record<StaffDepartment, string> = {
  OGRETMEN: "Öğretmen",
  OGRENCI_ISLERI: "Öğrenci İşleri",
  MUDUR: "Müdür",
  MUDUR_YARDIMCISI: "Müdür Yardımcısı",
  REHBERLIK: "Rehberlik",
  MUHASEBE: "Muhasebe",
  GUZEL_SANATLAR: "Güzel Sanatlar",
  SPOR: "Spor",
  KUTUPHANE: "Kütüphane",
  TEKNIK: "Teknik Personel",
  TEMIZLIK: "Temizlik",
  GUVENLIK: "Güvenlik",
  DIGER: "Diğer",
}

const gradeOptions = [
  "5. Sınıf",
  "6. Sınıf",
  "7. Sınıf",
  "8. Sınıf",
  "9. Sınıf",
  "10. Sınıf",
  "11. Sınıf",
  "12. Sınıf",
]

export default function PersonelPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalStaff, setTotalStaff] = useState(0)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    tcNumber: "",
    email: "",
    phone: "",
    department: "OGRETMEN" as StaffDepartment,
    position: "",
    subject: "",
    grades: [] as string[],
    isActive: true,
    hireDate: "",
    notes: "",
  })

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
      })

      if (searchTerm) params.append("search", searchTerm)
      if (selectedDepartment !== "all") params.append("department", selectedDepartment)
      if (activeFilter !== "all") params.append("isActive", activeFilter)

      const response = await fetch(`/api/staff?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff || [])
        setTotalStaff(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error("Error fetching staff:", error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, selectedDepartment, activeFilter])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : "/api/staff"
      const method = editingStaff ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          grades: formData.grades,
        }),
      })

      if (response.ok) {
        fetchStaff()
        setShowForm(false)
        setEditingStaff(null)
        setFormData({
          firstName: "",
          lastName: "",
          tcNumber: "",
          email: "",
          phone: "",
          department: "OGRETMEN",
          position: "",
          subject: "",
          grades: [],
          isActive: true,
          hireDate: "",
          notes: "",
        })
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Personel kaydedilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving staff:", error)
      alert("Personel kaydedilirken hata oluştu!")
    }
  }

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember)
    setFormData({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      tcNumber: staffMember.tcNumber,
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      department: staffMember.department,
      position: staffMember.position || "",
      subject: staffMember.subject || "",
      grades: staffMember.grades || [],
      isActive: staffMember.isActive,
      hireDate: staffMember.hireDate ? staffMember.hireDate.split("T")[0] : "",
      notes: staffMember.notes || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (staffId: string) => {
    if (!confirm("Bu personeli silmek istediğinizden emin misiniz?")) {
      return
    }

    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchStaff()
      } else {
        alert("Personel silinirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error deleting staff:", error)
      alert("Personel silinirken hata oluştu!")
    }
  }

  const capitalizeWords = (text: string): string => {
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const stats = useMemo(() => {
    return {
      total: totalStaff,
      active: staff.filter((s) => s.isActive).length,
      teachers: staff.filter((s) => s.department === "OGRETMEN").length,
      byDepartment: Object.keys(departmentLabels).reduce((acc, dept) => {
        acc[dept] = staff.filter((s) => s.department === dept).length
        return acc
      }, {} as Record<string, number>),
    }
  }, [staff, totalStaff])

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Personel Yönetimi
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
            Okul personelini yönetin ve kayıt altına alın
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingStaff(null)
            setFormData({
              firstName: "",
              lastName: "",
              tcNumber: "",
              email: "",
              phone: "",
              department: "OGRETMEN",
              position: "",
              subject: "",
              grades: [],
              isActive: true,
              hireDate: "",
              notes: "",
            })
          }}
          size="sm"
          className="w-full sm:w-auto text-xs sm:text-sm"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Yeni Personel Ekle
        </Button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              Toplam Personel
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              Aktif Personel
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              Öğretmenler
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {stats.teachers}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              Pasif Personel
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {stats.total - stats.active}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            Filtreleme ve Arama
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="search" className="text-xs sm:text-sm">
                Arama
              </Label>
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Ad, soyad, TC, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="department" className="text-xs sm:text-sm">
                Bölüm
              </Label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 border border-input bg-background rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Bölümler</option>
                {Object.entries(departmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="activeFilter" className="text-xs sm:text-sm">
                Durum
              </Label>
              <select
                id="activeFilter"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 border border-input bg-background rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tümü</option>
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
          </div>
          {(searchTerm || selectedDepartment !== "all" || activeFilter !== "all") && (
            <div className="mt-3 sm:mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedDepartment("all")
                  setActiveFilter("all")
                }}
                className="text-xs sm:text-sm"
              >
                Filtreleri Temizle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personel Formu Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg lg:text-xl">
                  {editingStaff ? "Personel Düzenle" : "Yeni Personel Ekle"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setEditingStaff(null)
                    setFormData({
                      firstName: "",
                      lastName: "",
                      tcNumber: "",
                      email: "",
                      phone: "",
                      department: "OGRETMEN",
                      position: "",
                      subject: "",
                      grades: [],
                      isActive: true,
                      hireDate: "",
                      notes: "",
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-xs sm:text-sm">
                      Ad *
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          firstName: capitalizeWords(e.target.value),
                        })
                      }
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs sm:text-sm">
                      Soyad *
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastName: capitalizeWords(e.target.value),
                        })
                      }
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="tcNumber" className="text-xs sm:text-sm">
                      TC Kimlik No *{" "}
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        (11 haneli)
                      </span>
                    </Label>
                    <Input
                      id="tcNumber"
                      value={formData.tcNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 11)
                        setFormData({ ...formData, tcNumber: value })
                      }}
                      maxLength={11}
                      placeholder="12345678901"
                      required
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department" className="text-xs sm:text-sm">
                      Bölüm *
                    </Label>
                    <select
                      id="department"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          department: e.target.value as StaffDepartment,
                        })
                      }
                      required
                      className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 border border-input bg-background rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(departmentLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="email" className="text-xs sm:text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs sm:text-sm">
                      Telefon
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                        setFormData({ ...formData, phone: value })
                      }}
                      maxLength={10}
                      placeholder="5XXXXXXXXX"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="position" className="text-xs sm:text-sm">
                      Pozisyon
                    </Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData({ ...formData, position: e.target.value })
                      }
                      placeholder="Örn: Müdür, Sınıf Öğretmeni..."
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  {formData.department === "OGRETMEN" && (
                    <div>
                      <Label htmlFor="subject" className="text-xs sm:text-sm">
                        Branş/Ders
                      </Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) =>
                          setFormData({ ...formData, subject: e.target.value })
                        }
                        placeholder="Örn: Matematik, Türkçe..."
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  )}
                </div>

                {formData.department === "OGRETMEN" && (
                  <div>
                    <Label className="text-xs sm:text-sm mb-2 block">
                      Hangi Sınıfları Öğretiyor?
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {gradeOptions.map((grade) => (
                        <label
                          key={grade}
                          className="flex items-center gap-2 text-xs sm:text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.grades.includes(grade)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  grades: [...formData.grades, grade],
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  grades: formData.grades.filter((g) => g !== grade),
                                })
                              }
                            }}
                            className="h-3 w-3 sm:h-4 sm:w-4"
                          />
                          {grade}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="hireDate" className="text-xs sm:text-sm">
                      İşe Başlama Tarihi
                    </Label>
                    <Input
                      id="hireDate"
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) =>
                        setFormData({ ...formData, hireDate: e.target.value })
                      }
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6 sm:pt-8">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="h-3 w-3 sm:h-4 sm:w-4"
                    />
                    <Label htmlFor="isActive" className="text-xs sm:text-sm cursor-pointer">
                      Aktif Personel
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-xs sm:text-sm">
                    Notlar
                  </Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Ek notlar..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button type="submit" size="sm" className="flex-1 sm:flex-initial text-xs sm:text-sm">
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {editingStaff ? "Güncelle" : "Kaydet"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(false)
                      setEditingStaff(null)
                      setFormData({
                        firstName: "",
                        lastName: "",
                        tcNumber: "",
                        email: "",
                        phone: "",
                        department: "OGRETMEN",
                        position: "",
                        subject: "",
                        grades: [],
                        isActive: true,
                        hireDate: "",
                        notes: "",
                      })
                    }}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personel Listesi */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Personel Listesi
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          {loading ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-xs sm:text-sm">
              Yükleniyor...
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-xs sm:text-sm px-4">
              Henüz personel kaydı bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Personel
                    </th>
                    <th className="hidden lg:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TC
                    </th>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bölüm
                    </th>
                    <th className="hidden md:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pozisyon
                    </th>
                    <th className="hidden lg:table-cell px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İletişim
                    </th>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.map((staffMember) => (
                    <tr
                      key={staffMember.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {staffMember.firstName} {staffMember.lastName}
                        </div>
                        <div className="lg:hidden text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                          TC: {staffMember.tcNumber}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {staffMember.tcNumber}
                      </td>
                      <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4">
                        <span className="text-xs sm:text-sm text-gray-900">
                          {departmentLabels[staffMember.department]}
                        </span>
                        {staffMember.subject && (
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            {staffMember.subject}
                          </div>
                        )}
                        {staffMember.grades && staffMember.grades.length > 0 && (
                          <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                            Sınıflar: {staffMember.grades.join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {staffMember.position || "-"}
                      </td>
                      <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <div className="space-y-1">
                          {staffMember.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-xs">{staffMember.email}</span>
                            </div>
                          )}
                          {staffMember.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <a
                                href={`tel:${staffMember.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {staffMember.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                            staffMember.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {staffMember.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(staffMember)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(staffMember.id)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Sayfa <span className="font-medium">{currentPage}</span> /{" "}
            <span className="font-medium">{totalPages}</span> ({totalStaff} personel)
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-xs sm:text-sm"
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

