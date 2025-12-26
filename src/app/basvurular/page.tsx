"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Search, Eye, Calendar, User, Mail, Phone, School, GraduationCap, 
  Briefcase, X, Filter, ChevronDown, ChevronUp, 
  FileSpreadsheet, Users, TrendingUp, Clock, RefreshCw, CheckCircle2, Trash2,
  PhoneCall
} from "lucide-react"

interface Basvuru {
  id: string
  externalId: string
  ogrenciAdSoyad: string
  ogrenciTc: string
  okul: string
  ogrenciSinifi: string
  ogrenciSube: string
  sinavGunu: string
  babaAdSoyad: string
  babaMeslek: string
  babaIsAdresi: string
  babaCepTel: string
  anneAdSoyad: string
  anneMeslek: string
  anneIsAdresi: string
  anneCepTel: string
  email: string
  createdAt: string
  syncedAt: string
  contactStatus: "ILETISIME_GECILDI" | "ILETISIME_GECILMEDI"
  contactNote: string | null
  lastContactedAt: string | null
  lastContactedBy: string | null
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
]

export default function BasvurularPage() {
  const [basvurular, setBasvurular] = useState<Basvuru[]>([])
  const [allBasvurular, setAllBasvurular] = useState<Basvuru[]>([]) // Filtreleme için tüm başvurular
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBasvurular, setTotalBasvurular] = useState(0)
  const [filteredCount, setFilteredCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBasvuru, setSelectedBasvuru] = useState<Basvuru | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; errors: number } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [contactModal, setContactModal] = useState<{
    basvuru: Basvuru
    status: "ILETISIME_GECILDI" | "ILETISIME_GECILMEDI"
    note: string
    contactedBy: string
  } | null>(null)
  const [isSavingContact, setIsSavingContact] = useState(false)
  
  // Filtreler
  const [selectedSinif, setSelectedSinif] = useState("")
  const [selectedOkul, setSelectedOkul] = useState("")
  const [selectedBabaMeslek, setSelectedBabaMeslek] = useState("")
  const [selectedAnneMeslek, setSelectedAnneMeslek] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [contactFilter, setContactFilter] = useState<"" | "ILETISIME_GECILDI" | "ILETISIME_GECILMEDI_NOT_CONTACTED" | "ILETISIME_GECILMEDI_FAILED">("")
  
  // İstatistikler
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    sinifStats: {} as Record<string, number>,
    topOkullar: [] as Array<{ okul: string; count: number }>,
    topBabaMeslekler: [] as Array<{ meslek: string; count: number }>,
    topAnneMeslekler: [] as Array<{ meslek: string; count: number }>,
  })

  // Benzersiz değerler (filtreleme için)
  const uniqueOkullar = useMemo(() => {
    const okullar = allBasvurular.map(b => b.okul).filter(Boolean)
    return Array.from(new Set(okullar)).sort()
  }, [allBasvurular])

  const uniqueBabaMeslekler = useMemo(() => {
    const meslekler = allBasvurular.map(b => b.babaMeslek).filter(Boolean)
    return Array.from(new Set(meslekler)).sort()
  }, [allBasvurular])

  const uniqueAnneMeslekler = useMemo(() => {
    const meslekler = allBasvurular.map(b => b.anneMeslek).filter(Boolean)
    return Array.from(new Set(meslekler)).sort()
  }, [allBasvurular])

  // İstatistikleri çek
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      
      const response = await fetch(`/api/basvurular/stats?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [startDate, endDate])

  const fetchBasvurular = useCallback(async (
    page: number = 1, 
    search: string = "",
    sinif: string = "",
    okul: string = "",
    babaMeslek: string = "",
    anneMeslek: string = "",
    startDateParam: string = "",
    endDateParam: string = "",
    contactStatusParam: "" | "ILETISIME_GECILDI" | "ILETISIME_GECILMEDI_NOT_CONTACTED" | "ILETISIME_GECILMEDI_FAILED" = ""
  ) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      })
      if (search.trim()) {
        params.append("search", search.trim())
      }
      if (sinif) {
        params.append("sinif", sinif)
      }
      if (okul) {
        params.append("okul", okul)
      }
      if (babaMeslek) {
        params.append("babaMeslek", babaMeslek)
      }
      if (anneMeslek) {
        params.append("anneMeslek", anneMeslek)
      }
      if (startDateParam) {
        params.append("startDate", startDateParam)
      }
      if (endDateParam) {
        params.append("endDate", endDateParam)
      }
      if (contactStatusParam) {
        params.append("contactStatus", contactStatusParam)
      }
      
      const response = await fetch(`/api/basvurular?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      if (data.basvurular && data.pagination) {
        setBasvurular(data.basvurular)
        setTotalPages(data.pagination.totalPages)
        setTotalBasvurular(data.pagination.total)
        setFilteredCount(data.pagination.total)
      } else {
        setBasvurular([])
        setTotalPages(1)
        setTotalBasvurular(0)
        setFilteredCount(0)
      }
    } catch (error) {
      console.error("Error fetching basvurular:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Tüm başvuruları çek (filtreleme için)
  const fetchAllBasvurular = useCallback(async () => {
    try {
      const response = await fetch('/api/basvurular?limit=10000')
      if (response.ok) {
        const data = await response.json()
        if (data.basvurular) {
          setAllBasvurular(data.basvurular)
        }
      }
    } catch (error) {
      console.error("Error fetching all basvurular:", error)
    }
  }, [])

  useEffect(() => {
    fetchAllBasvurular()
    fetchStats()
  }, [fetchAllBasvurular, fetchStats])

  useEffect(() => {
    fetchBasvurular(
      currentPage, 
      searchTerm, 
      selectedSinif, 
      selectedOkul, 
      selectedBabaMeslek, 
      selectedAnneMeslek,
      startDate,
      endDate
    )
    fetchStats()
  }, [currentPage, fetchBasvurular, fetchStats, startDate, endDate, contactFilter, searchTerm, selectedSinif, selectedOkul, selectedBabaMeslek, selectedAnneMeslek])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchBasvurular(
      1, 
      searchTerm, 
      selectedSinif, 
      selectedOkul, 
      selectedBabaMeslek, 
      selectedAnneMeslek,
      startDate,
      endDate
    )
    fetchStats()
  }

  const handleFilterChange = (
    newSinif?: string, 
    newOkul?: string, 
    newBabaMeslek?: string, 
    newAnneMeslek?: string,
    newStartDate?: string,
    newEndDate?: string,
    newContactStatus?: "" | "ILETISIME_GECILDI" | "ILETISIME_GECILMEDI_NOT_CONTACTED" | "ILETISIME_GECILMEDI_FAILED"
  ) => {
    setCurrentPage(1)
    const sinifToUse = newSinif !== undefined ? newSinif : selectedSinif
    const okulToUse = newOkul !== undefined ? newOkul : selectedOkul
    const babaMeslekToUse = newBabaMeslek !== undefined ? newBabaMeslek : selectedBabaMeslek
    const anneMeslekToUse = newAnneMeslek !== undefined ? newAnneMeslek : selectedAnneMeslek
    const startDateToUse = newStartDate !== undefined ? newStartDate : startDate
    const endDateToUse = newEndDate !== undefined ? newEndDate : endDate
    const contactStatusToUse = newContactStatus !== undefined ? newContactStatus : contactFilter
    
    fetchBasvurular(
      1, 
      searchTerm, 
      sinifToUse, 
      okulToUse, 
      babaMeslekToUse, 
      anneMeslekToUse,
      startDateToUse,
      endDateToUse,
      contactStatusToUse
    )
    fetchStats()
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedSinif("")
    setSelectedOkul("")
    setSelectedBabaMeslek("")
    setSelectedAnneMeslek("")
    setStartDate("")
    setEndDate("")
    setContactFilter("")
    setCurrentPage(1)
    fetchBasvurular(1, "", "", "", "", "", "", "", "")
    fetchStats()
  }

  const hasActiveFilters = searchTerm || selectedSinif || selectedOkul || selectedBabaMeslek || selectedAnneMeslek || startDate || endDate || contactFilter

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const params = new URLSearchParams()
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim())
      }
      if (selectedSinif) {
        params.append("sinif", selectedSinif)
      }
      if (selectedOkul) {
        params.append("okul", selectedOkul)
      }
      if (selectedBabaMeslek) {
        params.append("babaMeslek", selectedBabaMeslek)
      }
      if (selectedAnneMeslek) {
        params.append("anneMeslek", selectedAnneMeslek)
      }
      if (startDate) {
        params.append("startDate", startDate)
      }
      if (endDate) {
        params.append("endDate", endDate)
      }
      if (contactFilter) {
        params.append("contactStatus", contactFilter)
      }

      const response = await fetch(`/api/basvurular/export?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `basvurular_${dateStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting:", error)
      alert("Excel export sırasında bir hata oluştu")
    } finally {
      setIsExporting(false)
    }
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      setSyncResult(null)
      
      const response = await fetch('/api/basvurular/sync', {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sync failed')
      }

      const data = await response.json()
      setSyncResult(data.stats)
      
      // Başvuruları yeniden yükle
      await fetchBasvurular(
        currentPage, 
        searchTerm, 
        selectedSinif, 
        selectedOkul, 
        selectedBabaMeslek, 
        selectedAnneMeslek,
        startDate,
        endDate
      )
      await fetchAllBasvurular()
      await fetchStats()
      
      // 5 saniye sonra sync result'ı kaldır
      setTimeout(() => {
        setSyncResult(null)
      }, 5000)
    } catch (error) {
      console.error("Error syncing:", error)
      alert(error instanceof Error ? error.message : "Senkronizasyon sırasında bir hata oluştu")
    } finally {
      setIsSyncing(false)
    }
  }

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `0${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 8)} ${phone.slice(8)}`
    }
    return phone
  }

  const handleDelete = async (id: string, ogrenciAdSoyad: string) => {
    if (!confirm(`"${ogrenciAdSoyad}" adlı başvuruyu silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      setDeletingId(id)
      const response = await fetch(`/api/basvurular/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      // Başvuruları yeniden yükle
      await fetchBasvurular(
        currentPage, 
        searchTerm, 
        selectedSinif, 
        selectedOkul, 
        selectedBabaMeslek, 
        selectedAnneMeslek,
        startDate,
        endDate
      )
      await fetchAllBasvurular()
      await fetchStats()
    } catch (error) {
      console.error("Error deleting:", error)
      alert("Başvuru silinirken bir hata oluştu")
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteTestBasvurular = async () => {
    if (!confirm('Tüm test başvurularını silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const response = await fetch('/api/debug/basvurular', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      const data = await response.json()
      alert(`${data.deleted} test başvurusu silindi`)
      
      // Başvuruları yeniden yükle
      await fetchBasvurular(
        currentPage, 
        searchTerm, 
        selectedSinif, 
        selectedOkul, 
        selectedBabaMeslek, 
        selectedAnneMeslek,
        startDate,
        endDate
      )
      await fetchAllBasvurular()
      await fetchStats()
    } catch (error) {
      console.error("Error deleting test basvurular:", error)
      alert("Test başvuruları silinirken bir hata oluştu")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="page-header animate-fade-in mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-shrink-0">
            <h1 className="page-title text-xl sm:text-2xl lg:text-3xl">Bursluluk Sınavı Başvuruları</h1>
            <p className="page-subtitle text-xs sm:text-sm">Başvuru sisteminden gelen başvurular</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm w-full sm:w-auto justify-center"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Senkronize Ediliyor...</span>
                  <span className="sm:hidden">Senkronize...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <span className="hidden sm:inline">Geçmiş Başvuruları Senkronize Et</span>
                  <span className="sm:hidden">Senkronize Et</span>
                </>
              )}
            </Button>
            {allBasvurular.some(b => 
              b.ogrenciAdSoyad.includes('TEST') || 
              b.okul === 'Test Okulu' || 
              b.externalId.startsWith('test-')
            ) && (
              <Button
                onClick={handleDeleteTestBasvurular}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50 text-xs sm:text-sm w-full sm:w-auto justify-center"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="hidden sm:inline">Test Başvurularını Sil</span>
                <span className="sm:hidden">Test Sil</span>
              </Button>
            )}
            <Button
              onClick={handleExport}
              disabled={isExporting || totalBasvurular === 0}
              size="sm"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg text-xs sm:text-sm w-full sm:w-auto justify-center"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2" />
                  <span className="hidden sm:inline">İndiriliyor...</span>
                  <span className="sm:hidden">İndiriliyor...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <span className="hidden sm:inline">Excel İndir</span>
                  <span className="sm:hidden">Excel</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <Card className="mb-4 sm:mb-6 border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
          <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-green-900 text-sm sm:text-base">Senkronizasyon Tamamlandı!</p>
                  <p className="text-xs sm:text-sm text-green-700 break-words">
                    {syncResult.synced} yeni başvuru eklendi, {syncResult.skipped} başvuru zaten mevcuttu
                    {syncResult.errors > 0 && `, ${syncResult.errors} hata oluştu`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSyncResult(null)}
                className="text-green-700 hover:text-green-900 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* İletişim Notu Modalı */}
      {contactModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => !isSavingContact && setContactModal(null)}
        >
          <Card
            className="max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <PhoneCall className="h-4 w-4 text-blue-600" />
                {contactModal.status === "ILETISIME_GECILDI"
                  ? "İletişime Geçildi Notu"
                  : "İletişime Geçilemedi Notu"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {contactModal.basvuru.ogrenciAdSoyad} - {contactModal.basvuru.okul}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">
                  Not <span className="text-red-500">*</span>
                </Label>
                <textarea
                  value={contactModal.note}
                  onChange={(e) =>
                    setContactModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            note: e.target.value,
                          }
                        : prev
                    )
                  }
                  rows={4}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={
                    contactModal.status === "ILETISIME_GECILDI"
                      ? "İletişime geçildikten sonra yapılan görüşmenin özetini yazınız..."
                      : "İletişime geçilememesinin nedenini yazınız..."
                  }
                />
              </div>
            </CardContent>
            <CardContent className="pt-0 pb-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => !isSavingContact && setContactModal(null)}
                disabled={isSavingContact}
              >
                İptal
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={
                  isSavingContact ||
                  !contactModal.note.trim()
                }
                onClick={async () => {
                  if (!contactModal.note.trim()) return
                  try {
                    setIsSavingContact(true)
                    // ✅ Otomatik olarak mevcut kullanıcının adı soyadını al
                    const staffName = typeof window !== "undefined" ? localStorage.getItem("staff_name") : null
                    const contactedBy = contactModal.status === "ILETISIME_GECILDI" && staffName
                      ? staffName.trim()
                      : undefined
                    
                    const response = await fetch(
                      `/api/basvurular/${contactModal.basvuru.id}`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          status: contactModal.status,
                          note: contactModal.note.trim(),
                          contactedBy,
                        }),
                      }
                    )

                    if (!response.ok) {
                      const data = await response.json().catch(() => null)
                      throw new Error(data?.error || "İletişim durumu güncellenemedi")
                    }

                    // Listeyi ve detayları güncelle
                    await fetchBasvurular(
                      currentPage,
                      searchTerm,
                      selectedSinif,
                      selectedOkul,
                      selectedBabaMeslek,
                      selectedAnneMeslek,
                      startDate,
                      endDate,
                      contactFilter
                    )
                    await fetchAllBasvurular()
                    setContactModal(null)
                  } catch (error) {
                    console.error("Error updating contact status:", error)
                    alert(
                      error instanceof Error
                        ? error.message
                        : "İletişim durumu güncellenirken bir hata oluştu"
                    )
                  } finally {
                    setIsSavingContact(false)
                  }
                }}
              >
                {isSavingContact ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
          <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1 truncate">Toplam Başvuru</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-blue-200 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-emerald-600 text-white">
          <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-green-100 text-xs sm:text-sm font-medium mb-1 truncate">Bugün</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.today}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-green-200 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-600 to-amber-600 text-white">
          <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-orange-100 text-xs sm:text-sm font-medium mb-1 truncate">Bu Hafta</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.thisWeek}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-orange-200 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">
          <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-purple-100 text-xs sm:text-sm font-medium mb-1 truncate">Bu Ay</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.thisMonth}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-purple-200 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtrelenmiş Sonuç Sayısı */}
      {hasActiveFilters && (
        <Card className="mb-4 sm:mb-6 border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500">
          <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-indigo-900 text-sm sm:text-base">
                  Filtrelenmiş Sonuç: <span className="text-xl sm:text-2xl">{filteredCount}</span> başvuru
                </p>
                {selectedSinif && (
                  <p className="text-xs sm:text-sm text-indigo-700 mt-1 break-words">
                    {selectedSinif} için toplam: {stats.sinifStats[selectedSinif] || 0} başvuru
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sınıf Bazında İstatistikler */}
      {Object.keys(stats.sinifStats).length > 0 && (
        <Card className="mb-4 sm:mb-6 border-0 shadow-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Sınıf Bazında Başvurular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
              {siniflar.map((sinif) => {
                const count = stats.sinifStats[sinif] || 0
                return (
                  <div
                    key={sinif}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                      selectedSinif === sinif
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <p className="text-xs text-gray-600 mb-1 truncate">{sinif}</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="mb-4 sm:mb-6 border-0 shadow-lg">
        <CardContent className="pt-4 sm:pt-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                <Input
                  type="text"
                  placeholder="Öğrenci adı, soyadı veya TC ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button onClick={handleSearch} size="sm" className="bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 text-xs sm:text-sm flex-1 sm:flex-initial">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Ara</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-9 sm:h-10 text-xs sm:text-sm flex-1 sm:flex-initial ${showFilters ? "bg-blue-50 border-blue-300" : ""}`}
                >
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Filtreler</span>
                  {showFilters ? (
                    <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  ) : (
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Temizle</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                    <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                    Sınıf
                  </Label>
                  <select
                    value={selectedSinif}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSelectedSinif(newValue)
                      handleFilterChange(newValue)
                    }}
                    className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tüm Sınıflar</option>
                    {siniflar.map((sinif) => (
                      <option key={sinif} value={sinif}>
                        {sinif}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                    <PhoneCall className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                    İletişim Durumu
                  </Label>
                  <select
                    value={contactFilter}
                    onChange={(e) => {
                      const newValue = e.target.value as "" | "ILETISIME_GECILDI" | "ILETISIME_GECILMEDI_NOT_CONTACTED" | "ILETISIME_GECILMEDI_FAILED"
                      setContactFilter(newValue)
                      handleFilterChange(undefined, undefined, undefined, undefined, undefined, undefined, newValue)
                    }}
                    className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tümü</option>
                    <option value="ILETISIME_GECILDI">İletişime Geçildi</option>
                    <option value="ILETISIME_GECILMEDI_NOT_CONTACTED">İletişime Geçilmedi</option>
                    <option value="ILETISIME_GECILMEDI_FAILED">İletişime Geçilemedi</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                    <School className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                    Okul
                  </Label>
                  <select
                    value={selectedOkul}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSelectedOkul(newValue)
                      handleFilterChange(undefined, newValue)
                    }}
                    className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tüm Okullar</option>
                    {uniqueOkullar.map((okul) => (
                      <option key={okul} value={okul}>
                        {okul}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                    Baba Meslek
                  </Label>
                  <select
                    value={selectedBabaMeslek}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSelectedBabaMeslek(newValue)
                      handleFilterChange(undefined, undefined, newValue)
                    }}
                    className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tüm Meslekler</option>
                    {uniqueBabaMeslekler.map((meslek) => (
                      <option key={meslek} value={meslek}>
                        {meslek}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                    Anne Meslek
                  </Label>
                  <select
                    value={selectedAnneMeslek}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSelectedAnneMeslek(newValue)
                      handleFilterChange(undefined, undefined, undefined, newValue)
                    }}
                    className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tüm Meslekler</option>
                    {uniqueAnneMeslekler.map((meslek) => (
                      <option key={meslek} value={meslek}>
                        {meslek}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                    Başlangıç Tarihi
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setStartDate(newValue)
                      handleFilterChange(undefined, undefined, undefined, undefined, newValue)
                    }}
                    className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                    Bitiş Tarihi
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setEndDate(newValue)
                      handleFilterChange(undefined, undefined, undefined, undefined, undefined, newValue)
                    }}
                    className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
                {selectedSinif && (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm">
                    <span className="hidden sm:inline">Sınıf: </span>{selectedSinif}
                    <button
                      onClick={() => {
                        setSelectedSinif("")
                        handleFilterChange("")
                      }}
                      className="hover:text-blue-900 ml-0.5"
                    >
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  </span>
                )}
                {selectedOkul && (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm max-w-full">
                    <span className="hidden sm:inline">Okul: </span>
                    <span className="truncate max-w-[120px] sm:max-w-none">
                      {selectedOkul.length > 20 ? selectedOkul.substring(0, 20) + '...' : selectedOkul}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedOkul("")
                        handleFilterChange(undefined, "")
                      }}
                      className="hover:text-green-900 ml-0.5 flex-shrink-0"
                    >
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  </span>
                )}
                {selectedBabaMeslek && (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm">
                    <span className="hidden sm:inline">Baba Meslek: </span>{selectedBabaMeslek}
                    <button
                      onClick={() => {
                        setSelectedBabaMeslek("")
                        handleFilterChange(undefined, undefined, "")
                      }}
                      className="hover:text-purple-900 ml-0.5"
                    >
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  </span>
                )}
                {selectedAnneMeslek && (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-pink-100 text-pink-700 rounded-full text-xs sm:text-sm">
                    <span className="hidden sm:inline">Anne Meslek: </span>{selectedAnneMeslek}
                    <button
                      onClick={() => {
                        setSelectedAnneMeslek("")
                        handleFilterChange(undefined, undefined, undefined, "")
                      }}
                      className="hover:text-pink-900 ml-0.5"
                    >
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  </span>
                )}
                {startDate && (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-teal-100 text-teal-700 rounded-full text-xs sm:text-sm">
                    <span className="hidden sm:inline">Başlangıç: </span>
                    <span className="sm:hidden">Baş: </span>
                    {new Date(startDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                    <button
                      onClick={() => {
                        setStartDate("")
                        handleFilterChange(undefined, undefined, undefined, undefined, "")
                      }}
                      className="hover:text-teal-900 ml-0.5"
                    >
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  </span>
                )}
                {contactFilter && (
                  <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm ${
                    contactFilter === "ILETISIME_GECILDI"
                      ? "bg-green-100 text-green-700"
                      : contactFilter === "ILETISIME_GECILMEDI_FAILED"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    <span className="hidden sm:inline">İletişim: </span>
                    {contactFilter === "ILETISIME_GECILDI"
                      ? "İletişime Geçildi"
                      : contactFilter === "ILETISIME_GECILMEDI_FAILED"
                      ? "İletişime Geçilemedi"
                      : "İletişime Geçilmedi"}
                    <button
                      onClick={() => {
                        setContactFilter("")
                        handleFilterChange(undefined, undefined, undefined, undefined, undefined, undefined, "")
                      }}
                      className={`ml-0.5 hover:opacity-70 ${
                        contactFilter === "ILETISIME_GECILDI"
                          ? "hover:text-green-900"
                          : contactFilter === "ILETISIME_GECILMEDI_FAILED"
                          ? "hover:text-red-900"
                          : "hover:text-yellow-900"
                      }`}
                    >
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  </span>
                )}
                {endDate && (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-teal-100 text-teal-700 rounded-full text-xs sm:text-sm">
                    <span className="hidden sm:inline">Bitiş: </span>
                    {new Date(endDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                    <button
                      onClick={() => {
                        setEndDate("")
                        handleFilterChange(undefined, undefined, undefined, undefined, undefined, "")
                      }}
                      className="hover:text-teal-900 ml-0.5"
                    >
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basvurular List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 sm:py-20">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600" />
        </div>
      ) : basvurular.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-12 text-center">
            <User className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
            <p className="text-gray-500 text-base sm:text-lg font-medium px-4">
              {hasActiveFilters ? "Filtreleme kriterlerinize uygun başvuru bulunamadı." : "Henüz başvuru bulunmamaktadır."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                size="sm"
                className="mt-3 sm:mt-4"
              >
                Filtreleri Temizle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {basvurular.map((basvuru, index) => (
              <Card
                key={basvuru.id}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
                onClick={() => setSelectedBasvuru(basvuru)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                          {basvuru.ogrenciAdSoyad.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {basvuru.ogrenciAdSoyad}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              basvuru.contactStatus === "ILETISIME_GECILDI"
                                ? "bg-green-100 text-green-700"
                                : basvuru.contactStatus === "ILETISIME_GECILMEDI" && basvuru.lastContactedAt
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {basvuru.contactStatus === "ILETISIME_GECILDI"
                                ? "İletişime Geçildi"
                                : basvuru.contactStatus === "ILETISIME_GECILMEDI" && basvuru.lastContactedAt
                                ? "İletişime Geçilemedi"
                                : "İletişime Geçilmedi"}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500">TC: {basvuru.ogrenciTc}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
                        <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                          <School className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-gray-700 truncate" title={basvuru.okul}>
                            {basvuru.okul}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 flex-shrink-0" />
                          <span className="text-gray-700">
                            {basvuru.ogrenciSinifi} · {basvuru.ogrenciSube} Şubesi
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{basvuru.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                          <span className="text-gray-700">
                            {new Date(basvuru.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-4 flex-shrink-0 min-w-[160px]">
                      <div className="flex gap-2">
                        <Button
                          variant={basvuru.contactStatus === "ILETISIME_GECILDI" ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setContactModal({
                              basvuru,
                              status: "ILETISIME_GECILDI",
                              note: basvuru.contactNote || "",
                              contactedBy: basvuru.lastContactedBy || ""
                            })
                          }}
                          className="text-xs sm:text-sm flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          İletişime Geçildi
                        </Button>
                        <Button
                          variant={basvuru.contactStatus === "ILETISIME_GECILMEDI" && basvuru.lastContactedAt ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setContactModal({
                              basvuru,
                              status: "ILETISIME_GECILMEDI",
                              note: basvuru.contactStatus === "ILETISIME_GECILMEDI" && basvuru.lastContactedAt ? (basvuru.contactNote || "") : "",
                              contactedBy: ""
                            })
                          }}
                          className="text-xs sm:text-sm flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                          İletişime Geçilemedi
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedBasvuru(basvuru)
                          }}
                          className="group-hover:border-blue-300 group-hover:bg-blue-50 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Detay</span>
                        </Button>
                      {(basvuru.ogrenciAdSoyad.includes('TEST') || 
                        basvuru.okul === 'Test Okulu' || 
                        basvuru.externalId.startsWith('test-')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(basvuru.id, basvuru.ogrenciAdSoyad)
                          }}
                          disabled={deletingId === basvuru.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                        >
                          {deletingId === basvuru.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-red-600" />
                          ) : (
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-xs sm:text-sm"
              >
                Önceki
              </Button>
              <span className="text-xs sm:text-sm text-gray-600 px-2 sm:px-4">
                Sayfa {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-xs sm:text-sm"
              >
                Sonraki
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedBasvuru && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in"
          onClick={() => setSelectedBasvuru(null)}
        >
          <Card
            className="max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto border-0 shadow-2xl animate-slide-in rounded-none sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-10 px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl break-words">{selectedBasvuru.ogrenciAdSoyad}</CardTitle>
                  <CardDescription className="text-blue-100 mt-1 sm:mt-2 text-xs sm:text-sm">
                    Başvuru Detayları
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBasvuru(null)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 sm:pt-8 px-4 sm:px-6 pb-6 sm:pb-8 bg-gray-50">
              <div className="space-y-5 sm:space-y-6">
                {/* Öğrenci Bilgileri - Öne Çıkan Kart */}
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 pb-3">
                    <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                        <User className="h-4 w-4" />
                      </div>
                      Öğrenci Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 sm:pt-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Ad Soyad</Label>
                        <p className="font-bold text-base sm:text-lg text-gray-900 break-words">{selectedBasvuru.ogrenciAdSoyad}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">TC Kimlik No</Label>
                        <p className="font-semibold text-sm sm:text-base text-gray-800 font-mono">{selectedBasvuru.ogrenciTc}</p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Okul</Label>
                        <p className="font-semibold text-sm sm:text-base text-gray-800 break-words flex items-start gap-2">
                          <School className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          {selectedBasvuru.okul}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Sınıf / Şube</Label>
                        <p className="font-semibold text-sm sm:text-base text-gray-800 flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                          {selectedBasvuru.ogrenciSinifi} · {selectedBasvuru.ogrenciSube} Şubesi
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Sınav Günü</Label>
                        <p className="font-semibold text-sm sm:text-base text-blue-600 flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          {selectedBasvuru.sinavGunu || "Belirtilmedi"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* İletişim Durumu - Öne Çıkan Kart */}
                <Card className={`border-2 shadow-md ${
                  selectedBasvuru.contactStatus === "ILETISIME_GECILDI" 
                    ? "border-green-200 bg-green-50/50" 
                    : selectedBasvuru.contactStatus === "ILETISIME_GECILMEDI" && selectedBasvuru.lastContactedAt
                    ? "border-red-200 bg-red-50/50"
                    : "border-yellow-200 bg-yellow-50/50"
                }`}>
                  <CardHeader className={`pb-3 ${
                    selectedBasvuru.contactStatus === "ILETISIME_GECILDI" 
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100" 
                      : selectedBasvuru.contactStatus === "ILETISIME_GECILMEDI" && selectedBasvuru.lastContactedAt
                      ? "bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100"
                      : "bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100"
                  }`}>
                    <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        selectedBasvuru.contactStatus === "ILETISIME_GECILDI" 
                          ? "bg-green-500 text-white" 
                          : selectedBasvuru.contactStatus === "ILETISIME_GECILMEDI" && selectedBasvuru.lastContactedAt
                          ? "bg-red-500 text-white"
                          : "bg-yellow-500 text-white"
                      }`}>
                        <PhoneCall className="h-4 w-4" />
                      </div>
                      İletişim Durumu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 sm:pt-5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                          selectedBasvuru.contactStatus === "ILETISIME_GECILDI"
                            ? "bg-green-100 text-green-700"
                            : selectedBasvuru.contactStatus === "ILETISIME_GECILMEDI" && selectedBasvuru.lastContactedAt
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {selectedBasvuru.contactStatus === "ILETISIME_GECILDI"
                            ? "✓ İletişime Geçildi"
                            : selectedBasvuru.contactStatus === "ILETISIME_GECILMEDI" && selectedBasvuru.lastContactedAt
                            ? "⚠ İletişime Geçilemedi"
                            : "⚠ İletişime Geçilmedi"}
                        </span>
                      </div>
                      {selectedBasvuru.lastContactedAt && (
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Son İletişim Tarihi</Label>
                          <p className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            {new Date(selectedBasvuru.lastContactedAt).toLocaleString("tr-TR")}
                          </p>
                        </div>
                      )}
                      {selectedBasvuru.lastContactedBy && (
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">İletişime Geçen</Label>
                          <p className="font-semibold text-sm text-gray-800 break-words flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            {selectedBasvuru.lastContactedBy}
                          </p>
                        </div>
                      )}
                      {selectedBasvuru.contactNote && (
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">İletişim Notu</Label>
                          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                              {selectedBasvuru.contactNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Baba ve Anne Bilgileri - Yan Yana Kartlar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                  {/* Baba Bilgileri */}
                  <Card className="border-0 shadow-md bg-white">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 pb-3">
                      <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                          <User className="h-4 w-4" />
                        </div>
                        Baba Bilgileri
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 sm:pt-5">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Ad Soyad</Label>
                          <p className="font-semibold text-sm sm:text-base text-gray-800 break-words">{selectedBasvuru.babaAdSoyad}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Meslek</Label>
                          <p className="font-semibold text-sm sm:text-base text-gray-800 break-words flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                            {selectedBasvuru.babaMeslek}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Cep Telefonu</Label>
                          <p className="font-semibold text-sm sm:text-base text-gray-800 flex items-center gap-2">
                            <Phone className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <a href={`tel:${selectedBasvuru.babaCepTel}`} className="hover:text-green-600 transition-colors">
                              {formatPhone(selectedBasvuru.babaCepTel)}
                            </a>
                          </p>
                        </div>
                        {selectedBasvuru.babaIsAdresi && (
                          <div className="space-y-1">
                            <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">İş Adresi</Label>
                            <p className="font-semibold text-sm sm:text-base text-gray-800 break-words">{selectedBasvuru.babaIsAdresi}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Anne Bilgileri */}
                  <Card className="border-0 shadow-md bg-white">
                    <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 pb-3">
                      <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white">
                          <User className="h-4 w-4" />
                        </div>
                        Anne Bilgileri
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 sm:pt-5">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Ad Soyad</Label>
                          <p className="font-semibold text-sm sm:text-base text-gray-800 break-words">{selectedBasvuru.anneAdSoyad}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Meslek</Label>
                          <p className="font-semibold text-sm sm:text-base text-gray-800 break-words flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-pink-600 flex-shrink-0" />
                            {selectedBasvuru.anneMeslek}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Cep Telefonu</Label>
                          <p className="font-semibold text-sm sm:text-base text-gray-800 flex items-center gap-2">
                            <Phone className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <a href={`tel:${selectedBasvuru.anneCepTel}`} className="hover:text-green-600 transition-colors">
                              {formatPhone(selectedBasvuru.anneCepTel)}
                            </a>
                          </p>
                        </div>
                        {selectedBasvuru.anneIsAdresi && (
                          <div className="space-y-1">
                            <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">İş Adresi</Label>
                            <p className="font-semibold text-sm sm:text-base text-gray-800 break-words">{selectedBasvuru.anneIsAdresi}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* İletişim ve Tarih Bilgileri - Alt Kart */}
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100 pb-3">
                    <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-400 to-slate-500 flex items-center justify-center text-white">
                        <Mail className="h-4 w-4" />
                      </div>
                      İletişim ve Sistem Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 sm:pt-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">E-posta</Label>
                        <p className="font-semibold text-sm sm:text-base text-gray-800 break-all flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <a href={`mailto:${selectedBasvuru.email}`} className="hover:text-blue-600 transition-colors">
                            {selectedBasvuru.email}
                          </a>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Başvuru Tarihi</Label>
                        <p className="font-semibold text-xs sm:text-sm text-gray-800 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          {new Date(selectedBasvuru.createdAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Senkronizasyon Tarihi</Label>
                        <p className="font-semibold text-xs sm:text-sm text-gray-800 flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          {new Date(selectedBasvuru.syncedAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
