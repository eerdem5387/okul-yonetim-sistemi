"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Search, Filter, Eye, Edit } from "lucide-react"

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
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showModal, setShowModal] = useState(false)

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

  

  const handleDownloadPDF = async (contract: Contract) => {
    try {
      const response = await fetch(`/api/pdf/${contract.type.toLowerCase().replace(/\s+/g, '-')}/${contract.student.tcNumber}`)
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
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
    }
  }

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract)
    setShowModal(true)
  }

  const formatContractData = (contractData: Record<string, unknown>) => {
    const formattedData: Record<string, string> = {}
    
    Object.entries(contractData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        // Key'i daha okunabilir hale getir
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace(/studentName/g, 'Öğrenci Adı')
          .replace(/tcNumber/g, 'TC Kimlik No')
          .replace(/grade/g, 'Sınıf')
          .replace(/address/g, 'Adres')
          .replace(/parentName/g, 'Veli Adı')
          .replace(/parentPhone/g, 'Veli Telefon')
          .replace(/parentEmail/g, 'Veli E-posta')
          .replace(/uniformSize/g, 'Forma Bedeni')
          .replace(/uniformPrice/g, 'Forma Ücreti')
          .replace(/serviceRegion/g, 'Servis Bölgesi')
          .replace(/servicePrice/g, 'Servis Ücreti')
          .replace(/mealPrice/g, 'Yemek Ücreti')
          .replace(/bookSet/g, 'Kitap Seti')
          .replace(/deliveryDate/g, 'Teslim Tarihi')
          .replace(/academicYear/g, 'Eğitim Yılı')
          .replace(/tuitionFee/g, 'Öğrenim Ücreti')
          .replace(/contractDate/g, 'Sözleşme Tarihi')
          .replace(/registrationDate/g, 'Kayıt Tarihi')
          .replace(/registrarName/g, 'Kayıt Sorumlusu')
          .replace(/schoolLicenseNo/g, 'Okul Ruhsat No')
          .replace(/contractNo/g, 'Sözleşme No')
        
        formattedData[formattedKey] = String(value)
      }
    })
    
    return formattedData
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      {/* Sözleşmeler Listesi */}
      <div className="space-y-4">
        {filteredContracts.length > 0 ? (
          filteredContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{contract.type}</CardTitle>
                    <CardDescription>
                      {contract.student.firstName} {contract.student.lastName} - TC: {contract.student.tcNumber}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewContract(contract)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detayları Gör
                    </Button>
                    <Button
                      onClick={() => handleDownloadPDF(contract)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF İndir
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p><strong>Oluşturulma Tarihi:</strong> {new Date(contract.createdAt).toLocaleDateString('tr-TR')}</p>
                  {contract.contractData && (
                    <div className="mt-3">
                      <p className="font-medium text-gray-700 mb-2">Sözleşme Özeti:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(formatContractData(contract.contractData)).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                      {Object.keys(formatContractData(contract.contractData)).length > 4 && (
                        <p className="text-xs text-gray-500 mt-2">
                          +{Object.keys(formatContractData(contract.contractData)).length - 4} daha fazla alan
                        </p>
                      )}
                    </div>
                  )}
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

      {/* Sözleşme Detay Modal */}
      {showModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedContract.type} - Detayları</h2>
              <Button
                onClick={() => setShowModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Öğrenci Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><strong>Ad Soyad:</strong> {selectedContract.student.firstName} {selectedContract.student.lastName}</div>
                  <div><strong>TC Kimlik No:</strong> {selectedContract.student.tcNumber}</div>
                  <div><strong>Oluşturulma Tarihi:</strong> {new Date(selectedContract.createdAt).toLocaleDateString('tr-TR')}</div>
                </div>
              </div>

              {selectedContract.contractData && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Sözleşme Detayları</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(formatContractData(selectedContract.contractData)).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleDownloadPDF(selectedContract)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir
                </Button>
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Kapat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
