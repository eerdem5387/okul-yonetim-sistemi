"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  address: string
  parentName: string
  parentPhone: string
  parentEmail: string
  parent2Name?: string
  parent2Phone?: string
  parent2Email?: string
}

interface ContractData {
  studentName: string
  tcNumber: string
  grade: string
  address: string
  parentName: string
  parentPhone: string
  parentEmail: string
  parent2Name?: string
  parent2Phone?: string
  parent2Email?: string
  academicYear: string
  tuitionFee: string
  contractDate: string
  registrationDate: string
  registrarName: string
  schoolLicenseNo: string
  contractNo: string
  studentBirthDate: string
  contractParentName: string
  siblingDiscount: boolean
  staffChildDiscount: boolean
  teacherChildDiscount: boolean
  martyrVeteranDiscount: boolean
  corporateDiscount: boolean
  otherDiscount: boolean
  achievementDiscount: boolean
  achievementDiscountType: string
}

export default function EditNewRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
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

  useEffect(() => {
    if (contractId) {
      fetchContract()
    }
  }, [contractId])

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/new-registrations/${contractId}`)
      if (response.ok) {
        const data = await response.json()
        setContract(data.contractData)
      }
    } catch (error) {
      console.error("Error fetching contract:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!contract) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/new-registrations/${contractId}`, {
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

  const handleInputChange = (field: keyof ContractData, value: string | boolean) => {
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
          <h1 className="text-3xl font-bold text-gray-900">Yeni Kayıt Sözleşmesi Düzenle</h1>
        </div>
        <p className="text-gray-600">Sözleşme bilgilerini düzenleyin ve kaydedin</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>EĞİTİM ÖĞRETİM HİZMET SÖZLEŞMESİ</CardTitle>
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
              <Label htmlFor="studentBirthDate">Doğum Tarihi</Label>
              <Input
                id="studentBirthDate"
                type="date"
                value={contract.studentBirthDate}
                onChange={(e) => handleInputChange("studentBirthDate", e.target.value)}
              />
            </div>
          </div>

          {/* Veli Bilgileri */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Veli Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parentName">1. Veli Ad Soyad</Label>
                <Input
                  id="parentName"
                  value={contract.parentName}
                  onChange={(e) => handleInputChange("parentName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="parentPhone">1. Veli Telefon</Label>
                <Input
                  id="parentPhone"
                  value={contract.parentPhone}
                  onChange={(e) => handleInputChange("parentPhone", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="parentEmail">1. Veli E-posta</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={contract.parentEmail}
                  onChange={(e) => handleInputChange("parentEmail", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contractParentName">Sözleşme Veli Adı</Label>
                <Input
                  id="contractParentName"
                  value={contract.contractParentName}
                  onChange={(e) => handleInputChange("contractParentName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="parent2Name">2. Veli Ad Soyad (Opsiyonel)</Label>
                <Input
                  id="parent2Name"
                  value={contract.parent2Name || ""}
                  onChange={(e) => handleInputChange("parent2Name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="parent2Phone">2. Veli Telefon (Opsiyonel)</Label>
                <Input
                  id="parent2Phone"
                  value={contract.parent2Phone || ""}
                  onChange={(e) => handleInputChange("parent2Phone", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="parent2Email">2. Veli E-posta (Opsiyonel)</Label>
                <Input
                  id="parent2Email"
                  type="email"
                  value={contract.parent2Email || ""}
                  onChange={(e) => handleInputChange("parent2Email", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sözleşme Bilgileri */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Sözleşme Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="academicYear">Eğitim Yılı</Label>
                <Input
                  id="academicYear"
                  value={contract.academicYear}
                  onChange={(e) => handleInputChange("academicYear", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tuitionFee">Öğrenim Ücreti</Label>
                <Input
                  id="tuitionFee"
                  value={contract.tuitionFee}
                  onChange={(e) => handleInputChange("tuitionFee", e.target.value)}
                />
              </div>
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
                <Label htmlFor="registrationDate">Kayıt Tarihi</Label>
                <Input
                  id="registrationDate"
                  type="date"
                  value={contract.registrationDate}
                  onChange={(e) => handleInputChange("registrationDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="registrarName">Kayıt Sorumlusu</Label>
                <Input
                  id="registrarName"
                  value={contract.registrarName}
                  onChange={(e) => handleInputChange("registrarName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="schoolLicenseNo">Okul Ruhsat No</Label>
                <Input
                  id="schoolLicenseNo"
                  value={contract.schoolLicenseNo}
                  onChange={(e) => handleInputChange("schoolLicenseNo", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contractNo">Sözleşme No</Label>
                <Input
                  id="contractNo"
                  value={contract.contractNo}
                  onChange={(e) => handleInputChange("contractNo", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* İndirim Bilgileri */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">İndirim Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="siblingDiscount"
                  checked={contract.siblingDiscount}
                  onChange={(e) => handleInputChange("siblingDiscount", e.target.checked)}
                />
                <Label htmlFor="siblingDiscount">Kardeş İndirimi</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="staffChildDiscount"
                  checked={contract.staffChildDiscount}
                  onChange={(e) => handleInputChange("staffChildDiscount", e.target.checked)}
                />
                <Label htmlFor="staffChildDiscount">Personel Çocuğu İndirimi</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="teacherChildDiscount"
                  checked={contract.teacherChildDiscount}
                  onChange={(e) => handleInputChange("teacherChildDiscount", e.target.checked)}
                />
                <Label htmlFor="teacherChildDiscount">Öğretmen Çocuğu İndirimi</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="martyrVeteranDiscount"
                  checked={contract.martyrVeteranDiscount}
                  onChange={(e) => handleInputChange("martyrVeteranDiscount", e.target.checked)}
                />
                <Label htmlFor="martyrVeteranDiscount">Şehit Gazi İndirimi</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="corporateDiscount"
                  checked={contract.corporateDiscount}
                  onChange={(e) => handleInputChange("corporateDiscount", e.target.checked)}
                />
                <Label htmlFor="corporateDiscount">Kurumsal İndirim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="otherDiscount"
                  checked={contract.otherDiscount}
                  onChange={(e) => handleInputChange("otherDiscount", e.target.checked)}
                />
                <Label htmlFor="otherDiscount">Diğer İndirim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="achievementDiscount"
                  checked={contract.achievementDiscount}
                  onChange={(e) => handleInputChange("achievementDiscount", e.target.checked)}
                />
                <Label htmlFor="achievementDiscount">Başarı İndirimi</Label>
              </div>
              <div>
                <Label htmlFor="achievementDiscountType">Başarı İndirimi Türü</Label>
                <select
                  id="achievementDiscountType"
                  value={contract.achievementDiscountType}
                  onChange={(e) => handleInputChange("achievementDiscountType", e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="none">Yok</option>
                  <option value="partial">Kısmi</option>
                  <option value="full">Tam</option>
                </select>
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
