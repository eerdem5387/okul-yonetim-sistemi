"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

interface ContractData {
  studentName: string
  tcNumber: string
  grade: string
  address: string
  parentName: string
  parentPhone: string
  parentEmail: string
  contractDate: string
  mealPrice: string
  paymentPeriods: string[]
}

export default function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contractId, setContractId] = useState<string>("")

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setContractId(resolvedParams.id)
    }
    getParams()
  }, [params])

  const fetchContract = useCallback(async () => {
    try {
      const response = await fetch(`/api/meal-contracts/${contractId}`)
      if (response.ok) {
        const data = await response.json()
        setContract(data.contractData)
      }
    } catch (error) {
      console.error("Error fetching contract:", error)
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    if (contractId) {
      fetchContract()
    }
  }, [contractId, fetchContract])

  const handleSave = async () => {
    if (!contract) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/meal-contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contractData: contract }),
      })

      if (response.ok) {
        alert("Sözleşme başarıyla güncellendi!")
        window.location.href = "/history"
      } else {
        alert("Sözleşme güncellenirken bir hata oluştu.")
      }
    } catch (error) {
      console.error("Error updating contract:", error)
      alert("Sözleşme güncellenirken bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ContractData, value: string | string[]) => {
    if (!contract) return
    setContract({
      ...contract,
      [field]: value
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Yükleniyor...</div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Sözleşme bulunamadı</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/history">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri Dön
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Yemek Sözleşmesi Düzenle</h1>
        </div>
        <p className="text-gray-600">Sözleşme bilgilerini düzenleyin ve kaydedin</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>YEMEK SÖZLEŞMESİ</CardTitle>
          <CardDescription>
            Sözleşme bilgilerini aşağıdaki form üzerinden düzenleyebilirsiniz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Öğrenci Bilgileri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="studentName">Öğrenci Adı Soyadı</Label>
              <Input
                id="studentName"
                value={contract.studentName}
                onChange={(e) => handleInputChange("studentName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tcNumber">TC Kimlik No</Label>
              <Input
                id="tcNumber"
                value={contract.tcNumber}
                onChange={(e) => handleInputChange("tcNumber", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="grade">Sınıfı</Label>
              <Input
                id="grade"
                value={contract.grade}
                onChange={(e) => handleInputChange("grade", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={contract.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="parentName">Veli Adı</Label>
              <Input
                id="parentName"
                value={contract.parentName}
                onChange={(e) => handleInputChange("parentName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="parentPhone">Veli Telefon</Label>
              <Input
                id="parentPhone"
                value={contract.parentPhone}
                onChange={(e) => handleInputChange("parentPhone", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="parentEmail">Veli E-posta</Label>
              <Input
                id="parentEmail"
                type="email"
                value={contract.parentEmail}
                onChange={(e) => handleInputChange("parentEmail", e.target.value)}
              />
            </div>
          </div>

          {/* Yemek Bilgileri */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Yemek Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contractDate">Sözleşme Tarihi</Label>
                <Input
                  id="contractDate"
                  type="date"
                  value={contract.contractDate}
                  onChange={(e) => handleInputChange("contractDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mealPrice">Yemek Ücreti</Label>
                <Input
                  id="mealPrice"
                  value={contract.mealPrice}
                  onChange={(e) => handleInputChange("mealPrice", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
            <Link href="/history" className="flex-1">
              <Button variant="outline" className="w-full">
                İptal
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
