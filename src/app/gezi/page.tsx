"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import type { Trip, CreateTripData } from "@/lib/geziService"
import { useRouter } from "next/navigation"

export default function GeziPage() {
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

      const response = await fetch(`/api/gezi/trips?${params.toString()}`)
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
      const response = await fetch("/api/gezi/trips/stats")
      if (!response.ok) {
        throw new Error("İstatistikler alınamadı")
      }
      const result = await response.json()
      setStats(result.data || stats)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [stats])

  useEffect(() => {
    fetchTrips()
    fetchStats()
  }, [fetchTrips, fetchStats])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    setSubmitting(true)

    try {
      // Validasyon
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (!response.ok) {
          throw new Error("Gezi güncellenemedi")
        }
      } else {
        const response = await fetch("/api/gezi/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="p-6 space-y-6">
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Toplam Gezi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Aktif Gezi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Yaklaşan Gezi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcomingTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Toplam Başvuru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Bu Ay Başvuru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.monthlyApplications}</div>
          </CardContent>
        </Card>
      </div>

      {/* Başlık ve Aksiyonlar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gezi Yönetimi</h1>
          <p className="text-gray-600 mt-1">Okul gezilerini oluşturun ve yönetin</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Gezi
        </Button>
      </div>

      {/* Arama ve Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Gezi adı veya konum ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActive === "all" ? "default" : "outline"}
                onClick={() => setFilterActive("all")}
              >
                Tümü
              </Button>
              <Button
                variant={filterActive === "active" ? "default" : "outline"}
                onClick={() => setFilterActive("active")}
              >
                Aktif
              </Button>
              <Button
                variant={filterActive === "inactive" ? "default" : "outline"}
                onClick={() => setFilterActive("inactive")}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{trip.title}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {trip.location}
                    </CardDescription>
                  </div>
                  {trip.isActive ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(trip.startDate).toLocaleDateString("tr-TR")}
                  </div>
                  {trip.quota && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {trip._count?.applications || 0} / {trip.quota}
                    </div>
                  )}
                  {trip.price && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {Number(trip.price).toLocaleString("tr-TR")} ₺
                    </div>
                  )}
                </div>
                {trip.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{trip.description}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/gezi/${trip.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detay
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(trip)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(trip)}
                    title={trip.isActive ? "Pasif Yap" : "Aktif Yap"}
                  >
                    {trip.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Gezi Formu Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{editingTrip ? "Gezi Düzenle" : "Yeni Gezi Oluştur"}</CardTitle>
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
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Gezi Adı *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Örn: İstanbul Kültür Gezisi"
                  />
                  {formErrors.title && <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>}
                </div>

                <div>
                  <Label htmlFor="location">Konum *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Örn: İstanbul"
                  />
                  {formErrors.location && <p className="text-sm text-red-500 mt-1">{formErrors.location}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Başlangıç Tarihi *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                    {formErrors.startDate && <p className="text-sm text-red-500 mt-1">{formErrors.startDate}</p>}
                  </div>
                  <div>
                    <Label htmlFor="endDate">Bitiş Tarihi *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                    {formErrors.endDate && <p className="text-sm text-red-500 mt-1">{formErrors.endDate}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Ücret (₺)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price || ""}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Opsiyonel"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quota">Kota</Label>
                    <Input
                      id="quota"
                      type="number"
                      value={formData.quota || ""}
                      onChange={(e) => setFormData({ ...formData, quota: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Opsiyonel"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Açıklama</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Gezi hakkında detaylı bilgi..."
                  />
                </div>

                <div>
                  <Label htmlFor="extraNotes">Ek Açıklamalar (Veli Bilgilendirme)</Label>
                  <textarea
                    id="extraNotes"
                    className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md"
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
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Aktif (Başvuru alınabilir)
                  </Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? "Kaydediliyor..." : editingTrip ? "Güncelle" : "Oluştur"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
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
  )
}

