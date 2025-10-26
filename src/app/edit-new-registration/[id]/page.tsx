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

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true)
      
      // Ana sözleşmeyi çek
      const mainResponse = await fetch(`/api/new-registrations/${contractId}`)
      if (!mainResponse.ok) return
      
      const mainData = await mainResponse.json()
      setContract(mainData.contractData)
      
      // Öğrenci ID'sini al
      const studentId = mainData.studentId
      
      // Tüm yan sözleşmeleri çek
      const [uniformRes, mealRes, serviceRes, bookRes] = await Promise.all([
        fetch(`/api/uniform-contracts?studentId=${studentId}`),
        fetch(`/api/meal-contracts?studentId=${studentId}`),
        fetch(`/api/service-contracts?studentId=${studentId}`),
        fetch(`/api/book-contracts?studentId=${studentId}`)
      ])
      
      const [uniforms, meals, services, books] = await Promise.all([
        uniformRes.ok ? uniformRes.json() : [],
        mealRes.ok ? mealRes.json() : [],
        serviceRes.ok ? serviceRes.json() : [],
        bookRes.ok ? bookRes.json() : []
      ])
      
      // En son yan sözleşmeleri al
      const latestUniform = uniforms.length > 0 ? uniforms[0] : null
      const latestMeal = meals.length > 0 ? meals[0] : null
      const latestService = services.length > 0 ? services[0] : null
      const latestBook = books.length > 0 ? books[0] : null
      
      // Yan sözleşme verilerini birleştir
      const otherContractData: Record<string, unknown> = {}
      
      if (latestUniform) {
        Object.assign(otherContractData, latestUniform.contractData as Record<string, unknown>)
      }
      if (latestMeal) {
        Object.assign(otherContractData, latestMeal.contractData as Record<string, unknown>)
      }
      if (latestService) {
        Object.assign(otherContractData, latestService.contractData as Record<string, unknown>)
      }
      if (latestBook) {
        Object.assign(otherContractData, latestBook.contractData as Record<string, unknown>)
      }
      
      // Yan sözleşme verilerini state'e ekle
      setContract(prev => {
        if (prev) {
          return {
            ...prev,
            ...otherContractData
          }
        }
        return prev
      })
      
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
      // Ana sözleşmeyi güncelle
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

      {/* Forma Sözleşmesi */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-indigo-600">Forma Sözleşmesi</CardTitle>
          <CardDescription>Forma bilgilerini düzenleyin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="uniformSize">Forma Bedeni</Label>
              <Input
                id="uniformSize"
                value={(contract as unknown as Record<string, unknown>).uniformSize as string || ""}
                onChange={(e) => handleInputChange("uniformSize" as keyof ContractData, e.target.value)}
                placeholder="Örn: M, L, XL"
              />
            </div>
            <div>
              <Label htmlFor="uniformPrice">Forma Ücreti (TL)</Label>
              <Input
                id="uniformPrice"
                type="number"
                value={(contract as unknown as Record<string, unknown>).uniformPrice as string || ""}
                onChange={(e) => handleInputChange("uniformPrice" as keyof ContractData, e.target.value)}
                placeholder="Örn: 500"
              />
            </div>
            <div>
              <Label htmlFor="uniformDeliveryDate">Teslim Tarihi</Label>
              <Input
                id="uniformDeliveryDate"
                type="date"
                value={(contract as unknown as Record<string, unknown>).uniformDeliveryDate as string || ""}
                onChange={(e) => handleInputChange("uniformDeliveryDate" as keyof ContractData, e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="uniformItems">Teslim Edilecek Formalar</Label>
              <Input
                id="uniformItems"
                value={Array.isArray((contract as unknown as Record<string, unknown>).uniformItems) ? ((contract as unknown as Record<string, unknown>).uniformItems as string[]).join(", ") : ""}
                onChange={(e) => handleInputChange("uniformItems" as keyof ContractData, e.target.value.split(", "))}
                placeholder="Örn: eşofman takımı, tişört 2 adet"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yemek Sözleşmesi */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-green-600">Yemek Sözleşmesi</CardTitle>
          <CardDescription>Yemek bilgilerini düzenleyin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mealPrice">Yemek Ücreti (TL)</Label>
              <Input
                id="mealPrice"
                type="number"
                value={(contract as unknown as Record<string, unknown>).mealPrice as string || ""}
                onChange={(e) => handleInputChange("mealPrice" as keyof ContractData, e.target.value)}
                placeholder="Örn: 150"
              />
            </div>
            <div>
              <Label htmlFor="mealPeriods">Ödeme Dönemleri</Label>
              <Input
                id="mealPeriods"
                value={Array.isArray((contract as unknown as Record<string, unknown>).mealPeriods) ? ((contract as unknown as Record<string, unknown>).mealPeriods as string[]).join(", ") : ""}
                onChange={(e) => handleInputChange("mealPeriods" as keyof ContractData, e.target.value.split(", "))}
                placeholder="Örn: eylül, ekim, kasım"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kitap Sözleşmesi */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-purple-600">Kitap Sözleşmesi</CardTitle>
          <CardDescription>Kitap bilgilerini düzenleyin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bookSet">Kitap Seti</Label>
              <Input
                id="bookSet"
                value={(contract as unknown as Record<string, unknown>).bookSet as string || ""}
                onChange={(e) => handleInputChange("bookSet" as keyof ContractData, e.target.value)}
                placeholder="Örn: 5. Sınıf Tam Set"
              />
            </div>
            <div>
              <Label htmlFor="bookDeliveryDate">Teslim Tarihi</Label>
              <Input
                id="bookDeliveryDate"
                type="date"
                value={(contract as unknown as Record<string, unknown>).bookDeliveryDate as string || ""}
                onChange={(e) => handleInputChange("bookDeliveryDate" as keyof ContractData, e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Servis Sözleşmesi */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-orange-600">Servis Sözleşmesi</CardTitle>
          <CardDescription>Servis bilgilerini düzenleyin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serviceRegion">Servis Bölgesi</Label>
              <select
                id="serviceRegion"
                value={(contract as unknown as Record<string, unknown>).serviceRegion as string || ""}
                onChange={(e) => handleInputChange("serviceRegion" as keyof ContractData, e.target.value)}
                className="w-full h-11 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-900 transition-all duration-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none cursor-pointer"
              >
                <option value="">Bölge seçin...</option>
                <option value="1.bölge">1. Bölge</option>
                <option value="2.bölge">2. Bölge</option>
                <option value="3.bölge">3. Bölge</option>
                <option value="4.bölge">4. Bölge</option>
                <option value="5.bölge">5. Bölge</option>
                <option value="6.bölge">6. Bölge</option>
                <option value="çayeli">Çayeli</option>
                <option value="pazar/ardeşen">Pazar/Ardeşen</option>
              </select>
            </div>
            <div>
              <Label htmlFor="servicePrice">Servis Ücreti (TL)</Label>
              <Input
                id="servicePrice"
                type="number"
                value={(contract as unknown as Record<string, unknown>).servicePrice as string || ""}
                onChange={(e) => handleInputChange("servicePrice" as keyof ContractData, e.target.value)}
                placeholder="Örn: 800"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
