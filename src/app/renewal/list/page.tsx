"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Filter, ArrowLeft, Eye, Download, Calendar, User, GraduationCap, Trash2, TrendingUp, Edit } from "lucide-react"

const RENEWAL_LIST_SINIFLAR = [
  "5. Sınıf",
  "6. Sınıf",
  "7. Sınıf",
  "8. Sınıf",
  "9. Sınıf",
  "10. Sınıf",
  "11. Sınıf",
  "12. Sınıf",
] as const

interface Renewal {
  id: string
  studentId: string
  contractData: Record<string, unknown>
  createdAt: string
  updatedAt: string
  student: {
    id: string
    firstName: string
    lastName: string
    tcNumber: string
    grade?: string | null
  } | null
}

interface GroupedRenewal {
  tcNumber: string
  student: {
    id: string
    firstName: string
    lastName: string
    tcNumber: string
    grade?: string | null
  }
  contracts: Renewal[]
}

export default function RenewalsListPage() {
  const router = useRouter()
  const [groupedRenewals, setGroupedRenewals] = useState<GroupedRenewal[]>([])
  const [filteredGroupedRenewals, setFilteredGroupedRenewals] = useState<GroupedRenewal[]>([])
  const [selectedGroup, setSelectedGroup] = useState<GroupedRenewal | null>(null)
  const [selectedContract, setSelectedContract] = useState<Renewal | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Filtreleme state'leri
  const [searchTerm, setSearchTerm] = useState("")
  const [filterGrade, setFilterGrade] = useState("all")
  const [filterDate, setFilterDate] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  // İstatistikler
  const [stats, setStats] = useState({
    academicYearStats: {} as Record<string, number>,
    sinifBreakdown: {} as Record<
      string,
      { renewed: number; total: number; percent: number }
    >,
  })

  const gradeOptions = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "all"]

  // Type guard helper
  const safeString = (value: unknown): string => {
    if (value === null || value === undefined) return "Belirtilmemiş"
    if (typeof value === "string") return value
    if (typeof value === "number") return String(value)
    if (typeof value === "boolean") return String(value)
    return "Belirtilmemiş"
  }

  // Sözleşmedeki sınıfı "X. Sınıf" formatına çevir (filtre karşılaştırması için)
  const normalizeContractGrade = (value: unknown): string => {
    const s = String(value ?? "").trim()
    if (!s) return ""
    if (s.includes("Sınıf")) {
      const num = s.replace(/\D/g, "").trim()
      if (num) return `${num}. Sınıf`
      return s
    }
    const num = s.replace(/\D/g, "")
    if (num && !isNaN(parseInt(num, 10))) return `${num}. Sınıf`
    return s
  }

  // Sınıf formatı helper - "5" -> "5. Sınıf"
  const formatGrade = (value: unknown): string => {
    const gradeStr = safeString(value)
    if (gradeStr === "Belirtilmemiş") return gradeStr
    
    // Eğer zaten "X. Sınıf" formatındaysa olduğu gibi döndür
    if (gradeStr.includes(". Sınıf") || gradeStr.includes("Sınıf")) {
      return gradeStr
    }
    
    // Sadece rakam ise "X. Sınıf" formatına çevir
    const gradeNum = gradeStr.trim()
    if (/^\d+$/.test(gradeNum)) {
      return `${gradeNum}. Sınıf`
    }
    
    return gradeStr
  }

  const fetchRenewals = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/renewals")
      if (response.ok) {
        const data = await response.json()
        // Sadece geçerli student'ı olan kayıtları filtrele
        const validRenewals = Array.isArray(data) 
          ? data.filter((r: Renewal) => r.student !== null)
          : []
        
        // TC numarasına göre grupla
        const grouped = groupByTcNumber(validRenewals)
        setGroupedRenewals(grouped)
        setFilteredGroupedRenewals(grouped)
      } else {
        console.error("Error fetching renewals:", response.status)
      }
    } catch (error) {
      console.error("Error fetching renewals:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // TC numarasına göre gruplama fonksiyonu
  // Önce student.tcNumber'ı kullan (güncel ve doğru kaynak), yoksa contractData.tcNumber'ı kullan
  // student.tcNumber öncelikli çünkü TC düzeltildiğinde student tablosu güncelleniyor
  const groupByTcNumber = (renewals: Renewal[]): GroupedRenewal[] => {
    const groupedMap = new Map<string, Renewal[]>()
    
    renewals.forEach(renewal => {
      if (!renewal.student) return
      // Önce student.tcNumber'ı kullan (güncel ve doğru kaynak)
      let tcNumber = ''
      if (renewal.student.tcNumber && renewal.student.tcNumber.trim() !== '') {
        tcNumber = renewal.student.tcNumber.trim()
      } else {
        // Eğer student.tcNumber yoksa, contractData.tcNumber'ı kullan
        const contractData = renewal.contractData as Record<string, unknown>
        const tcNumberFromContract = contractData.tcNumber as string | undefined
        tcNumber = (tcNumberFromContract && typeof tcNumberFromContract === 'string' && tcNumberFromContract.trim() !== '') 
          ? tcNumberFromContract.trim() 
          : ''
      }
      
      if (!tcNumber) return // TC numarası yoksa atla
      
      if (!groupedMap.has(tcNumber)) {
        groupedMap.set(tcNumber, [])
      }
      groupedMap.get(tcNumber)!.push(renewal)
    })
    
    return Array.from(groupedMap.entries()).map(([tcNumber, contracts]) => ({
      tcNumber,
      student: contracts[0].student!,
      contracts: contracts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }))
  }

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/renewals/stats`)
      if (response.ok) {
        const data = await response.json()
        if (data && typeof data === 'object') {
          setStats({
            academicYearStats: data.academicYearStats || {},
            sinifBreakdown: data.sinifBreakdown || {},
          })
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [])

  const handleExportExcel = useCallback(async () => {
    try {
      const res = await fetch("/api/renewals/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "kayit-yenilemeler.xlsx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      console.error("Export error:", e)
      alert("Excel dışa aktarım başarısız oldu")
    }
  }, [])

  useEffect(() => {
    fetchRenewals()
    fetchStats()
  }, [fetchRenewals, fetchStats])

  // Sayfa görünür olduğunda verileri yenile (düzenleme sonrası senkronizasyon için)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRenewals()
        fetchStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchRenewals, fetchStats])

  // Filtreleme
  useEffect(() => {
    let filtered = groupedRenewals

    // Arama filtresi
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(group => {
        return (
          group.student.firstName.toLowerCase().includes(searchLower) ||
          group.student.lastName.toLowerCase().includes(searchLower) ||
          group.student.tcNumber.includes(searchTerm)
        )
      })
    }

    // Sınıf filtresi: sözleşmedeki sınıf (studentClass) yoksa öğrenci sınıfı (student.grade) kullanılır – liste ile aynı mantık
    if (filterGrade !== "all") {
      const gradeMatch = (renewal: Renewal) => {
        const contractData = renewal.contractData as Record<string, unknown>
        const rawGrade = (contractData?.studentClass as string) || renewal.student?.grade || ""
        const normalized = normalizeContractGrade(rawGrade)
        return normalized === filterGrade
      }
      filtered = filtered
        .filter(group => group.contracts.some(gradeMatch))
        .map(group => ({
          ...group,
          contracts: group.contracts.filter(gradeMatch)
        }))
    }

    // Tarih filtresi
    if (filterDate === "today") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      filtered = filtered.filter(group => {
        return group.contracts.some(renewal => {
          const createdAt = new Date(renewal.createdAt)
          createdAt.setHours(0, 0, 0, 0)
          return createdAt.getTime() === today.getTime()
        })
      })
    } else if (filterDate === "week") {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = filtered.filter(group => {
        return group.contracts.some(renewal => new Date(renewal.createdAt) >= weekAgo)
      })
    } else if (filterDate === "month") {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      filtered = filtered.filter(group => {
        return group.contracts.some(renewal => {
          const createdAt = new Date(renewal.createdAt)
          createdAt.setHours(0, 0, 0, 0)
          return createdAt >= monthAgo
        })
      })
    } else if (filterDate === "custom" && startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(group => {
        return group.contracts.some(renewal => {
          const createdAt = new Date(renewal.createdAt)
          return createdAt >= start && createdAt <= end
        })
      })
    }

    setFilteredGroupedRenewals(filtered)
  }, [groupedRenewals, searchTerm, filterGrade, filterDate, startDate, endDate])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const handleViewDetails = (group: GroupedRenewal) => {
    setSelectedGroup(group)
  }

  const handleViewContractDetails = (contract: Renewal) => {
    setSelectedContract(contract)
  }

  const handleDownloadPDF = async (renewalId: string) => {
    try {
      const response = await fetch(`/api/pdf/combined/${renewalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kayit-yenileme-${renewalId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("PDF indirme başarısız oldu!")
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("PDF indirme sırasında bir hata oluştu!")
    }
  }

  const handleDeleteRenewal = async (renewalId: string, firstName: string, lastName: string) => {
    if (!confirm(`"${firstName} ${lastName}" adlı öğrencinin kayıt yenileme kaydını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return
    }

    try {
      const response = await fetch('/api/renewals', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractIds: renewalId })
      })

      if (response.ok) {
        alert('✅ Kayıt yenileme başarıyla silindi!')
        // Listeyi yenile
        fetchRenewals()
        // Eğer silinen kayıt detay görünümündeyse, detay görünümünü kapat
        if (selectedContract?.id === renewalId) {
          setSelectedContract(null)
        }
        if (selectedGroup && selectedGroup.contracts.some(c => c.id === renewalId)) {
          setSelectedGroup(null)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`❌ Kayıt yenileme silinirken hata oluştu: ${errorData.error || 'Bilinmeyen hata'}`)
      }
    } catch (error) {
      console.error("Error deleting renewal:", error)
      alert("Kayıt yenileme silme sırasında bir hata oluştu!")
    }
  }

  // Birden fazla sözleşmesi olan öğrenci için detay görünümü
  if (selectedGroup && selectedGroup.contracts.length > 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => setSelectedGroup(null)}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>

          <Card className="shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                {selectedGroup.student.firstName} {selectedGroup.student.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm text-gray-600">TC Kimlik No</Label>
                  <p className="font-medium">{selectedGroup.student.tcNumber}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Toplam Sözleşme</Label>
                  <p className="font-medium">{selectedGroup.contracts.length} sözleşme</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Sözleşmeler</h2>
            {selectedGroup.contracts.map((contract) => {
              const contractData = contract.contractData as Record<string, unknown>
              return (
                <Card key={contract.id} className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {formatGrade(contractData.studentClass || contract.student?.grade || '')} - {String(contractData.academicYear || 'Belirtilmemiş')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label className="text-sm text-gray-600">Kayıt Tarihi</Label>
                        <p className="font-medium">{formatDate(contract.createdAt)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Sözleşme No</Label>
                        <p className="font-medium">{safeString(contractData.contractNo)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewContractDetails(contract)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Detayları Gör
                      </Button>
                      <Button
                        onClick={() => router.push(`/edit-renewal/${contract.id}`)}
                        variant="outline"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Düzenle
                      </Button>
                      <Button
                        onClick={() => handleDownloadPDF(contract.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF İndir
                      </Button>
                      <Button
                        onClick={() => handleDeleteRenewal(contract.id, selectedGroup.student.firstName, selectedGroup.student.lastName)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Sil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Tek sözleşme detay görünümü
  if (selectedContract) {
    const contractData = selectedContract.contractData as Record<string, unknown>
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => {
              setSelectedContract(null)
              if (selectedGroup) {
                setSelectedGroup(null)
              }
            }}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Kayıt Yenileme Detayları</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => router.push(`/edit-renewal/${selectedContract.id}`)}
                    variant="outline"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Düzenle
                  </Button>
                  <Button
                    onClick={() => handleDownloadPDF(selectedContract.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF İndir
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Öğrenci Bilgileri */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Öğrenci Bilgileri
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Ad Soyad</Label>
                    <p className="font-medium">
                      {selectedContract.student?.firstName} {selectedContract.student?.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">TC Kimlik No</Label>
                    <p className="font-medium">{selectedContract.student?.tcNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Sınıf</Label>
                    <p className="font-medium">{safeString(contractData.studentClass || selectedContract.student?.grade)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Doğum Tarihi</Label>
                    <p className="font-medium">{safeString(contractData.studentBirthDate)}</p>
                  </div>
                </div>
              </div>

              {/* Sözleşme Bilgileri */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  Sözleşme Bilgileri
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Sözleşme No</Label>
                    <p className="font-medium">{safeString(contractData.contractNo)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Kayıt Tarihi</Label>
                    <p className="font-medium">{formatDate(selectedContract.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Kayıt Sorumlusu</Label>
                    <p className="font-medium">{safeString(contractData.registrationResponsible)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Kayıt/Kayıt Yenileme Tarihi</Label>
                    <p className="font-medium">{safeString(contractData.registrationDate)}</p>
                  </div>
                </div>
              </div>

              {/* Ödeme Bilgileri */}
              {(contractData.announcedTuitionFee != null || contractData.studentTuitionFee != null) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Öğrenim Ücreti</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Kurumun İlan Ettiği Ücret</Label>
                      <p className="font-medium">{safeString(contractData.announcedTuitionFee)}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Öğrenci İçin Belirlenen Ücret</Label>
                      <p className="font-medium">{safeString(contractData.studentTuitionFee)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Diğer Bilgiler */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Diğer Bilgiler</h3>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(contractData)
                      .filter(([key]) => {
                        // Zaten gösterilen alanları filtrele
                        const excludedKeys = [
                          'studentClass', 'studentBirthDate', 'contractNo', 
                          'registrationDate', 'registrationResponsible',
                          'announcedTuitionFee', 'studentTuitionFee'
                        ]
                        return !excludedKeys.includes(key)
                      })
                      .map(([key, value]) => {
                        // Key'i Türkçe'ye çevir
                        const labelMap: Record<string, string> = {
                          'address': 'Adres',
                          'studentTC': 'Öğrenci TC Kimlik No',
                          'downPayment': 'Peşinat',
                          'studentName': 'Öğrenci Adı',
                          'contractDate': 'Sözleşme Tarihi',
                          'installments': 'Taksitler',
                          'servicePrice': 'Servis Ücreti',
                          'studentTotal': 'Öğrenci Toplam',
                          'otherDiscount': 'Diğer İndirim',
                          'registrarName': 'Kayıt Memuru',
                          'selectedClubs': 'Seçilen Kulüpler',
                          'serviceRegion': 'Servis Bölgesi',
                          'announcedTotal': 'İlan Edilen Toplam',
                          'studentBookFee': 'Öğrenci Kitap Ücreti',
                          'studentMealFee': 'Öğrenci Yemek Ücreti',
                          'parentSignature': 'Veli İmzası',
                          'schoolLicenseNo': 'Okul Lisans No',
                          'siblingDiscount': 'Kardeş İndirimi',
                          'announcedBookFee': 'İlan Edilen Kitap Ücreti',
                          'announcedMealFee': 'İlan Edilen Yemek Ücreti',
                          'studentCourseFee': 'Öğrenci Kurs Ücreti',
                          'corporateDiscount': 'Kurumsal İndirim',
                          'studentServiceFee': 'Öğrenci Servis Ücreti',
                          'announcedCourseFee': 'İlan Edilen Kurs Ücreti',
                          'contractParentName': 'Sözleşme Veli Adı',
                          'registrarSignature': 'Kayıt Memuru İmzası'
                        }
                        
                        const label = labelMap[key] || key
                        let displayValue: string = safeString(value)
                        
                        // Özel formatlamalar
                        if (key === 'installments' && Array.isArray(value)) {
                          displayValue = value.length > 0 
                            ? `${value.length} taksit` 
                            : 'Taksit yok'
                        } else if (key === 'selectedClubs' && Array.isArray(value)) {
                          displayValue = value.length > 0 
                            ? value.join(', ') 
                            : 'Kulüp seçilmemiş'
                        } else if (typeof value === 'boolean') {
                          displayValue = value ? 'Evet' : 'Hayır'
                        } else if (key.includes('Signature') && value) {
                          displayValue = 'İmzalı'
                        } else if (key.includes('Fee') || key.includes('Price') || key.includes('Total') || key === 'downPayment') {
                          const numValue = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : 0
                          if (!isNaN(numValue) && numValue > 0) {
                            displayValue = new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: 'TRY',
                              minimumFractionDigits: 0
                            }).format(numValue)
                          } else {
                            displayValue = 'Belirtilmemiş'
                          }
                        } else if (key === 'address' && !value) {
                          displayValue = 'Belirtilmemiş'
                        }
                        
                        const isEmpty = !value || (typeof value === 'string' && value.trim() === '') || 
                                       (Array.isArray(value) && value.length === 0) ||
                                       displayValue === 'Belirtilmemiş' || displayValue === 'Taksit yok' || 
                                       displayValue === 'Kulüp seçilmemiş'
                        
                        return (
                          <div 
                            key={key} 
                            className={`bg-white p-4 rounded-lg border transition-all ${
                              isEmpty 
                                ? 'border-gray-100 bg-gray-50/50' 
                                : 'border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200'
                            }`}
                          >
                            <Label className={`text-xs font-semibold uppercase tracking-wide mb-1 block ${
                              isEmpty ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {label}
                            </Label>
                            <p className={`text-sm font-medium break-words ${
                              isEmpty 
                                ? 'text-gray-400 italic' 
                                : 'text-gray-900'
                            }`}>
                              {displayValue}
                            </p>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Kayıt Yenilemeleri</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Yapılan tüm kayıt yenilemelerini görüntüleyin</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              className="flex items-center justify-center text-xs sm:text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel&apos;e Aktar
            </Button>
            <Button
              onClick={() => router.push('/renewal')}
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri Dön
            </Button>
          </div>
        </div>

        {/* Filtreleme */}
        <Card className="mb-4 sm:mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              Filtreleme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Arama</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Öğrenci adı, soyadı veya TC"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="grade">Sınıf</Label>
                <select
                  id="grade"
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="all">Tüm Sınıflar</option>
                  {gradeOptions.filter(g => g !== "all").map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dateFilter">Tarih Filtresi</Label>
                <select
                  id="dateFilter"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="all">Tüm Tarihler</option>
                  <option value="today">Bugün</option>
                  <option value="week">Son 7 Gün</option>
                  <option value="month">Son 30 Gün</option>
                  <option value="custom">Özel Tarih Aralığı</option>
                </select>
              </div>
              {filterDate === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="startDate">Başlangıç</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Bitiş</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 sm:mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              Sınıf bazında kayıt yenileme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              Pay: hedef akademik yıla uygun yenileme (benzersiz TC), payda: o düzeydeki toplam öğrenci
              (öğrenci yönetimi ile aynı sayım). Kaynak düzey: öğrencinin güncel sınıfı.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
              {RENEWAL_LIST_SINIFLAR.map((sinif) => {
                const b = stats.sinifBreakdown[sinif]
                const renewed = b?.renewed ?? 0
                const total = b?.total ?? 0
                const pct = b?.percent ?? 0
                return (
                  <div
                    key={sinif}
                    className="p-2 sm:p-3 rounded-lg border-2 border-gray-200 bg-white"
                  >
                    <p className="text-xs text-gray-600 mb-1 truncate">{sinif}</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 tabular-nums">
                      {renewed}/{total}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500 tabular-nums">%{pct}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Akademik Yıl Bazında İstatistikler */}
        {Object.keys(stats.academicYearStats).length > 0 && (
          <Card className="mb-4 sm:mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Akademik Yıl Bazında Kayıtlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {Object.entries(stats.academicYearStats)
                  .sort(([a], [b]) => {
                    // "Belirtilmemiş" her zaman en sona gelsin
                    if (a === 'Belirtilmemiş') return 1
                    if (b === 'Belirtilmemiş') return -1
                    // Diğerleri en yeni yıldan eskiye sırala
                    return b.localeCompare(a)
                  })
                  .map(([year, count]) => (
                    <div
                      key={year}
                      className="p-3 sm:p-4 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300 hover:bg-blue-100 transition-all"
                    >
                      <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{year}</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900">{count}</p>
                      <p className="text-xs text-gray-500 mt-1">Kayıt</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kayıt Listesi */}
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Yükleniyor...</p>
            </CardContent>
          </Card>
        ) : filteredGroupedRenewals.length > 0 ? (
          <div className="space-y-3">
            {filteredGroupedRenewals.map((group) => {
              const latestContract = group.contracts[0]
              const contractData = latestContract.contractData as Record<string, unknown>
              const hasMultipleContracts = group.contracts.length > 1
              
              return (
                <Card key={group.tcNumber} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-lg">
                            {group.student.firstName} {group.student.lastName}
                          </h3>
                          {hasMultipleContracts && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetails(group)
                              }}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
                            >
                              {group.contracts.length} sözleşme
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">TC:</span>
                            <span>{group.student.tcNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            <span className="flex items-center gap-1 flex-wrap">
                              <span>{safeString(contractData.studentClass || group.student.grade)}</span>
                              <span className="text-[11px] text-gray-500">
                                (Burada yazan sınıf düzeyi bir sonraki akademik yıl için geçerlidir. Öğrencinin mevcut eğitim gördüğü sınıf düzeyi değildir.)
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(latestContract.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasMultipleContracts ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDetails(group)
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Tüm Sözleşmeleri Gör
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewContractDetails(latestContract)
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Detay
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/edit-renewal/${latestContract.id}`)
                              }}
                              variant="outline"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Düzenle
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadPDF(latestContract.id)
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              PDF
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteRenewal(latestContract.id, group.student.firstName, group.student.lastName)
                              }}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm || filterGrade !== "all" || filterDate !== "all"
                  ? "Filtre kriterlerinize uygun kayıt bulunamadı."
                  : "Henüz kayıt bulunmuyor."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

