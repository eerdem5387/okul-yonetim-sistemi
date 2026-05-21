"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Edit,
  Eye,
  Search,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import type { Trip, CreateTripData } from "@/lib/geziService"
import { canViewGezi, fetchPermissionsMe } from "@/lib/permissions/client"

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export default function OgretmenGeziYonetimiPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeTrips: 0,
    upcomingTrips: 0,
    totalApplications: 0,
    monthlyApplications: 0,
  })
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")
  const [formData, setFormData] = useState<CreateTripData>({
    title: "",
    description: "",
    extraNotes: "",
    location: "",
    startDate: "",
    endDate: "",
    price: null,
    quota: null,
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Yetki kontrolü
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const staffId = localStorage.getItem("staff_id")
      
      if (role !== "teacher" || !staffId) {
        router.push("/login")
        return
      }
      
      fetchPermissionsMe()
        .then((me) => {
          setHasAccess(canViewGezi(me))
        })
        .catch(() => {
          setHasAccess(false)
        })
    }
  }, [router])

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterActive === "active") {
        params.append("isActive", "true")
      } else if (filterActive === "inactive") {
        params.append("isActive", "false")
      }
      if (searchTerm) {
        params.append("q", searchTerm)
      }

      const response = await fetch(`/api/gezi/trips?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error("Geziler alınamadı")
      }
      const result = await response.json()
      setTrips(result.data || [])
    } catch (error) {
      console.error("Error fetching trips:", error)
      alert("Geziler yüklenirken hata oluştu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"))
      setTrips([])
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filterActive])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/gezi/trips/stats", {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error("İstatistikler alınamadı")
      }
      const result = await response.json()
      setStats(result.data || {
        totalTrips: 0,
        activeTrips: 0,
        upcomingTrips: 0,
        totalApplications: 0,
        monthlyApplications: 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [])

  useEffect(() => {
    if (hasAccess === true) {
      fetchTrips()
      fetchStats()
    }
  }, [hasAccess, fetchTrips, fetchStats])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    setSubmitting(true)

    try {
      const errors: Record<string, string> = {}
      if (!formData.title.trim()) errors.title = "Gezi adı zorunludur"
      if (!formData.location.trim()) errors.location = "Konum zorunludur"
      if (!formData.startDate) errors.startDate = "Başlangıç tarihi zorunludur"
      if (!formData.endDate) errors.endDate = "Bitiş tarihi zorunludur"
      if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
        errors.endDate = "Bitiş tarihi başlangıç tarihinden önce olamaz"
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors)
        setSubmitting(false)
        return
      }

      if (editingTrip) {
        const response = await fetch(`/api/gezi/trips/${editingTrip.id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        })
        if (!response.ok) {
          throw new Error("Gezi güncellenemedi")
        }
      } else {
        const response = await fetch("/api/gezi/trips", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        })
        if (!response.ok) {
          throw new Error("Gezi oluşturulamadı")
        }
      }

      fetchTrips()
      fetchStats()
      setShowForm(false)
      setEditingTrip(null)
      setFormData({
        title: "",
        description: "",
        extraNotes: "",
        location: "",
        startDate: "",
        endDate: "",
        price: null,
        quota: null,
        isActive: true,
      })
      setFormErrors({})
    } catch (error) {
      console.error("Error saving trip:", error)
      alert("Gezi kaydedilirken hata oluştu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip)
    setFormData({
      title: trip.title,
      description: trip.description || "",
      extraNotes: trip.extraNotes || "",
      location: trip.location,
      startDate: trip.startDate.split("T")[0],
      endDate: trip.endDate.split("T")[0],
      price: trip.price ? Number(trip.price) : null,
      quota: trip.quota || null,
      isActive: trip.isActive,
    })
    setShowForm(true)
  }

  const handleToggleActive = async (trip: Trip) => {
    try {
      const response = await fetch(`/api/gezi/trips/${trip.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !trip.isActive }),
      })
      if (!response.ok) {
        throw new Error("Gezi durumu güncellenemedi")
      }
      fetchTrips()
      fetchStats()
    } catch (error) {
      console.error("Error toggling trip:", error)
      alert("Gezi durumu güncellenirken hata oluştu")
    }
  }

  const filteredTrips = trips.filter((trip) => {
    if (filterActive === "active" && !trip.isActive) return false
    if (filterActive === "inactive" && trip.isActive) return false
    return true
  })

  if (hasAccess === null) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (hasAccess === false) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Erişim Reddedildi</p>
            <p className="text-sm text-gray-400 mt-2">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
            <Button onClick={() => router.push("/ogretmen")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Panele Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pl-16 lg:pl-4 sm:pl-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
                  <MapPin className="h-7 w-7 sm:h-8 sm:w-8" />
                  Gezi Yönetimi
                </h1>
                <p className="text-blue-100 text-sm sm:text-base">Okul gezilerini oluşturun ve yönetin</p>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Yeni Gezi Oluştur
              </Button>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Toplam Gezi</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                <div className="text-xl sm:text-2xl font-bold">{stats.totalTrips}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Aktif Gezi</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.activeTrips}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Yaklaşan Gezi</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.upcomingTrips}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Toplam Başvuru</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                <div className="text-xl sm:text-2xl font-bold">{stats.totalApplications}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Bu Ay Başvuru</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.monthlyApplications}</div>
              </CardContent>
            </Card>
        </div>

        {/* Arama ve Filtreler */}
        <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                  <Input
                    placeholder="Gezi adı veya konum ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterActive === "all" ? "default" : "outline"}
                    onClick={() => setFilterActive("all")}
                    size="sm"
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    Tümü
                  </Button>
                  <Button
                    variant={filterActive === "active" ? "default" : "outline"}
                    onClick={() => setFilterActive("active")}
                    size="sm"
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    Aktif
                  </Button>
                  <Button
                    variant={filterActive === "inactive" ? "default" : "outline"}
                    onClick={() => setFilterActive("inactive")}
                    size="sm"
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    Pasif
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gezi Listesi */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-gray-500">Yükleniyor...</div>
              </CardContent>
            </Card>
          ) : filteredTrips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-gray-500">Henüz gezi bulunmamaktadır</div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredTrips.map((trip) => (
                <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{trip.title}</CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{trip.location}</span>
                        </CardDescription>
                      </div>
                      {trip.isActive ? (
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{new Date(trip.startDate).toLocaleDateString("tr-TR")}</span>
                      </div>
                      {trip.quota && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{trip._count?.applications || 0} / {trip.quota}</span>
                        </div>
                      )}
                      {trip.price && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{Number(trip.price).toLocaleString("tr-TR")} ₺</span>
                        </div>
                      )}
                    </div>
                    {trip.description && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{trip.description}</p>
                    )}
                    <div className="flex gap-1.5 sm:gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs sm:text-sm"
                        onClick={() => router.push(`/gezi/${trip.id}`)}
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Detay</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(trip)} className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(trip)}
                        title={trip.isActive ? "Pasif Yap" : "Aktif Yap"}
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                      >
                        {trip.isActive ? <XCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Gezi Formu Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
              <Card className="w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
                <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
                  <div className="flex justify-between items-center gap-2">
                    <CardTitle className="text-base sm:text-lg lg:text-xl">{editingTrip ? "Gezi Düzenle" : "Yeni Gezi Oluştur"}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowForm(false)
                      setEditingTrip(null)
                      setFormData({
                        title: "",
                        description: "",
                        extraNotes: "",
                        location: "",
                        startDate: "",
                        endDate: "",
                        price: null,
                        quota: null,
                        isActive: true,
                      })
                      setFormErrors({})
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-xs sm:text-sm">Gezi Adı *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Örn: İstanbul Kültür Gezisi"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                      {formErrors.title && <p className="text-xs sm:text-sm text-red-500 mt-1">{formErrors.title}</p>}
                    </div>

                    <div>
                      <Label htmlFor="location" className="text-xs sm:text-sm">Konum *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Örn: İstanbul"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                      {formErrors.location && <p className="text-xs sm:text-sm text-red-500 mt-1">{formErrors.location}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label htmlFor="startDate" className="text-xs sm:text-sm">Başlangıç Tarihi *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                        {formErrors.startDate && <p className="text-xs sm:text-sm text-red-500 mt-1">{formErrors.startDate}</p>}
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-xs sm:text-sm">Bitiş Tarihi *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                        {formErrors.endDate && <p className="text-xs sm:text-sm text-red-500 mt-1">{formErrors.endDate}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label htmlFor="price" className="text-xs sm:text-sm">Ücret (₺)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price || ""}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : null })}
                          placeholder="Opsiyonel"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quota" className="text-xs sm:text-sm">Kota</Label>
                        <Input
                          id="quota"
                          type="number"
                          value={formData.quota || ""}
                          onChange={(e) => setFormData({ ...formData, quota: e.target.value ? Number(e.target.value) : null })}
                          placeholder="Opsiyonel"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-xs sm:text-sm">Açıklama</Label>
                      <textarea
                        id="description"
                        className="w-full min-h-[80px] sm:min-h-[100px] px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm"
                        value={formData.description || ""}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Gezi hakkında detaylı bilgi..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="extraNotes" className="text-xs sm:text-sm">Ek Açıklamalar (Veli Bilgilendirme)</Label>
                      <textarea
                        id="extraNotes"
                        className="w-full min-h-[80px] sm:min-h-[100px] px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm"
                        value={formData.extraNotes || ""}
                        onChange={(e) => setFormData({ ...formData, extraNotes: e.target.value })}
                        placeholder="Velilere özel notlar, önemli bilgiler..."
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-3 w-3 sm:h-4 sm:w-4"
                      />
                      <Label htmlFor="isActive" className="cursor-pointer text-xs sm:text-sm">
                        Aktif (Başvuru alınabilir)
                      </Label>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4">
                      <Button type="submit" disabled={submitting} size="sm" className="flex-1 text-xs sm:text-sm">
                        {submitting ? "Kaydediliyor..." : editingTrip ? "Güncelle" : "Oluştur"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowForm(false)
                          setEditingTrip(null)
                          setFormData({
                            title: "",
                            description: "",
                            extraNotes: "",
                            location: "",
                            startDate: "",
                            endDate: "",
                            price: null,
                            quota: null,
                            isActive: true,
                          })
                          setFormErrors({})
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
      </div>
    </div>
  )
}

