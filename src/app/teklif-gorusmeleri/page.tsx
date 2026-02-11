"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Search, Eye, User, Phone, School, 
  X, Filter, ChevronDown, ChevronUp, 
  FileSpreadsheet, Plus, Trash2, Edit, Clock, Handshake, MessageSquare, History,
  CheckCircle2, XCircle, HelpCircle, Calendar, UserCircle, Flag
} from "lucide-react"
import { ToastContainer, useToast } from "@/components/ui/toast"

interface TeklifGorusmesi {
  id: string
  ogrenciAdSoyad: string
  okul: string
  sinif: string
  veliAdSoyad: string
  veliTelefon: string
  veliEmail: string | null
  veliMeslek: string | null
  veliAdres: string | null
  teklifEdilenFiyat: number
  okulFiyati: number
  sonGecerlilikTarihi: string | null
  createdAt: string
  createdBy: string | null
  kayitlar: Array<{
    id: string
    gorusmeTarihi: string
    gorusmeyiYapan: string
    durum: "OLUMLU" | "OLUMSUZ" | "BELIRSIZ"
    durumNotu: string | null
    genelNot: string | null
  }>
  _count?: { kayitlar: number }
}

const siniflar = [
  "4. Sınıf",
  "5. Sınıf",
  "6. Sınıf",
  "7. Sınıf",
  "8. Sınıf",
  "9. Sınıf",
  "10. Sınıf",
  "11. Sınıf",
  "12. Sınıf",
]

