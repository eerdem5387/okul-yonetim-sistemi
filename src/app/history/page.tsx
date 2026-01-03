"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Search, Filter, Edit, Trash2, CheckSquare, Square } from "lucide-react"

interface Contract {
  id: string
  type: string
  student: {
    id: string
    firstName: string
    lastName: string
    tcNumber: string
  }
  contractData: Record<string, unknown>
  createdAt: string
  pdfPath?: string
}

export default function HistoryPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)

  useEffect(() => {
    fetchContracts()
  }, [])

  const filterContracts = useCallback(() => {
    let filtered = contracts

    if (searchTerm) {
      filtered = filtered.filter(contract =>
        contract.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.student.tcNumber.includes(searchTerm)
      )
    }

    if (filterType !== "all") {
      filtered = filtered.filter(contract => contract.type === filterType)
    }

    // Tarih filtresi
    if (dateFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(contract => {
        const contractDate = new Date(contract.createdAt)
        const contractDay = new Date(contractDate.getFullYear(), contractDate.getMonth(), contractDate.getDate())
        
        if (dateFilter === "today") {
          return contractDay.getTime() === today.getTime()
        } else if (dateFilter === "week") {
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          return contractDay >= weekAgo
        } else if (dateFilter === "month") {
          return contractDate.getMonth() === now.getMonth() && contractDate.getFullYear() === now.getFullYear()
        } else if (dateFilter === "year") {
          return contractDate.getFullYear() === now.getFullYear()
        } else if (dateFilter === "custom" && startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          return contractDay >= start && contractDay <= end
        }
        return true
      })
    }

    setFilteredContracts(filtered)
    setCurrentPage(1) // Filtreleme yapıldığında sayfa 1'e dön
  }, [contracts, searchTerm, filterType, dateFilter, startDate, endDate])

  useEffect(() => {
    filterContracts()
  }, [filterContracts])

  const fetchContracts = async () => {
    try {
      const [newRegistrationsRes, renewalsRes, uniformsRes, mealsRes, servicesRes, booksRes] = await Promise.all([
        fetch("/api/new-registrations"),
        fetch("/api/renewals"),
        fetch("/api/uniform-contracts"),
        fetch("/api/meal-contracts"),
        fetch("/api/service-contracts"),
        fetch("/api/book-contracts")
      ])

      const [newRegistrations, renewals, uniforms, meals, services, books] = await Promise.all([
        newRegistrationsRes.ok ? newRegistrationsRes.json() : [],
        renewalsRes.ok ? renewalsRes.json() : [],
        uniformsRes.ok ? uniformsRes.json() : [],
        mealsRes.ok ? mealsRes.json() : [],
        servicesRes.ok ? servicesRes.json() : [],
        booksRes.ok ? booksRes.json() : []
      ])

      // Tüm sözleşmeleri topla
      const allContractsRaw: Contract[] = [
        ...(Array.isArray(newRegistrations) ? newRegistrations.map((c: Record<string, unknown>) => ({ ...c, type: "Yeni Kayıt" } as Contract)) : []),
        ...(Array.isArray(renewals) ? renewals.map((c: Record<string, unknown>) => ({ ...c, type: "Kayıt Yenileme" } as Contract)) : []),
        ...(Array.isArray(uniforms) ? uniforms.map((c: Record<string, unknown>) => ({ ...c, type: "Forma Sözleşmesi" } as Contract)) : []),
        ...(Array.isArray(meals) ? meals.map((c: Record<string, unknown>) => ({ ...c, type: "Yemek Sözleşmesi" } as Contract)) : []),
        ...(Array.isArray(services) ? services.map((c: Record<string, unknown>) => ({ ...c, type: "Servis Sözleşmesi" } as Contract)) : []),
        ...(Array.isArray(books) ? books.map((c: Record<string, unknown>) => ({ ...c, type: "Kitap Sözleşmesi" } as Contract)) : [])
      ]

      // Akıllı gruplama: Ana sözleşme varsa yan sözleşmeleri gizle
      const allContracts: Contract[] = []
      const processedStudents = new Set<string>()

      // Önce ana sözleşmeleri ekle
      allContractsRaw.forEach(contract => {
        if (contract.type === "Yeni Kayıt" || contract.type === "Kayıt Yenileme") {
          allContracts.push(contract)
          processedStudents.add(contract.student.tcNumber)
        }
      })

      // Sonra yan sözleşmeleri ekle (sadece ana sözleşmesi olmayan öğrenciler için)
      allContractsRaw.forEach(contract => {
        if (contract.type !== "Yeni Kayıt" && contract.type !== "Kayıt Yenileme") {
          if (!processedStudents.has(contract.student.tcNumber)) {
            allContracts.push(contract)
          }
        }
      })

      setContracts(allContracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (error) {
      console.error("Error fetching contracts:", error)
      setContracts([])
    }
  }

  

  const getContractTypeSlug = (contractType: string) => {
    const typeMapping: Record<string, string> = {
      "Yeni Kayıt": "new-registration",
      "Kayıt Yenileme": "renewal", 
      "Forma Sözleşmesi": "uniform",
      "Yemek Sözleşmesi": "meal",
      "Servis Sözleşmesi": "service",
      "Kitap Sözleşmesi": "book"
    }
    return typeMapping[contractType] || contractType.toLowerCase().replace(/\s+/g, '-')
  }

  const handleDownloadPDF = async (contract: Contract) => {
    try {
      const contractSlug = getContractTypeSlug(contract.type)
      
      // Yeni Kayıt ve Kayıt Yenileme için combined endpoint kullan
      let endpoint = `/api/pdf/${contractSlug}/${contract.id}`
      let requestBody = null
      
      if (contract.type === "Yeni Kayıt" || contract.type === "Kayıt Yenileme") {
        endpoint = `/api/pdf/combined/${contract.id}`
        requestBody = {
          contractTypes: [contractSlug],
          mainContractData: contract.contractData,
          otherContractData: {}
        }
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody ? JSON.stringify(requestBody) : undefined
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${contract.type}-${contract.student.firstName}-${contract.student.lastName}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        console.error("PDF download failed:", response.status, response.statusText, errorData)
        alert(`PDF indirme başarısız oldu!\n\nHata: ${errorData.details || errorData.error || "Bilinmeyen hata"}`)
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("PDF indirme sırasında bir hata oluştu.")
    }
  }

  const handleEditContract = (contract: Contract) => {
    const contractSlug = getContractTypeSlug(contract.type)
    // Sözleşme düzenleme sayfasına yönlendir
    window.location.href = `/edit-${contractSlug}/${contract.id}`
  }

  const handleDeleteContract = async (contract: Contract) => {
    if (!confirm(`${contract.type} sözleşmesini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      const contractSlug = getContractTypeSlug(contract.type)
      const endpoint = contractSlug === "new-registration" 
        ? `/api/new-registrations/${contract.id}`
        : contractSlug === "renewal"
        ? `/api/renewals/${contract.id}`
        : `/api/${contractSlug}-contracts/${contract.id}`

      const response = await fetch(endpoint, {
        method: "DELETE"
      })

      if (response.ok) {
        alert("Sözleşme başarıyla silindi!")
        fetchContracts() // Listeyi yenile
      } else {
        const errorText = await response.text()
        console.error("Delete failed:", response.status, errorText)
        alert(`Sözleşme silinirken bir hata oluştu. (HTTP ${response.status})`)
      }
    } catch (error) {
      console.error("Error deleting contract:", error)
      alert("Sözleşme silinirken bir hata oluştu.")
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedContracts(new Set())
      setSelectAll(false)
    } else {
      const allIds = new Set(filteredContracts.map(contract => contract.id))
      setSelectedContracts(allIds)
      setSelectAll(true)
    }
  }

  const handleSelectContract = (contractId: string) => {
    const newSelected = new Set(selectedContracts)
    if (newSelected.has(contractId)) {
      newSelected.delete(contractId)
    } else {
      newSelected.add(contractId)
    }
    setSelectedContracts(newSelected)
    setSelectAll(newSelected.size === filteredContracts.length)
  }

  const handleBulkDelete = async () => {
    if (selectedContracts.size === 0) {
      alert("Lütfen silinecek sözleşmeleri seçin.")
      return
    }

    if (!confirm(`${selectedContracts.size} sözleşmeyi silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      const deletePromises = Array.from(selectedContracts).map(async (contractId) => {
        const contract = contracts.find(c => c.id === contractId)
        if (!contract) return { success: false, error: "Contract not found" }

        const contractSlug = getContractTypeSlug(contract.type)
        const endpoint = contractSlug === "new-registration" 
          ? `/api/new-registrations/${contractId}`
          : contractSlug === "renewal"
          ? `/api/renewals/${contractId}`
          : `/api/${contractSlug}-contracts/${contractId}`

        try {
          const response = await fetch(endpoint, { method: "DELETE" })
          return { success: response.ok, error: response.ok ? null : `HTTP ${response.status}` }
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) }
        }
      })

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      if (failureCount === 0) {
        alert(`${successCount} sözleşme başarıyla silindi!`)
        setSelectedContracts(new Set())
        setSelectAll(false)
        fetchContracts() // Listeyi yenile
      } else if (successCount === 0) {
        alert("Hiçbir sözleşme silinemedi. Lütfen tekrar deneyin.")
      } else {
        alert(`${successCount} sözleşme silindi, ${failureCount} sözleşme silinemedi.`)
        setSelectedContracts(new Set())
        setSelectAll(false)
        fetchContracts() // Listeyi yenile
      }
    } catch (error) {
      console.error("Error bulk deleting contracts:", error)
      alert("Sözleşmeler silinirken bir hata oluştu.")
    }
  }

  const handleBulkPDFDownload = async () => {
    if (selectedContracts.size === 0) return

    const confirmed = confirm(`${selectedContracts.size} sözleşmenin PDF&apos;ini indirmek istiyor musunuz?`)
    if (!confirmed) return

    try {
      const selectedContractsList = contracts.filter(c => selectedContracts.has(c.id))
      let successCount = 0
      let failureCount = 0

      // Her sözleşme için sırayla PDF indir
      for (const contract of selectedContractsList) {
        try {
          await handleDownloadPDF(contract)
          successCount++
          // Her indirme arasında küçük bir gecikme
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`Error downloading PDF for contract ${contract.id}:`, error)
          failureCount++
        }
      }

      if (failureCount === 0) {
        alert(`${successCount} PDF başarıyla indirildi!`)
      } else if (successCount === 0) {
        alert("Hiçbir PDF indirilemedi. Lütfen tekrar deneyin.")
      } else {
        alert(`${successCount} PDF indirildi, ${failureCount} PDF indirilemedi.`)
      }
    } catch (error) {
      console.error("Error bulk downloading PDFs:", error)
      alert("PDF&apos;ler indirilirken bir hata oluştu.")
    }
  }

  // Sayfalama hesaplamaları
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContracts = filteredContracts.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedContracts(new Set()) // Sayfa değiştiğinde seçimi temizle
    setSelectAll(false)
  }


  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Geçmiş Sözleşmeler</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">Tüm sözleşmeleri görüntüleyin ve filtreleyin</p>
      </div>

      {/* Filtreleme ve Arama */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filtreleme ve Arama
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <Label htmlFor="search" className="text-xs sm:text-sm">Arama</Label>
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Öğrenci adı, soyadı veya TC kimlik no"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filterType" className="text-xs sm:text-sm">Sözleşme Türü</Label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 border border-input bg-background rounded-md text-xs sm:text-sm"
              >
                <option value="all">Tümü</option>
                <option value="Yeni Kayıt">Yeni Kayıt</option>
                <option value="Kayıt Yenileme">Kayıt Yenileme</option>
                <option value="Forma Sözleşmesi">Forma Sözleşmesi</option>
                <option value="Yemek Sözleşmesi">Yemek Sözleşmesi</option>
                <option value="Servis Sözleşmesi">Servis Sözleşmesi</option>
                <option value="Kitap Sözleşmesi">Kitap Sözleşmesi</option>
              </select>
            </div>
            <div>
              <Label htmlFor="dateFilter" className="text-xs sm:text-sm">Tarih Filtresi</Label>
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-9 sm:h-10 px-2 sm:px-3 py-1.5 sm:py-2 border border-input bg-background rounded-md text-xs sm:text-sm"
              >
                <option value="all">Tüm Tarihler</option>
                <option value="today">Bugün</option>
                <option value="week">Bu Hafta</option>
                <option value="month">Bu Ay</option>
                <option value="year">Bu Yıl</option>
                <option value="custom">Özel Tarih Aralığı</option>
              </select>
            </div>
          </div>
          
          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <Label htmlFor="startDate" className="text-xs sm:text-sm">Başlangıç Tarihi</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-xs sm:text-sm">Bitiş Tarihi</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
          )}
          
          {/* Toplu İşlemler */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 lg:gap-4 pt-3 sm:pt-4 border-t">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm w-full sm:w-auto"
            >
              {selectAll ? <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> : <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
              {selectAll ? "Seçimi Kaldır" : "Tümünü Seç"}
            </Button>
            
            {selectedContracts.size > 0 && (
              <>
                <Button
                  onClick={handleBulkPDFDownload}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm flex-1 sm:flex-initial"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Seçilenleri İndir</span>
                  <span className="sm:hidden">İndir</span> ({selectedContracts.size})
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                  className="text-xs sm:text-sm flex-1 sm:flex-initial"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Seçilenleri Sil</span>
                  <span className="sm:hidden">Sil</span> ({selectedContracts.size})
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sözleşmeler Listesi */}
      <div className="space-y-2 sm:space-y-3">
        {currentContracts.length > 0 ? (
          currentContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  {/* Sol taraf - Seçim kutusu ve temel bilgiler */}
                  <div className="flex items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedContracts.has(contract.id)}
                      onChange={() => handleSelectContract(contract.id)}
                      className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 rounded border-gray-300 mt-1 sm:mt-0 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 lg:gap-4">
                        <span className="font-medium text-sm sm:text-base lg:text-lg truncate">{contract.type}</span>
                        <span className="text-gray-600 text-xs sm:text-sm lg:text-base truncate">
                          {contract.student.firstName} {contract.student.lastName}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                          {new Date(contract.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                        {(() => {
                          const contractData = contract.contractData as Record<string, unknown> | null | undefined
                          const responsible = contractData && typeof contractData === 'object' && 'registrationResponsible' in contractData
                            ? contractData.registrationResponsible
                            : null
                          return responsible && typeof responsible === 'string' ? (
                            <span className="text-xs sm:text-sm text-blue-600 flex-shrink-0">
                              Kayıt: {responsible}
                            </span>
                          ) : null
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Sağ taraf - Butonlar */}
                  <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                    <Button
                      onClick={() => handleEditContract(contract)}
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Düzenle</span>
                    </Button>
                    <Button
                      onClick={() => handleDownloadPDF(contract)}
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                    <Button
                      onClick={() => handleDeleteContract(contract)}
                      variant="destructive"
                      size="sm"
                      className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Sil</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-6 sm:py-8 px-4">
              <p className="text-gray-500 text-xs sm:text-sm">Hiç sözleşme bulunamadı</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <Card className="mt-4 sm:mt-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                {startIndex + 1}-{Math.min(endIndex, filteredContracts.length)} / {filteredContracts.length} sözleşme
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  Önceki
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    if (pageNum > totalPages) return null
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 sm:w-10 text-xs sm:text-sm"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  Sonraki
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
