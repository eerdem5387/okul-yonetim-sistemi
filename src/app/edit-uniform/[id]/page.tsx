"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
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
  uniformSize: string
  uniformPrice: string
  deliveryDate: string
  uniformItems: string[]
}

export default function EditUniformPage({ params }: { params: Promise<{ id: string }> }) {
  const pathname = usePathname()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contractId, setContractId] = useState<string>("")
  const [studentId, setStudentId] = useState<string>("")

  // URL'den ID'yi al - daha güvenilir
  useEffect(() => {
    const extractIdFromPath = async () => {
      try {
        // Önce pathname'den ID'yi al
        const pathId = pathname?.split('/').pop() || ""
        
        // Eğer pathname'den ID alınamazsa params'tan al
        let id = pathId
        if (!id || id === "edit-uniform") {
          const resolvedParams = await params
          id = resolvedParams.id
        }
        
        console.log("[Edit Uniform] Contract ID:", id, "Pathname:", pathname)
        
        if (id && id !== contractId) {
          // Önceki contract verilerini temizle
          setContract(null)
          setLoading(true)
          setContractId(id)
        }
      } catch (error) {
        console.error("[Edit Uniform] Error extracting ID:", error)
      }
    }
    extractIdFromPath()
  }, [pathname, params, contractId])

  const fetchContract = useCallback(async () => {
    try {
      const response = await fetch(`/api/uniform-contracts/${contractId}`)
      if (response.ok) {
        const data = await response.json()
        
        // Öğrenci ID'sini al ve sakla
        const fetchedStudentId = data.studentId
        setStudentId(fetchedStudentId)
        
        // Öğrenci bilgilerini API'den al (güncel bilgiler için)
        const studentResponse = await fetch(`/api/students/${fetchedStudentId}`)
        let currentStudentData = null
        if (studentResponse.ok) {
          const studentData = await studentResponse.json()
          currentStudentData = studentData.student || studentData
        }
        
        // Sözleşme verisini al ve öğrenci bilgilerini güncel verilerle güncelle
        const contractData = data.contractData || {}
        
        // Öğrenci bilgilerini güncel verilerle güncelle
        const updatedContractData = {
          ...contractData,
          studentName: currentStudentData 
            ? `${currentStudentData.firstName || ""} ${currentStudentData.lastName || ""}`.trim()
            : contractData.studentName || "",
          tcNumber: currentStudentData?.tcNumber || contractData.tcNumber || "",
          grade: currentStudentData?.grade || contractData.grade || "",
          address: currentStudentData?.address || contractData.address || "",
          parentName: currentStudentData?.motherName || contractData.parentName || "",
          parentPhone: currentStudentData?.motherPhone || contractData.parentPhone || "",
        }
        
        setContract(updatedContractData)
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
    if (!contract || !studentId) return
    
    setSaving(true)
    try {
      // Öğrenci bilgilerini öğrenci yönetimine güncelle
      const studentNameParts = contract.studentName?.split(" ") || []
      const firstName = studentNameParts[0] || ""
      const lastName = studentNameParts.slice(1).join(" ") || ""
      
      const studentUpdateData: Record<string, unknown> = {
        firstName,
        lastName,
        tcNumber: contract.tcNumber || "",
        grade: contract.grade || "",
        address: contract.address || "",
        motherName: contract.parentName || "",
        motherPhone: contract.parentPhone || "",
      }
      
      // Öğrenci bilgilerini güncelle
      const studentResponse = await fetch(`/api/students/${studentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentUpdateData),
      })
      
      if (!studentResponse.ok) {
        console.error("Error updating student:", await studentResponse.text())
        // Öğrenci güncellemesi başarısız olsa bile sözleşmeyi güncellemeye devam et
      }
      
      // Ana sözleşmeyi güncelle
      const response = await fetch(`/api/uniform-contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contractData: contract }),
      })

      if (response.ok) {
        alert("Sözleşme ve öğrenci bilgileri başarıyla güncellendi!")
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
          <h1 className="text-3xl font-bold text-gray-900">Forma Sözleşmesi Düzenle</h1>
        </div>
        <p className="text-gray-600">Sözleşme bilgilerini düzenleyin ve kaydedin</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FORMA SÖZLEŞMESİ</CardTitle>
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

          {/* Forma Bilgileri */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Forma Bilgileri</h3>
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
                <Label htmlFor="uniformSize">Forma Bedeni</Label>
                <Input
                  id="uniformSize"
                  value={contract.uniformSize}
                  onChange={(e) => handleInputChange("uniformSize", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="uniformPrice">Forma Ücreti</Label>
                <Input
                  id="uniformPrice"
                  value={contract.uniformPrice}
                  onChange={(e) => handleInputChange("uniformPrice", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate">Teslim Tarihi</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={contract.deliveryDate}
                  onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
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
