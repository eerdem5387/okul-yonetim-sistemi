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

    setFilteredContracts(filtered)
    setCurrentPage(1) // Filtreleme yapıldığında sayfa 1'e dön
  }, [contracts, searchTerm, filterType])

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

      const allContracts: Contract[] = [
        ...(Array.isArray(newRegistrations) ? newRegistrations.map((c: Record<string, unknown>) => ({ ...c, type: "Yeni Kayıt" } as Contract)) : []),
        ...(Array.isArray(renewals) ? renewals.map((c: Record<string, unknown>) => ({ ...c, type: "Kayıt Yenileme" } as Contract)) : []),
        ...(Array.isArray(uniforms) ? uniforms.map((c: Record<string, unknown>) => ({ ...c, type: "Forma Sözleşmesi" } as Contract)) : []),
        ...(Array.isArray(meals) ? meals.map((c: Record<string, unknown>) => ({ ...c, type: "Yemek Sözleşmesi" } as Contract)) : []),
        ...(Array.isArray(services) ? services.map((c: Record<string, unknown>) => ({ ...c, type: "Servis Sözleşmesi" } as Contract)) : []),
        ...(Array.isArray(books) ? books.map((c: Record<string, unknown>) => ({ ...c, type: "Kitap Sözleşmesi" } as Contract)) : [])
      ]

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
      let endpoint = `/api/pdf/${contractSlug}/${contract.student.tcNumber}`
      let requestBody = null
      
      if (contract.type === "Yeni Kayıt" || contract.type === "Kayıt Yenileme") {
        endpoint = `/api/pdf/combined/${contract.student.tcNumber}`
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
        console.error("PDF download failed:", response.status, response.statusText)
        alert("PDF indirme başarısız oldu. Lütfen tekrar deneyin.")
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
          return { success: false, error: error.message }
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Geçmiş Sözleşmeler</h1>
        <p className="text-gray-600 mt-2">Tüm sözleşmeleri görüntüleyin ve filtreleyin</p>
      </div>

      {/* Filtreleme ve Arama */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtreleme ve Arama
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="search">Arama</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Öğrenci adı, soyadı veya TC kimlik no"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filterType">Sözleşme Türü</Label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
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
          </div>
          
          {/* Toplu İşlemler */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
            >
              {selectAll ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
              {selectAll ? "Seçimi Kaldır" : "Tümünü Seç"}
            </Button>
            
            {selectedContracts.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Seçilenleri Sil ({selectedContracts.size})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sözleşmeler Listesi */}
      <div className="space-y-2">
        {currentContracts.length > 0 ? (
          currentContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Sol taraf - Seçim kutusu ve temel bilgiler */}
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedContracts.has(contract.id)}
                      onChange={() => handleSelectContract(contract.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-lg">{contract.type}</span>
                        <span className="text-gray-600">
                          {contract.student.firstName} {contract.student.lastName}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(contract.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sağ taraf - Butonlar */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditContract(contract)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      onClick={() => handleDownloadPDF(contract)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      onClick={() => handleDeleteContract(contract)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Sil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Hiç sözleşme bulunamadı</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {startIndex + 1}-{Math.min(endIndex, filteredContracts.length)} / {filteredContracts.length} sözleşme
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
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
                        className="w-10"
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
