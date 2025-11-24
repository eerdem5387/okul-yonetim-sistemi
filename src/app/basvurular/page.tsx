"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Eye, Calendar, User, Mail, Phone, School, GraduationCap, Building2, Briefcase, MapPin, X } from "lucide-react"

interface Basvuru {
  id: string
  externalId: string
  ogrenciAdSoyad: string
  ogrenciTc: string
  okul: string
  ogrenciSinifi: string
  babaAdSoyad: string
  babaMeslek: string
  babaIsAdresi: string | null
  babaCepTel: string
  anneAdSoyad: string
  anneMeslek: string
  anneIsAdresi: string | null
  anneCepTel: string
  email: string
  createdAt: string
  syncedAt: string
}

export default function BasvurularPage() {
  const [basvurular, setBasvurular] = useState<Basvuru[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBasvurular, setTotalBasvurular] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBasvuru, setSelectedBasvuru] = useState<Basvuru | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBasvurular = useCallback(async (page: number = 1, search: string = "") => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      })
      if (search.trim()) {
        params.append("search", search.trim())
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
      } else {
        setBasvurular([])
        setTotalPages(1)
        setTotalBasvurular(0)
      }
    } catch (error) {
      console.error("Error fetching basvurular:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBasvurular(currentPage, searchTerm)
  }, [currentPage, fetchBasvurular])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchBasvurular(1, searchTerm)
  }

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `0${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 8)} ${phone.slice(8)}`
    }
    return phone
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="page-header animate-fade-in mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Bursluluk Sınavı Başvuruları</h1>
            <p className="page-subtitle">Başvuru sisteminden gelen başvurular</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{totalBasvurular}</div>
            <div className="text-sm text-gray-500">Toplam Başvuru</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardContent className="pt-6">
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
            {searchTerm && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setCurrentPage(1)
                  fetchBasvurular(1, "")
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Temizle
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basvurular List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="spinner" />
        </div>
      ) : basvurular.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-12 pb-12 text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">Henüz başvuru bulunmamaktadır.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 mb-6">
            {basvurular.map((basvuru) => (
              <Card
                key={basvuru.id}
                className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedBasvuru(basvuru)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {basvuru.ogrenciAdSoyad.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{basvuru.ogrenciAdSoyad}</h3>
                          <p className="text-sm text-gray-500">TC: {basvuru.ogrenciTc}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <School className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-700">{basvuru.okul}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <GraduationCap className="h-4 w-4 text-indigo-600" />
                          <span className="text-gray-700">{basvuru.ogrenciSinifi}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-green-600" />
                          <span className="text-gray-700">{basvuru.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-orange-600" />
                          <span className="text-gray-700">
                            {new Date(basvuru.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedBasvuru(basvuru)
                      }}
                      className="ml-4"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detay
                    </Button>
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
              <span className="text-sm text-gray-600">
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedBasvuru(null)}
        >
          <Card
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto border-0 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
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
                      <Label className="text-gray-500 text-sm">Sınıf</Label>
                      <p className="font-semibold">{selectedBasvuru.ogrenciSinifi}</p>
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