export default function TeklifGorusmeleriPage() {
  const [teklifGorusmeleri, setTeklifGorusmeleri] = useState<TeklifGorusmesi[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTeklifler, setTotalTeklifler] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTeklif, setSelectedTeklif] = useState<TeklifGorusmesi | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingTeklif, setEditingTeklif] = useState<TeklifGorusmesi | null>(null)
  const { toasts, success, error, removeToast } = useToast()
  
  // Filtreler
  const [selectedSinif, setSelectedSinif] = useState("")
  const [selectedOkul, setSelectedOkul] = useState("")
  const [selectedDurum, setSelectedDurum] = useState<"" | "OLUMLU" | "OLUMSUZ" | "BELIRSIZ">("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  /** "devam" = Devam Eden Görüşmeler, "tamamlanan" = Tamamlanan Görüşmeler */
  const [viewMode, setViewMode] = useState<"devam" | "tamamlanan">("devam")
  /** Görüşmeyi Sonlandır modalı */
  const [sonlandirTeklif, setSonlandirTeklif] = useState<TeklifGorusmesi | null>(null)

  // Benzersiz okullar
  const uniqueOkullar = useMemo(() => {
    const okullar = teklifGorusmeleri.map(t => t.okul).filter(Boolean)
    return Array.from(new Set(okullar)).sort()
  }, [teklifGorusmeleri])

  const fetchTeklifGorusmeleri = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      })
      params.append("tamamlandi", viewMode === "tamamlanan" ? "true" : "false")

      if (searchTerm) params.append("search", searchTerm)
      if (selectedSinif) params.append("sinif", selectedSinif)
      if (selectedOkul) params.append("okul", selectedOkul)
      if (selectedDurum) params.append("durum", selectedDurum)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const response = await fetch(`/api/teklif-gorusmeleri?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setTeklifGorusmeleri(data.teklifGorusmeleri || [])
      setTotalTeklifler(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      console.error("Error fetching teklif görüşmeleri:", err)
      error("Teklif görüşmeleri yüklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeklifGorusmeleri()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, selectedSinif, selectedOkul, selectedDurum, startDate, endDate, viewMode])

  const handleDelete = async (id: string) => {
    if (!confirm("Bu teklif görüşmesini silmek istediğinize emin misiniz?")) {
      return
    }

    try {
      setDeletingId(id)
      const response = await fetch(`/api/teklif-gorusmeleri/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete")

      success("Teklif görüşmesi başarıyla silindi")
      fetchTeklifGorusmeleri()
    } catch (err) {
      console.error("Error deleting teklif görüşmesi:", err)
      error("Teklif görüşmesi silinirken bir hata oluştu")
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const params = new URLSearchParams()

      if (searchTerm) params.append("search", searchTerm)
      if (selectedSinif) params.append("sinif", selectedSinif)
      if (selectedOkul) params.append("okul", selectedOkul)
      if (selectedDurum) params.append("durum", selectedDurum)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const response = await fetch(`/api/teklif-gorusmeleri/export?${params}`)
      if (!response.ok) throw new Error("Failed to export")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `teklif_gorusmeleri_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      success("Excel dosyası indirildi")
    } catch (err) {
      console.error("Error exporting:", err)
      error("Excel dosyası oluşturulurken bir hata oluştu")
    } finally {
      setIsExporting(false)
    }
  }

  const getDurumBadge = (durum: "OLUMLU" | "OLUMSUZ" | "BELIRSIZ") => {
    const badges = {
      OLUMLU: "bg-green-100 text-green-800 border-green-300",
      OLUMSUZ: "bg-red-100 text-red-800 border-red-300",
      BELIRSIZ: "bg-yellow-100 text-yellow-800 border-yellow-300",
    }
    const labels = {
      OLUMLU: "Olumlu",
      OLUMSUZ: "Olumsuz",
      BELIRSIZ: "Belirsiz",
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${badges[durum]}`}>
        {labels[durum]}
      </span>
    )
  }

  const activeFiltersCount = [
    selectedSinif,
    selectedOkul,
    selectedDurum,
    startDate,
    endDate,
  ].filter(Boolean).length

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teklif Görüşmeleri</h1>
          <p className="text-gray-600 mt-1">Teklif görüşmelerini yönetin ve takip edin</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isExporting ? "İndiriliyor..." : "Excel İndir"}
          </Button>
          <Button onClick={() => {
            setEditingTeklif(null)
            setShowFormModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Teklif Oluştur
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Arama ve Filtreleme</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <Filter className="h-4 w-4 ml-2" />
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Öğrenci adı, okul, veli adı veya telefon ile ara..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label>Sınıf</Label>
                <select
                  value={selectedSinif}
                  onChange={(e) => {
                    setSelectedSinif(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tümü</option>
                  {siniflar.map((sinif) => (
                    <option key={sinif} value={sinif}>
                      {sinif}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Okul</Label>
                <select
                  value={selectedOkul}
                  onChange={(e) => {
                    setSelectedOkul(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tümü</option>
                  {uniqueOkullar.map((okul) => (
                    <option key={okul} value={okul}>
                      {okul}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Durum</Label>
                <select
                  value={selectedDurum}
                  onChange={(e) => {
                    setSelectedDurum(e.target.value as "" | "OLUMLU" | "OLUMSUZ" | "BELIRSIZ")
                    setCurrentPage(1)
                  }}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tümü</option>
                  <option value="OLUMLU">Olumlu</option>
                  <option value="OLUMSUZ">Olumsuz</option>
                  <option value="BELIRSIZ">Belirsiz</option>
                </select>
              </div>

              <div>
                <Label>Başlangıç Tarihi</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="mt-1"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSinif("")
                    setSelectedOkul("")
                    setSelectedDurum("")
                    setStartDate("")
                    setEndDate("")
                    setCurrentPage(1)
                  }}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Filtreleri Temizle
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="mb-0">
              {viewMode === "devam" ? "Devam Eden Görüşmeler" : "Tamamlanan Görüşmeler"} ({totalTeklifler})
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setViewMode(viewMode === "devam" ? "tamamlanan" : "devam")
                setCurrentPage(1)
              }}
              className="shrink-0"
            >
              {viewMode === "devam" ? "Tamamlanan Görüşmeler" : "Devam Eden Görüşmeler"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Yükleniyor...</p>
            </div>
          ) : teklifGorusmeleri.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Henüz teklif görüşmesi bulunmuyor</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {teklifGorusmeleri.map((teklif) => {
                  const sonKayit = teklif.kayitlar[0]
                  return (
                    <div
                      key={teklif.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {teklif.ogrenciAdSoyad}
                            </h3>
                            {sonKayit && getDurumBadge(sonKayit.durum)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4" />
                              <span>{teklif.okul}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{teklif.sinif}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Veli: {teklif.veliAdSoyad}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{teklif.veliTelefon}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Teklif:</span>
                              <span className="text-blue-600 font-semibold">
                                {teklif.teklifEdilenFiyat.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Okul Fiyatı:</span>
                              <span className="text-gray-700">
                                {teklif.okulFiyati.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </span>
                            </div>
                            {sonKayit && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    Son Görüşme: {new Date(sonKayit.gorusmeTarihi).toLocaleDateString('tr-TR')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{sonKayit.gorusmeyiYapan}</span>
                                </div>
                              </>
                            )}
                          </div>
                          {(teklif._count?.kayitlar ?? teklif.kayitlar.length) > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedTeklif(teklif)}
                              className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border border-slate-200/80 text-sm font-medium text-slate-700 shadow-sm hover:shadow transition-all duration-200"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 border border-slate-200">
                                <History className="h-4 w-4 text-slate-600" />
                              </span>
                              <span>
                                <span className="text-slate-500 font-normal">Geçmiş:</span>{" "}
                                {teklif._count?.kayitlar ?? teklif.kayitlar.length} görüşme
                              </span>
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4 shrink-0">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTeklif(teklif)}
                              title="Detay / Geçmiş görüşmeler"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTeklif(teklif)
                                setShowFormModal(true)
                              }}
                              title="Yeni görüşme ekle"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <MessageSquare className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Yeni Görüşme</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTeklif(teklif)
                                setShowFormModal(true)
                              }}
                              title="Düzenle"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(teklif.id)}
                              disabled={deletingId === teklif.id}
                            >
                              {deletingId === teklif.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                          </div>
                          {viewMode === "devam" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSonlandirTeklif(teklif)}
                              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                              title="Görüşmeyi sonlandır"
                            >
                              <Flag className="h-4 w-4 mr-1" />
                              Görüşmeyi Sonlandır
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Sayfa {currentPage} / {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
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

      {/* Detail Modal (geçmiş görüşmeler) */}
      {selectedTeklif && (
        <TeklifDetailModal
          teklif={selectedTeklif}
          onClose={() => setSelectedTeklif(null)}
          onAddMeeting={() => {
            setEditingTeklif(selectedTeklif)
            setSelectedTeklif(null)
            setShowFormModal(true)
          }}
        />
      )}

      {/* Form Modal */}
      {showFormModal && (
        <TeklifFormModal
          teklif={editingTeklif}
          onClose={() => {
            setShowFormModal(false)
            setEditingTeklif(null)
          }}
          onSuccess={() => {
            setShowFormModal(false)
            setEditingTeklif(null)
            fetchTeklifGorusmeleri()
          }}
        />
      )}

      {/* Görüşmeyi Sonlandır Modal */}
      {sonlandirTeklif && (
        <SonlandirModal
          teklif={sonlandirTeklif}
          onClose={() => setSonlandirTeklif(null)}
          onSuccess={() => {
            setSonlandirTeklif(null)
            fetchTeklifGorusmeleri()
            success("Görüşme sonlandırıldı")
          }}
          onError={(msg) => error(msg)}
        />
      )}
    </div>
  )
}

// Görüşmeyi Sonlandır modalı: Olumlu/Olumsuz seçimi + son durum notu
function SonlandirModal({
  teklif,
  onClose,
  onSuccess,
  onError,
}: {
  teklif: TeklifGorusmesi
  onClose: () => void
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const [sonucDurum, setSonucDurum] = useState<"OLUMLU" | "OLUMSUZ">("OLUMLU")
  const [not, setNot] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/teklif-gorusmeleri/${teklif.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durum: sonucDurum,
          durumNotu: not.trim() || null,
          gorusmeTarihi: new Date().toISOString(),
          gorusmeyiYapan: "Sistem",
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        onError(data.error || "Görüşme sonlandırılamadı")
        return
      }
      onSuccess()
    } catch (err) {
      console.error(err)
      onError("Bir hata oluştu")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Görüşmeyi Sonlandır</h2>
        <p className="text-sm text-gray-600 mb-4">{teklif.ogrenciAdSoyad}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sonuc-durum">Sonuç</Label>
            <select
              id="sonuc-durum"
              value={sonucDurum}
              onChange={(e) => setSonucDurum(e.target.value as "OLUMLU" | "OLUMSUZ")}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="OLUMLU">Olumlu</option>
              <option value="OLUMSUZ">Olumsuz</option>
            </select>
          </div>
          <div>
            <Label htmlFor="sonuc-not">Son durum notu</Label>
            <textarea
              id="sonuc-not"
              value={not}
              onChange={(e) => setNot(e.target.value)}
              placeholder="Tamamlanan görüşmeye ait not..."
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Kaydediliyor..." : "Sonlandır"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Detail Modal Component (geçmiş görüşmeler – tam liste için fetch yapar)
function TeklifDetailModal({
  teklif: initialTeklif,
  onClose,
  onAddMeeting,
}: {
  teklif: TeklifGorusmesi
  onClose: () => void
  onAddMeeting?: () => void
}) {
  const [teklif, setTeklif] = useState<TeklifGorusmesi>(initialTeklif)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchFull() {
      try {
        const res = await fetch(`/api/teklif-gorusmeleri/${initialTeklif.id}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (data.teklifGorusmesi && !cancelled) {
          setTeklif(data.teklifGorusmesi)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchFull()
    return () => { cancelled = true }
  }, [initialTeklif.id])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Geçmiş Görüşmeler</h2>
              <p className="mt-0.5 text-sm text-slate-500 truncate">
                {teklif.ogrenciAdSoyad} · {teklif.teklifEdilenFiyat.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onAddMeeting && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onAddMeeting}
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm rounded-lg"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Yeni Görüşme
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg hover:bg-slate-100" aria-label="Kapat">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <p className="mt-4 text-sm text-slate-500">Görüşmeler yükleniyor...</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Teklif özeti – kompakt */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Teklif özeti</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Öğrenci</p>
                    <p className="font-semibold text-slate-900">{teklif.ogrenciAdSoyad}</p>
                    <p className="text-slate-500">{teklif.okul} · {teklif.sinif}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Veli</p>
                    <p className="font-semibold text-slate-900">{teklif.veliAdSoyad}</p>
                    <p className="text-slate-500">{teklif.veliTelefon}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Teklif</p>
                    <p className="font-bold text-blue-600">{teklif.teklifEdilenFiyat.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</p>
                  </div>
                  {teklif.sonGecerlilikTarihi && (
                    <div>
                      <p className="text-slate-500">Geçerlilik</p>
                      <p className="font-semibold text-slate-900">{new Date(teklif.sonGecerlilikTarihi).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Görüşme geçmişi – timeline */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900">Görüşme geçmişi</h3>
                  {teklif.kayitlar.length > 0 && (
                    <span className="text-xs text-slate-500">{teklif.kayitlar.length} kayıt</span>
                  )}
                </div>

                {teklif.kayitlar.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200/80">
                      <MessageSquare className="h-7 w-7 text-slate-500" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-700">Henüz görüşme kaydı yok</p>
                    <p className="mt-1 text-sm text-slate-500">Bu teklif için ilk görüşmeyi ekleyerek başlayın.</p>
                    {onAddMeeting && (
                      <Button variant="outline" size="sm" onClick={onAddMeeting} className="mt-4 rounded-lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Görüşme Ekle
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    {/* Dikey çizgi */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />
                    <ul className="space-y-0">
                      {teklif.kayitlar.map((kayit, index) => {
                        const isOlumlu = kayit.durum === "OLUMLU"
                        const isOlumsuz = kayit.durum === "OLUMSUZ"
                        const borderColor = isOlumlu ? "border-emerald-500" : isOlumsuz ? "border-red-500" : "border-amber-500"
                        const iconBg = isOlumlu ? "bg-emerald-100 text-emerald-700" : isOlumsuz ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        const Icon = isOlumlu ? CheckCircle2 : isOlumsuz ? XCircle : HelpCircle
                        const durumLabels = { OLUMLU: "Olumlu", OLUMSUZ: "Olumsuz", BELIRSIZ: "Belirsiz" }
                        const badgeClass = isOlumlu ? "bg-emerald-100 text-emerald-800 border-emerald-200" : isOlumsuz ? "bg-red-100 text-red-800 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"
                        return (
                          <li key={kayit.id} className="relative flex gap-4 pb-6 last:pb-0">
                            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm ${iconBg}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className={`min-w-0 flex-1 rounded-xl border-l-4 ${borderColor} bg-white p-4 shadow-sm ring-1 ring-slate-200/80`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {new Date(kayit.gorusmeTarihi).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                                    <span className="text-slate-400 font-normal">·</span>
                                    {new Date(kayit.gorusmeTarihi).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                                    {durumLabels[kayit.durum]}
                                  </span>
                                  {index === 0 && (
                                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Son görüşme</span>
                                  )}
                                </div>
                                <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                                  <UserCircle className="h-4 w-4" />
                                  {kayit.gorusmeyiYapan}
                                </span>
                              </div>
                              {(kayit.durumNotu || kayit.genelNot) && (
                                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                  {kayit.durumNotu && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-400">Durum notu</p>
                                      <p className="text-sm text-slate-700 mt-0.5">{kayit.durumNotu}</p>
                                    </div>
                                  )}
                                  {kayit.genelNot && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-400">Genel not</p>
                                      <p className="text-sm text-slate-700 mt-0.5">{kayit.genelNot}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Form Modal Component
function TeklifFormModal({
  teklif,
  onClose,
  onSuccess,
}: {
  teklif: TeklifGorusmesi | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    ogrenciAdSoyad: teklif?.ogrenciAdSoyad || "",
    okul: teklif?.okul || "",
    sinif: teklif?.sinif || "",
    veliAdSoyad: teklif?.veliAdSoyad || "",
    veliTelefon: teklif?.veliTelefon || "",
    veliEmail: teklif?.veliEmail || "",
    veliMeslek: teklif?.veliMeslek || "",
    veliAdres: teklif?.veliAdres || "",
    teklifEdilenFiyat: teklif?.teklifEdilenFiyat.toString() || "",
    okulFiyati: teklif?.okulFiyati.toString() || "",
    sonGecerlilikTarihi: teklif?.sonGecerlilikTarihi 
      ? new Date(teklif.sonGecerlilikTarihi).toISOString().split("T")[0] 
      : "",
    // Yeni görüşme kaydı için
    gorusmeTarihi: "",
    durum: "" as "" | "OLUMLU" | "OLUMSUZ" | "BELIRSIZ",
    durumNotu: "",
    genelNot: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { success: showSuccess, error: showError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validasyon
    if (!formData.ogrenciAdSoyad || !formData.okul || !formData.sinif || 
        !formData.veliAdSoyad || !formData.veliTelefon || 
        !formData.teklifEdilenFiyat || !formData.okulFiyati) {
      showError("Tüm zorunlu alanlar doldurulmalıdır")
      return
    }

    // Eğer düzenleme yapılıyorsa ve yeni görüşme kaydı bilgileri varsa
    if (teklif && !formData.durum) {
      showError("Düzenleme yaparken görüşme durumu zorunludur")
      return
    }

    try {
      setIsSubmitting(true)
      // ✅ Otomatik olarak mevcut kullanıcının adı soyadını al
      const staffName = typeof window !== "undefined" ? localStorage.getItem("staff_name") : null
      const gorusmeyiYapan = staffName || "Sistem"

      if (teklif) {
        // Düzenleme - Yeni görüşme kaydı ekle
        const response = await fetch(`/api/teklif-gorusmeleri/${teklif.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            teklifEdilenFiyat: parseFloat(formData.teklifEdilenFiyat),
            okulFiyati: parseFloat(formData.okulFiyati),
            sonGecerlilikTarihi: formData.sonGecerlilikTarihi || null,
            gorusmeTarihi: formData.gorusmeTarihi,
            createdBy: staffName || "Sistem",
            // ✅ Yeni görüşme kaydı için otomatik kullanıcı adı
            gorusmeyiYapan: formData.durum ? gorusmeyiYapan : undefined,
          }),
        })

        if (!response.ok) throw new Error("Failed to update")
      } else {
        // Yeni oluşturma
        const response = await fetch("/api/teklif-gorusmeleri", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            teklifEdilenFiyat: parseFloat(formData.teklifEdilenFiyat),
            okulFiyati: parseFloat(formData.okulFiyati),
            sonGecerlilikTarihi: formData.sonGecerlilikTarihi || null,
            gorusmeTarihi: formData.gorusmeTarihi,
            createdBy: staffName || "Sistem",
            // ✅ Yeni görüşme kaydı için otomatik kullanıcı adı
            gorusmeyiYapan: formData.durum ? gorusmeyiYapan : undefined,
          }),
        })

        if (!response.ok) throw new Error("Failed to create")
      }

      showSuccess(teklif ? "Teklif görüşmesi güncellendi" : "Teklif görüşmesi oluşturuldu")
      onSuccess()
    } catch (error) {
      console.error("Error saving teklif görüşmesi:", error)
      showError("Teklif görüşmesi kaydedilirken bir hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {teklif ? "Teklif Görüşmesi Düzenle" : "Yeni Teklif Görüşmesi"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Öğrenci Bilgileri */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Öğrenci Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ogrenciAdSoyad">Ad Soyad *</Label>
                  <Input
                    id="ogrenciAdSoyad"
                    value={formData.ogrenciAdSoyad}
                    onChange={(e) => setFormData({ ...formData, ogrenciAdSoyad: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="okul">Okul *</Label>
                  <Input
                    id="okul"
                    value={formData.okul}
                    onChange={(e) => setFormData({ ...formData, okul: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sinif">Sınıf *</Label>
                  <select
                    id="sinif"
                    value={formData.sinif}
                    onChange={(e) => setFormData({ ...formData, sinif: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {siniflar.map((sinif) => (
                      <option key={sinif} value={sinif}>
                        {sinif}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Veli Bilgileri */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Veli Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="veliAdSoyad">Ad Soyad *</Label>
                  <Input
                    id="veliAdSoyad"
                    value={formData.veliAdSoyad}
                    onChange={(e) => setFormData({ ...formData, veliAdSoyad: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="veliTelefon">Telefon *</Label>
                  <Input
                    id="veliTelefon"
                    type="tel"
                    value={formData.veliTelefon}
                    onChange={(e) => setFormData({ ...formData, veliTelefon: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="veliEmail">Email</Label>
                  <Input
                    id="veliEmail"
                    type="email"
                    value={formData.veliEmail}
                    onChange={(e) => setFormData({ ...formData, veliEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="veliMeslek">Meslek</Label>
                  <Input
                    id="veliMeslek"
                    value={formData.veliMeslek}
                    onChange={(e) => setFormData({ ...formData, veliMeslek: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="veliAdres">Adres</Label>
                  <Input
                    id="veliAdres"
                    value={formData.veliAdres}
                    onChange={(e) => setFormData({ ...formData, veliAdres: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Teklif Bilgileri */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Teklif Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teklifEdilenFiyat">Teklif Edilen Fiyat *</Label>
                  <Input
                    id="teklifEdilenFiyat"
                    type="number"
                    step="0.01"
                    value={formData.teklifEdilenFiyat}
                    onChange={(e) => setFormData({ ...formData, teklifEdilenFiyat: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="okulFiyati">Okul Fiyatı *</Label>
                  <Input
                    id="okulFiyati"
                    type="number"
                    step="0.01"
                    value={formData.okulFiyati}
                    onChange={(e) => setFormData({ ...formData, okulFiyati: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sonGecerlilikTarihi">Teklifin Son Geçerlilik Tarihi</Label>
                  <Input
                    id="sonGecerlilikTarihi"
                    type="date"
                    value={formData.sonGecerlilikTarihi}
                    onChange={(e) => setFormData({ ...formData, sonGecerlilikTarihi: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Görüşme Bilgileri */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {teklif ? "Yeni Görüşme Kaydı" : "Görüşme Bilgileri"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gorusmeTarihi">Görüşme Tarihi *</Label>
                  <Input
                    id="gorusmeTarihi"
                    type="date"
                    value={formData.gorusmeTarihi}
                    onChange={(e) => setFormData({ ...formData, gorusmeTarihi: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="durum">Durum *</Label>
                  <select
                    id="durum"
                    value={formData.durum}
                    onChange={(e) => setFormData({ ...formData, durum: e.target.value as "OLUMLU" | "OLUMSUZ" | "BELIRSIZ" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="OLUMLU">Olumlu</option>
                    <option value="OLUMSUZ">Olumsuz</option>
                    <option value="BELIRSIZ">Belirsiz</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="durumNotu">Durum Notu</Label>
                  <Input
                    id="durumNotu"
                    value={formData.durumNotu}
                    onChange={(e) => setFormData({ ...formData, durumNotu: e.target.value })}
                    placeholder="Seçilen duruma özel not..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="genelNot">Genel Not/Açıklama</Label>
                  <textarea
                    id="genelNot"
                    value={formData.genelNot}
                    onChange={(e) => setFormData({ ...formData, genelNot: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Kaydediliyor..." : teklif ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

