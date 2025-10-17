"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Search, Filter } from "lucide-react"

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
      const [newRegistrations, renewals, uniforms, meals, services, books] = await Promise.all([
        fetch("/api/new-registrations").then(res => res.json()),
        fetch("/api/renewals").then(res => res.json()),
        fetch("/api/uniform-contracts").then(res => res.json()),
        fetch("/api/meal-contracts").then(res => res.json()),
        fetch("/api/service-contracts").then(res => res.json()),
        fetch("/api/book-contracts").then(res => res.json())
      ])

      const allContracts = [
        ...newRegistrations.map((c: Record<string, unknown>) => ({ ...c, type: "Yeni Kayıt" })),
        ...renewals.map((c: Record<string, unknown>) => ({ ...c, type: "Kayıt Yenileme" })),
        ...uniforms.map((c: Record<string, unknown>) => ({ ...c, type: "Forma Sözleşmesi" })),
        ...meals.map((c: Record<string, unknown>) => ({ ...c, type: "Yemek Sözleşmesi" })),
        ...services.map((c: Record<string, unknown>) => ({ ...c, type: "Servis Sözleşmesi" })),
        ...books.map((c: Record<string, unknown>) => ({ ...c, type: "Kitap Sözleşmesi" }))
      ]

      setContracts(allContracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (error) {
      console.error("Error fetching contracts:", error)
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
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{contract.type}</CardTitle>
                    <CardDescription>
                      {contract.student.firstName} {contract.student.lastName} - TC: {contract.student.tcNumber}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleDownloadPDF(contract)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF İndir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p><strong>Oluşturulma Tarihi:</strong> {new Date(contract.createdAt).toLocaleDateString('tr-TR')}</p>
                  {contract.contractData && (
                    <div className="mt-2">
                      <p><strong>Sözleşme Detayları:</strong></p>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(contract.contractData, null, 2)}
                      </pre>
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
    </div>
  )
}
