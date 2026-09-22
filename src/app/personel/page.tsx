"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"
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
  Loader2,
  Briefcase,
  Eye,
  MessageSquare,
  Archive,
  ArrowLeft,
  UserMinus,
} from "lucide-react"
import { getAuthHeaders } from "@/components/hr/hr-utils"

type StaffDepartment =
  | "OGRETMEN"
  | "OGRENCI_ISLERI"
  | "MUDUR"
  | "MUDUR_YARDIMCISI"
  | "KURUCU"
  | "REHBERLIK"
  | "BAS_REHBERLIK"
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
  KURUCU: "Kurucu",
  REHBERLIK: "Rehberlik",
  BAS_REHBERLIK: "Baş Rehberlik",
  MUHASEBE: "Muhasebe",
  GUZEL_SANATLAR: "Güzel Sanatlar",
  SPOR: "Spor",
  KUTUPHANE: "Kütüphane",
  TEKNIK: "Teknik Personel",
  TEMIZLIK: "Temizlik",
  GUVENLIK: "Güvenlik",
  DIGER: "Diğer",
}

export default function PersonelPage() {
  const { success, error } = useToast()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [listMode, setListMode] = useState<"active" | "former">("active")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalStaff, setTotalStaff] = useState(0)
  const [formerCount, setFormerCount] = useState(0)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    tcNumber: "",
    email: "",
    phone: "",
    department: "OGRETMEN" as StaffDepartment,
    position: "",
    subject: "",
    isActive: true,
    hireDate: "",
    notes: "",
  })

  const fetchFormerCount = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "1",
        isActive: "false",
      })
      const response = await fetch(`/api/staff?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setFormerCount(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error("Error fetching former staff count:", err)
    }
  }, [])

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
        isActive: listMode === "active" ? "true" : "false",
      })

      if (searchTerm) params.append("search", searchTerm)
      if (selectedDepartment !== "all") params.append("department", selectedDepartment)

      const response = await fetch(`/api/staff?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        const staffArray = Array.isArray(data.staff) ? data.staff : (Array.isArray(data) ? data : [])
        setStaff(staffArray)
        setTotalStaff(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
        if (listMode === "former") {
          setFormerCount(data.pagination?.total || 0)
        }
      } else {
        setStaff([])
      }
    } catch (err) {
      console.error("Error fetching staff:", err)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, selectedDepartment, listMode])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  useEffect(() => {
    if (listMode === "active") {
      fetchFormerCount()
    }
  }, [listMode, fetchFormerCount])

  const switchListMode = (mode: "active" | "former") => {
    setListMode(mode)
    setCurrentPage(1)
    setSearchTerm("")
    setSelectedDepartment("all")
    setShowForm(false)
    setEditingStaff(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validasyon
    if (!formData.firstName.trim()) {
      error("Ad alanı zorunludur!")
      return
    }
    if (!formData.lastName.trim()) {
      error("Soyad alanı zorunludur!")
      return
    }
    if (!formData.tcNumber || formData.tcNumber.length !== 11) {
      error("TC Kimlik No 11 haneli olmalıdır!")
      return
    }

    setSubmitting(true)
    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : "/api/staff"
      const method = editingStaff ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const isEdit = !!editingStaff
        const becameFormer = isEdit && editingStaff.isActive && !formData.isActive
        const becameActive = isEdit && !editingStaff.isActive && formData.isActive
        success(
          isEdit
            ? becameFormer
              ? "Personel eski personellere taşındı."
              : becameActive
                ? "Personel tekrar aktifleştirildi."
                : "Personel başarıyla güncellendi!"
            : "Personel başarıyla eklendi!"
        )
        await fetchStaff()
        if (listMode === "active") await fetchFormerCount()
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
          isActive: true,
          hireDate: "",
          notes: "",
        })
      } else {
        const errorData = await response.json()
        error(errorData.error || "Personel kaydedilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error saving staff:", err)
      error("Personel kaydedilirken bir hata oluştu!")
    } finally {
      setSubmitting(false)
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
      isActive: staffMember.isActive,
      hireDate: staffMember.hireDate ? staffMember.hireDate.split("T")[0] : "",
      notes: staffMember.notes || "",
    })
    setShowForm(true)
  }

  const handleDeactivate = async (staffId: string) => {
    const staffMember = staff.find((s) => s.id === staffId)
    const staffName = staffMember
      ? `${staffMember.firstName} ${staffMember.lastName}`
      : ""

    if (
      !confirm(
        `"${staffName}" personelini listeden kaldırmak istiyor musunuz?\n\nKayıt silinmez; Eski Personeller bölümüne taşınır.`
      )
    ) {
      return
    }

    setDeactivatingId(staffId)
    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...staffMember, isActive: false }),
      })

      if (response.ok) {
        success("Personel eski personellere taşındı.")
        await fetchStaff()
        await fetchFormerCount()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Personel taşınırken hata oluştu!")
      }
    } catch (err) {
      console.error("Error deactivating staff:", err)
      error("Personel taşınırken bir hata oluştu!")
    } finally {
      setDeactivatingId(null)
    }
  }

  const handleReactivate = async (staffId: string) => {
    const staffMember = staff.find((s) => s.id === staffId)
    const staffName = staffMember
      ? `${staffMember.firstName} ${staffMember.lastName}`
      : ""

    if (
      !confirm(
        `"${staffName}" personelini tekrar aktifleştirmek istiyor musunuz?`
      )
    ) {
      return
    }

    setDeactivatingId(staffId)
    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...staffMember, isActive: true }),
      })

      if (response.ok) {
        success("Personel tekrar aktifleştirildi.")
        await fetchStaff()
        await fetchFormerCount()
      } else {
        const errorData = await response.json()
        error(errorData.error || "Personel aktifleştirilirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error reactivating staff:", err)
      error("Personel aktifleştirilirken bir hata oluştu!")
    } finally {
      setDeactivatingId(null)
    }
  }

  const handleDelete = async (staffId: string) => {
    const staffMember = staff.find((s) => s.id === staffId)
    const staffName = staffMember
      ? `${staffMember.firstName} ${staffMember.lastName}`
      : ""

    if (
      !confirm(
        `"${staffName}" personelini kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`
      )
    ) {
      return
    }

    setDeletingId(staffId)
    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        success("Personel kalıcı olarak silindi!")
        await fetchStaff()
        if (listMode === "former") {
          setFormerCount((c) => Math.max(0, c - 1))
        } else {
          await fetchFormerCount()
        }
      } else {
        const errorData = await response.json()
        error(errorData.error || "Personel silinirken hata oluştu!")
      }
    } catch (err) {
      console.error("Error deleting staff:", err)
      error("Personel silinirken bir hata oluştu!")
    } finally {
      setDeletingId(null)
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
    const staffArray = Array.isArray(staff) ? staff : []
    return {
      total: totalStaff,
      teachers: staffArray.filter((s) => s.department === "OGRETMEN").length,
      byDepartment: Object.keys(departmentLabels).reduce((acc, dept) => {
        acc[dept] = staffArray.filter((s) => s.department === dept).length
        return acc
      }, {} as Record<string, number>),
    }
  }, [staff, totalStaff])

  const isFormerView = listMode === "former"

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative">      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            {isFormerView ? "Eski Personeller" : "Personel Yönetimi"}
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
            {isFormerView
              ? "Okuldan ayrılan personel kayıtları — veriler korunur"
              : "Okul personelini yönetin ve kayıt altına alın"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {isFormerView ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => switchListMode("active")}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Aktif Personeller
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => switchListMode("former")}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Archive className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Eski Personeller
                {formerCount > 0 && (
                  <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-700">
                    {formerCount}
                  </span>
                )}
              </Button>
              <Link
                href="/personel/gorusmeler"
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-gray-200 bg-white px-3 text-xs font-medium hover:bg-gray-50 sm:w-auto sm:text-sm"
              >
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Personel Görüşmeler
              </Link>
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
            </>
          )}
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              {isFormerView ? "Eski Personel" : "Aktif Personel"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <div
              className={`text-xl sm:text-2xl font-bold ${
                isFormerView ? "text-amber-700" : "text-green-600"
              }`}
            >
              {stats.total}
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
            <p className="text-[10px] text-gray-400 mt-1">Bu sayfadaki</p>
          </CardContent>
        </Card>
        {!isFormerView ? (
          <Card
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => switchListMode("former")}
          >
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Eski Personeller
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-amber-700">
                {formerCount}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Görüntülemek için tıkla</p>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => switchListMode("active")}
          >
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Aktif Personellere Dön
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="text-sm font-medium text-blue-600">← Listeye dön</div>
            </CardContent>
          </Card>
        )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
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
                onChange={(e) => {
                  setSelectedDepartment(e.target.value)
                  setCurrentPage(1)
                }}
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
          </div>
          {(searchTerm || selectedDepartment !== "all") && (
            <div className="mt-3 sm:mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedDepartment("all")
                  setCurrentPage(1)
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
                      {formData.isActive
                        ? "Aktif Personel"
                        : "Eski Personel (pasif — listeden gizlenir)"}
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
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {editingStaff ? "Güncelle" : "Kaydet"}
                      </>
                    )}
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
            {isFormerView ? (
              <Archive className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            {isFormerView ? "Eski Personel Listesi" : "Aktif Personel Listesi"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500 text-xs sm:text-sm">Yükleniyor...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-xs sm:text-sm font-medium">
                {isFormerView
                  ? "Eski personel kaydı bulunmamaktadır."
                  : "Henüz aktif personel kaydı bulunmamaktadır."}
              </p>
              {!isFormerView && (
                <p className="text-gray-400 text-xs mt-1">
                  Yeni personel eklemek için &quot;Yeni Personel Ekle&quot; butonuna tıklayın.
                </p>
              )}
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
                      {isFormerView ? "Kayıt" : "Durum"}
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
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-semibold text-gray-900">
                              {staffMember.firstName} {staffMember.lastName}
                            </div>
                            <div className="lg:hidden text-[10px] sm:text-xs text-gray-500 mt-0.5">
                              TC: {staffMember.tcNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {staffMember.tcNumber}
                      </td>
                      <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium">
                          {departmentLabels[staffMember.department]}
                        </span>
                        {staffMember.subject && (
                          <div className="text-[10px] sm:text-xs text-gray-600 mt-1 font-medium">
                            {staffMember.subject}
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
                            isFormerView
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isFormerView ? "Eski" : "Aktif"}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Link
                            href={`/personel/${staffMember.id}`}
                            title="Personel Kartı"
                            className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-700"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(staffMember)}
                            title="Düzenle"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          {isFormerView ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReactivate(staffMember.id)}
                                disabled={deactivatingId === staffMember.id}
                                title="Tekrar aktifleştir"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-green-700 hover:text-green-800"
                              >
                                {deactivatingId === staffMember.id ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                ) : (
                                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(staffMember.id)}
                                disabled={deletingId === staffMember.id}
                                title="Kalıcı sil"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                {deletingId === staffMember.id ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivate(staffMember.id)}
                              disabled={deactivatingId === staffMember.id}
                              title="Eski personellere taşı"
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-amber-700 hover:text-amber-800"
                            >
                              {deactivatingId === staffMember.id ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                              ) : (
                                <UserMinus className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          )}
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
            <span className="font-medium">{totalPages}</span> (
            {totalStaff} {isFormerView ? "eski" : "aktif"} personel)
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

