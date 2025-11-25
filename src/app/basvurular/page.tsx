"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Search, Eye, Calendar, User, Mail, Phone, School, GraduationCap, 
  Briefcase, X, Filter, ChevronDown, ChevronUp, 
  FileSpreadsheet, Users, TrendingUp, Clock, RefreshCw, CheckCircle2, Trash2
} from "lucide-react"

interface Basvuru {
  id: string
  externalId: string
  ogrenciAdSoyad: string
  ogrenciTc: string
  okul: string
  ogrenciSinifi: string
  ogrenciSube: string
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
  
  // Filtreler
  const [selectedSinif, setSelectedSinif] = useState("")
  const [selectedOkul, setSelectedOkul] = useState("")
  const [selectedBabaMeslek, setSelectedBabaMeslek] = useState("")
  const [selectedAnneMeslek, setSelectedAnneMeslek] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  
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
    endDateParam: string = ""
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, fetchBasvurular, startDate, endDate])

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
    newEndDate?: string
  ) => {
    setCurrentPage(1)
    const sinifToUse = newSinif !== undefined ? newSinif : selectedSinif
    const okulToUse = newOkul !== undefined ? newOkul : selectedOkul
    const babaMeslekToUse = newBabaMeslek !== undefined ? newBabaMeslek : selectedBabaMeslek
    const anneMeslekToUse = newAnneMeslek !== undefined ? newAnneMeslek : selectedAnneMeslek
    const startDateToUse = newStartDate !== undefined ? newStartDate : startDate
    const endDateToUse = newEndDate !== undefined ? newEndDate : endDate
    
    fetchBasvurular(
      1, 
      searchTerm, 
      sinifToUse, 
      okulToUse, 
      babaMeslekToUse, 
      anneMeslekToUse,
      startDateToUse,
      endDateToUse
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
    setCurrentPage(1)
    fetchBasvurular(1, "", "", "", "", "", "", "")
    fetchStats()
  }

  const hasActiveFilters = searchTerm || selectedSinif || selectedOkul || selectedBabaMeslek || selectedAnneMeslek || startDate || endDate

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="page-header animate-fade-in mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-title">Bursluluk Sınavı Başvuruları</h1>
            <p className="page-subtitle">Başvuru sisteminden gelen başvurular</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Senkronize Ediliyor...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Geçmiş Başvuruları Senkronize Et
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
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Test Başvurularını Sil
              </Button>
            )}
            <Button
              onClick={handleExport}
              disabled={isExporting || totalBasvurular === 0}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  İndiriliyor...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel İndir
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Senkronizasyon Tamamlandı!</p>
                  <p className="text-sm text-green-700">
                    {syncResult.synced} yeni başvuru eklendi, {syncResult.skipped} başvuru zaten mevcuttu
                    {syncResult.errors > 0 && `, ${syncResult.errors} hata oluştu`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSyncResult(null)}
                className="text-green-700 hover:text-green-900"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Toplam Başvuru</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-emerald-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Bugün</p>
                <p className="text-3xl font-bold">{stats.today}</p>
              </div>
              <Clock className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-600 to-amber-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Bu Hafta</p>
                <p className="text-3xl font-bold">{stats.thisWeek}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Bu Ay</p>
                <p className="text-3xl font-bold">{stats.thisMonth}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtrelenmiş Sonuç Sayısı */}
      {hasActiveFilters && (
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="font-semibold text-indigo-900">
                    Filtrelenmiş Sonuç: <span className="text-2xl">{filteredCount}</span> başvuru
                  </p>
                  {selectedSinif && (
                    <p className="text-sm text-indigo-700 mt-1">
                      {selectedSinif} için toplam: {stats.sinifStats[selectedSinif] || 0} başvuru
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sınıf Bazında İstatistikler */}
      {Object.keys(stats.sinifStats).length > 0 && (
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              Sınıf Bazında Başvurular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {siniflar.map((sinif) => {
                const count = stats.sinifStats[sinif] || 0
                return (
                  <div
                    key={sinif}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedSinif === sinif
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <p className="text-xs text-gray-600 mb-1">{sinif}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Öğrenci adı, TC, email, okul veya veli adı ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4 mr-2" />
                Ara
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-blue-50 border-blue-300" : ""}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtreler
                {showFilters ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Temizle
                </Button>
              )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <GraduationCap className="h-4 w-4 inline mr-1" />
                    Sınıf
                  </Label>
                  <select
                    value={selectedSinif}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSelectedSinif(newValue)
                      handleFilterChange(newValue)
                    }}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <School className="h-4 w-4 inline mr-1" />
                    Okul
                  </Label>
                  <select
                    value={selectedOkul}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSelectedOkul(newValue)
                      handleFilterChange(undefined, newValue)
                    }}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Briefcase className="h-4 w-4 inline mr-1" />
                    Baba Meslek
                  </Label>
                  <select
                    value={selectedBabaMeslek}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSelectedBabaMeslek(newValue)
                      handleFilterChange(undefined, undefined, newValue)
                    }}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Briefcase className="h-4 w-4 inline mr-1" />
                    Anne Meslek
                  </Label>
                  <select
                    value={selectedAnneMeslek}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSelectedAnneMeslek(newValue)
                      handleFilterChange(undefined, undefined, undefined, newValue)
                    }}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Calendar className="h-4 w-4 inline mr-1" />
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
                    className="w-full h-10"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Calendar className="h-4 w-4 inline mr-1" />
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
                    className="w-full h-10"
                  />
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedSinif && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Sınıf: {selectedSinif}
                    <button
                      onClick={() => {
                        setSelectedSinif("")
                        handleFilterChange("")
                      }}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedOkul && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    Okul: {selectedOkul.length > 30 ? selectedOkul.substring(0, 30) + '...' : selectedOkul}
                    <button
                      onClick={() => {
                        setSelectedOkul("")
                        handleFilterChange(undefined, "")
                      }}
                      className="hover:text-green-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedBabaMeslek && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    Baba Meslek: {selectedBabaMeslek}
                    <button
                      onClick={() => {
                        setSelectedBabaMeslek("")
                        handleFilterChange(undefined, undefined, "")
                      }}
                      className="hover:text-purple-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedAnneMeslek && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                    Anne Meslek: {selectedAnneMeslek}
                    <button
                      onClick={() => {
                        setSelectedAnneMeslek("")
                        handleFilterChange(undefined, undefined, undefined, "")
                      }}
                      className="hover:text-pink-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {startDate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
                    Başlangıç: {new Date(startDate).toLocaleDateString('tr-TR')}
                    <button
                      onClick={() => {
                        setStartDate("")
                        handleFilterChange(undefined, undefined, undefined, undefined, "")
                      }}
                      className="hover:text-teal-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {endDate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
                    Bitiş: {new Date(endDate).toLocaleDateString('tr-TR')}
                    <button
                      onClick={() => {
                        setEndDate("")
                        handleFilterChange(undefined, undefined, undefined, undefined, undefined, "")
                      }}
                      className="hover:text-teal-900"
                    >
                      <X className="h-3 w-3" />
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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : basvurular.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-12 pb-12 text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg font-medium">
              {hasActiveFilters ? "Filtreleme kriterlerinize uygun başvuru bulunamadı." : "Henüz başvuru bulunmamaktadır."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="mt-4"
              >
                Filtreleri Temizle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 mb-6">
            {basvurular.map((basvuru, index) => (
              <Card
                key={basvuru.id}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
                onClick={() => setSelectedBasvuru(basvuru)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                          {basvuru.ogrenciAdSoyad.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {basvuru.ogrenciAdSoyad}
                          </h3>
                          <p className="text-sm text-gray-500">TC: {basvuru.ogrenciTc}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <School className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-gray-700 truncate" title={basvuru.okul}>
                            {basvuru.okul}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <GraduationCap className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                          <span className="text-gray-700">
                            {basvuru.ogrenciSinifi} · {basvuru.ogrenciSube} Şubesi
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{basvuru.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          <span className="text-gray-700">
                            {new Date(basvuru.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedBasvuru(basvuru)
                        }}
                        className="group-hover:border-blue-300 group-hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Detay
                      </Button>
                      {(basvuru.ogrenciAdSoyad.includes('TEST') || 
                        basvuru.okul === 'Test Okulu' || 
                        basvuru.externalId.startsWith('test-')) && (
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(basvuru.id, basvuru.ogrenciAdSoyad)
                          }}
                          disabled={deletingId === basvuru.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                        >
                          {deletingId === basvuru.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Önceki
              </Button>
              <span className="text-sm text-gray-600 px-4">
                Sayfa {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedBasvuru(null)}
        >
          <Card
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto border-0 shadow-2xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedBasvuru.ogrenciAdSoyad}</CardTitle>
                  <CardDescription className="text-blue-100 mt-2">
                    Başvuru Detayları
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedBasvuru(null)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Öğrenci Bilgileri */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Öğrenci Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-sm">Ad Soyad</Label>
                      <p className="font-semibold">{selectedBasvuru.ogrenciAdSoyad}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">TC Kimlik No</Label>
                      <p className="font-semibold">{selectedBasvuru.ogrenciTc}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Okul</Label>
                      <p className="font-semibold">{selectedBasvuru.okul}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Sınıf / Şube</Label>
                      <p className="font-semibold">
                        {selectedBasvuru.ogrenciSinifi} · {selectedBasvuru.ogrenciSube} Şubesi
                      </p>
                    </div>
                  </div>
                </div>

                {/* Baba Bilgileri */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-600" />
                    Baba Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-sm">Ad Soyad</Label>
                      <p className="font-semibold">{selectedBasvuru.babaAdSoyad}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Meslek</Label>
                      <p className="font-semibold">{selectedBasvuru.babaMeslek}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Cep Telefonu</Label>
                      <p className="font-semibold flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {formatPhone(selectedBasvuru.babaCepTel)}
                      </p>
                    </div>
                    {selectedBasvuru.babaIsAdresi && (
                      <div>
                        <Label className="text-gray-500 text-sm">İş Adresi</Label>
                        <p className="font-semibold">{selectedBasvuru.babaIsAdresi}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Anne Bilgileri */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-pink-600" />
                    Anne Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-sm">Ad Soyad</Label>
                      <p className="font-semibold">{selectedBasvuru.anneAdSoyad}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Meslek</Label>
                      <p className="font-semibold">{selectedBasvuru.anneMeslek}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Cep Telefonu</Label>
                      <p className="font-semibold flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {formatPhone(selectedBasvuru.anneCepTel)}
                      </p>
                    </div>
                    {selectedBasvuru.anneIsAdresi && (
                      <div>
                        <Label className="text-gray-500 text-sm">İş Adresi</Label>
                        <p className="font-semibold">{selectedBasvuru.anneIsAdresi}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* İletişim Bilgileri */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-green-600" />
                    İletişim Bilgileri
                  </h3>
                  <div>
                    <Label className="text-gray-500 text-sm">E-posta</Label>
                    <p className="font-semibold">{selectedBasvuru.email}</p>
                  </div>
                </div>

                {/* Tarih Bilgileri */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-500 text-sm">Başvuru Tarihi</Label>
                      <p className="font-semibold">
                        {new Date(selectedBasvuru.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Senkronizasyon Tarihi</Label>
                      <p className="font-semibold">
                        {new Date(selectedBasvuru.syncedAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
