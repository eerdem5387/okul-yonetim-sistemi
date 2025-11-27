"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Download,
  Search,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  User,
  Phone,
  GraduationCap,
  Loader2,
} from "lucide-react"
import type { Trip, TripApplication } from "@/lib/geziService"

export default function GeziDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [applications, setApplications] = useState<TripApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalApplications, setTotalApplications] = useState(0)
  const [exporting, setExporting] = useState(false)

  const fetchTrip = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/gezi/trips/${tripId}`)
      if (!response.ok) {
        throw new Error("Gezi bulunamadı")
      }
      const result = await response.json()
      setTrip(result.data)
    } catch (error) {
      console.error("Error fetching trip:", error)
      alert("Gezi yüklenirken hata oluştu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"))
      router.push("/gezi")
    } finally {
      setLoading(false)
    }
  }, [tripId, router])

  const fetchApplications = useCallback(async () => {
    try {
      setApplicationsLoading(true)
      const params = new URLSearchParams()
      params.append("page", String(currentPage))
      params.append("limit", "20")
      if (searchTerm) {
        params.append("q", searchTerm)
      }

      const response = await fetch(`/api/gezi/trips/${tripId}/applications?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Başvurular alınamadı")
      }
      const result = await response.json()
      setApplications(result.data || [])
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages)
        setTotalApplications(result.pagination.total)
      }
    } catch (error) {
      console.error("Error fetching applications:", error)
      alert("Başvurular yüklenirken hata oluştu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"))
      setApplications([])
    } finally {
      setApplicationsLoading(false)
    }
  }, [tripId, currentPage, searchTerm])

  useEffect(() => {
    fetchTrip()
  }, [fetchTrip])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch(`/api/gezi/trips/${tripId}/applications/export`)
      if (!response.ok) {
        throw new Error("Excel export başarısız")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `gezi-${trip?.title.replace(/\s+/g, "-").toLowerCase()}-basvurular.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting applications:", error)
      alert("Excel export sırasında hata oluştu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"))
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Onaylandı</span>
      case "REJECTED":
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Reddedildi</span>
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Beklemede</span>
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Yükleniyor...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Gezi bulunamadı</p>
            <Button onClick={() => router.push("/gezi")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Gezi Listesine Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Geri Dön Butonu */}
      <Button variant="outline" onClick={() => router.push("/gezi")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Gezi Listesine Dön
      </Button>

      {/* Gezi Bilgileri */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{trip.title}</CardTitle>
              <CardDescription className="mt-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {trip.location}
              </CardDescription>
            </div>
            {trip.isActive ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Aktif</span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">Pasif</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-5 w-5" />
              <div>
                <div className="text-sm font-medium">Başlangıç</div>
                <div className="text-sm">{new Date(trip.startDate).toLocaleDateString("tr-TR", { dateStyle: "long" })}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-5 w-5" />
              <div>
                <div className="text-sm font-medium">Bitiş</div>
                <div className="text-sm">{new Date(trip.endDate).toLocaleDateString("tr-TR", { dateStyle: "long" })}</div>
              </div>
            </div>
            {trip.price && (
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="h-5 w-5" />
                <div>
                  <div className="text-sm font-medium">Ücret</div>
                  <div className="text-sm font-semibold">{Number(trip.price).toLocaleString("tr-TR")} ₺</div>
                </div>
              </div>
            )}
          </div>

          {trip.quota && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-5 w-5" />
              <div>
                <div className="text-sm font-medium">Kota</div>
                <div className="text-sm">
                  {trip._count?.applications || 0} / {trip.quota} başvuru
                </div>
              </div>
            </div>
          )}

          {trip.description && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Açıklama</div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{trip.description}</p>
            </div>
          )}

          {trip.extraNotes && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Ek Açıklamalar (Veli Bilgilendirme)</div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-yellow-50 p-3 rounded border border-yellow-200">
                {trip.extraNotes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Başvurular */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Başvurular</CardTitle>
              <CardDescription>Toplam {totalApplications} başvuru</CardDescription>
            </div>
            <Button onClick={handleExport} disabled={exporting || totalApplications === 0}>
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  İndiriliyor...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Excel İndir
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Arama */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Öğrenci adı, veli adı veya telefon ara..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Başvuru Listesi */}
          {applicationsLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-4">Yükleniyor...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Henüz başvuru bulunmamaktadır</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Öğrenci</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Sınıf</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Veli</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Veli Telefon</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Öğrenci Telefon</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Durum</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{app.ogrenciAdSoyad}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-gray-400" />
                            <span>{app.ogrenciSinifi}. Sınıf</span>
                          </div>
                        </td>
                        <td className="p-3">{app.veliAdSoyad}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{app.veliTelefon}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{app.ogrenciTelefon}</span>
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(app.status)}</td>
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(app.createdAt).toLocaleDateString("tr-TR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Önceki
                  </Button>
                  <span className="text-sm text-gray-600">
                    Sayfa {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

