"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Search,
  Users,
  Clock,
  TrendingUp,
  GraduationCap,
  PhoneCall,
  CheckCircle2,
  X,
} from "lucide-react"

interface YazOkuluBasvuru {
  id: string
  externalId: string
  studentId: string
  ogrenciAdSoyad: string
  ogrenciSinifi: string | null
  createdAt: string
  syncedAt: string
  contactStatus: "ILETISIME_GECILDI" | "ILETISIME_GECILMEDI"
  contactNote: string | null
  lastContactedAt: string | null
  lastContactedBy: string | null
}

interface Stats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  contactedCount: number
  notContactedCount: number
  sinifBreakdown: Array<{ sinif: string; count: number }>
}

export default function YazOkuluBasvurularPage() {
  const [basvurular, setBasvurular] = useState<YazOkuluBasvuru[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSinif, setSelectedSinif] = useState("")
  const [contactFilter, setContactFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedBasvuru, setSelectedBasvuru] = useState<YazOkuluBasvuru | null>(null)
  const [contactModal, setContactModal] = useState<{
    basvuru: YazOkuluBasvuru
    status: "ILETISIME_GECILDI" | "ILETISIME_GECILMEDI"
    note: string
  } | null>(null)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [stats, setStats] = useState<Stats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    contactedCount: 0,
    notContactedCount: 0,
    sinifBreakdown: [],
  })

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      const response = await fetch(`/api/yaz-okulu-basvurular/stats?${params}`)
      if (response.ok) {
        setStats(await response.json())
      }
    } catch (error) {
      console.error("Stats error:", error)
    }
  }, [startDate, endDate])

  const fetchBasvurular = useCallback(
    async (
      page = 1,
      search = "",
      sinif = "",
      contactStatus = "",
      start = "",
      end = ""
    ) => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        })
        if (search.trim()) params.append("search", search.trim())
        if (sinif) params.append("sinif", sinif)
        if (contactStatus) params.append("contactStatus", contactStatus)
        if (start) params.append("startDate", start)
        if (end) params.append("endDate", end)

        const response = await fetch(`/api/yaz-okulu-basvurular?${params}`)
        if (response.ok) {
          const data = await response.json()
          setBasvurular(data.basvurular)
          setTotalPages(data.pagination.totalPages)
          setTotal(data.pagination.total)
          setCurrentPage(data.pagination.page)
        }
      } catch (error) {
        console.error("List error:", error)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchStats()
    fetchBasvurular(1, searchTerm, selectedSinif, contactFilter, startDate, endDate)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchStats()
    fetchBasvurular(1, searchTerm, selectedSinif, contactFilter, startDate, endDate)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedSinif("")
    setContactFilter("")
    setStartDate("")
    setEndDate("")
    fetchStats()
    fetchBasvurular(1, "", "", "", "", "")
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Yaz Okulu Başvuruları
        </h1>
        <p className="text-gray-600 mt-1">
          2026-2027 yaz okulu başvuru listesi ve istatistikleri
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm mb-1">Toplam</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-emerald-600 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs sm:text-sm mb-1">Bugün</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.today}</p>
              </div>
              <Clock className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-600 to-amber-600 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs sm:text-sm mb-1">Bu Hafta</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.thisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm mb-1">Bu Ay</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.thisMonth}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-600 to-cyan-600 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-xs sm:text-sm mb-1">İletişime Geçildi</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.contactedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-teal-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-600 to-pink-600 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-100 text-xs sm:text-sm mb-1">Bekleyen</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.notContactedCount}</p>
              </div>
              <PhoneCall className="h-8 w-8 text-rose-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sınıf dağılımı */}
      {stats.sinifBreakdown.length > 0 && (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Sınıf Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stats.sinifBreakdown.map((item) => (
                <div
                  key={item.sinif}
                  className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center"
                >
                  <p className="text-xs text-slate-500 truncate">{item.sinif}</p>
                  <p className="text-xl font-bold text-slate-800">{item.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6 border-0 shadow-md">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="mb-1.5 block">Öğrenci Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Ad soyad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Sınıf</Label>
              <Input
                placeholder="Örn: 5. Sınıf"
                value={selectedSinif}
                onChange={(e) => setSelectedSinif(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">İletişim Durumu</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={contactFilter}
                onChange={(e) => setContactFilter(e.target.value)}
              >
                <option value="">Tümü</option>
                <option value="ILETISIME_GECILDI">İletişime Geçildi</option>
                <option value="ILETISIME_GECILMEDI">İletişime Geçilmedi</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1.5 block">Başlangıç</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Bitiş</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch}>Filtrele</Button>
            <Button variant="outline" onClick={clearFilters}>
              Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Başvuru Listesi{" "}
            <span className="text-sm font-normal text-gray-500">({total} kayıt)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-10 text-gray-500">Yükleniyor...</p>
          ) : basvurular.length === 0 ? (
            <p className="text-center py-10 text-gray-500">Başvuru bulunamadı</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-3 pr-4 font-medium">Öğrenci</th>
                      <th className="py-3 pr-4 font-medium">Sınıf</th>
                      <th className="py-3 pr-4 font-medium">Başvuru Tarihi</th>
                      <th className="py-3 pr-4 font-medium">İletişim</th>
                      <th className="py-3 font-medium">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {basvurular.map((b) => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {b.ogrenciAdSoyad}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {b.ogrenciSinifi || "—"}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {formatDate(b.createdAt)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              b.contactStatus === "ILETISIME_GECILDI"
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {b.contactStatus === "ILETISIME_GECILDI"
                              ? "İletişime Geçildi"
                              : "İletişime Geçilmedi"}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedBasvuru(b)}
                            >
                              Detay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setContactModal({
                                  basvuru: b,
                                  status: b.contactStatus,
                                  note: b.contactNote || "",
                                })
                              }
                            >
                              İletişim
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Sayfa {currentPage} / {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() =>
                        fetchBasvurular(
                          currentPage - 1,
                          searchTerm,
                          selectedSinif,
                          contactFilter,
                          startDate,
                          endDate
                        )
                      }
                    >
                      Önceki
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        fetchBasvurular(
                          currentPage + 1,
                          searchTerm,
                          selectedSinif,
                          contactFilter,
                          startDate,
                          endDate
                        )
                      }
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      {selectedBasvuru && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg relative">
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedBasvuru(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <CardHeader>
              <CardTitle>Başvuru Detayı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Öğrenci</p>
                <p className="font-semibold">{selectedBasvuru.ogrenciAdSoyad}</p>
              </div>
              <div>
                <p className="text-gray-500">Sınıf</p>
                <p className="font-semibold">{selectedBasvuru.ogrenciSinifi || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Başvuru Tarihi</p>
                <p className="font-semibold">{formatDate(selectedBasvuru.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">İletişim Durumu</p>
                <p className="font-semibold">
                  {selectedBasvuru.contactStatus === "ILETISIME_GECILDI"
                    ? "İletişime Geçildi"
                    : "İletişime Geçilmedi"}
                </p>
              </div>
              {selectedBasvuru.contactNote && (
                <div>
                  <p className="text-gray-500">Not</p>
                  <p className="font-semibold">{selectedBasvuru.contactNote}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contact modal */}
      {contactModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>İletişim Durumu Güncelle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {contactModal.basvuru.ogrenciAdSoyad}
              </p>
              <div>
                <Label className="mb-1.5 block">Durum</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={contactModal.status}
                  onChange={(e) =>
                    setContactModal({
                      ...contactModal,
                      status: e.target.value as
                        | "ILETISIME_GECILDI"
                        | "ILETISIME_GECILMEDI",
                    })
                  }
                >
                  <option value="ILETISIME_GECILMEDI">İletişime Geçilmedi</option>
                  <option value="ILETISIME_GECILDI">İletişime Geçildi</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block">Not</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={contactModal.note}
                  onChange={(e) =>
                    setContactModal({ ...contactModal, note: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setContactModal(null)}>
                  İptal
                </Button>
                <Button
                  disabled={isSavingContact}
                  onClick={async () => {
                    try {
                      setIsSavingContact(true)
                      const staffName =
                        typeof window !== "undefined"
                          ? localStorage.getItem("staff_name") || ""
                          : ""
                      const response = await fetch(
                        `/api/yaz-okulu-basvurular/${contactModal.basvuru.id}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            contactStatus: contactModal.status,
                            contactNote: contactModal.note,
                            lastContactedBy: staffName,
                          }),
                        }
                      )
                      if (!response.ok) throw new Error("Güncelleme başarısız")
                      setContactModal(null)
                      fetchBasvurular(
                        currentPage,
                        searchTerm,
                        selectedSinif,
                        contactFilter,
                        startDate,
                        endDate
                      )
                      fetchStats()
                    } catch (error) {
                      alert(
                        error instanceof Error
                          ? error.message
                          : "Güncelleme başarısız"
                      )
                    } finally {
                      setIsSavingContact(false)
                    }
                  }}
                >
                  {isSavingContact ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
