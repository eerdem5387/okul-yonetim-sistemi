"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, Check, X, AlertCircle } from "lucide-react"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [tcNumber, setTcNumber] = useState("")
  const [staffName, setStaffName] = useState("")
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [isParent, setIsParent] = useState(false)
  const [parentId, setParentId] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    // URL parametrelerini window.location'dan al
    const urlParams = new URLSearchParams(window.location.search)
    const tcFromUrl = urlParams.get("tc")
    const firstLoginFromUrl = urlParams.get("first") === "true"
    const parentFromUrl = urlParams.get("parent") === "true"

    // Veli mi?
    if (parentFromUrl) {
      const pId = localStorage.getItem("parent_id")
      const studentName = localStorage.getItem("student_name")
      const studentTc = localStorage.getItem("student_tc")
      const savedParentName = localStorage.getItem("parent_name")
      
      if (!pId) {
        router.push("/veli-login")
        return
      }
      
      setIsParent(true)
      setParentId(pId)
      setTcNumber(studentTc || "")
      setStaffName(savedParentName || (studentName ? `${studentName} Velisi` : "Veli"))
      setIsFirstLogin(true)
      setPageLoading(false)
      return
    }

    // Personel
    if (!tcFromUrl) {
      // URL'de TC yoksa, localStorage'dan dene
      const tempStaffId = localStorage.getItem("temp_staff_id") || localStorage.getItem("staff_id")
      const tempTc = localStorage.getItem("temp_tc")
      const tempStaffName = localStorage.getItem("temp_staff_name") || localStorage.getItem("staff_name")
      const firstLogin = localStorage.getItem("is_first_login") === "true"

      if (!tempStaffId && !tempTc) {
        router.push("/login")
        return
      }

      setTcNumber(tempTc || "")
      setStaffName(tempStaffName || "")
      setIsFirstLogin(firstLogin)
    } else {
      setTcNumber(tcFromUrl)
      setIsFirstLogin(firstLoginFromUrl)
    }

    setPageLoading(false)
  }, [router])

  const validatePassword = (pass: string) => {
    if (pass.length < 6) {
      return "Şifre en az 6 karakter olmalıdır"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validasyon
    if (newPassword !== confirmPassword) {
      setError("Yeni şifre ve onay şifresi eşleşmiyor!")
      return
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)

    try {
      // Veli için farklı endpoint
      const endpoint = isParent ? "/api/auth/parent-change-password" : "/api/auth/change-password"
      
      const body = isParent
        ? {
            parentId,
            oldPassword: isFirstLogin ? tcNumber : oldPassword,
            newPassword,
            isFirstLogin,
          }
        : {
            tcNumber,
            oldPassword: isFirstLogin ? tcNumber : oldPassword,
            newPassword,
            isFirstLogin,
          }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        // Temp storage'ı temizle
        localStorage.removeItem("temp_staff_id")
        localStorage.removeItem("temp_staff_name")
        localStorage.removeItem("temp_tc")
        localStorage.removeItem("is_first_login")
        
        // Success - Login sayfasına yönlendir
        alert("Şifreniz başarıyla değiştirildi! Lütfen yeni şifrenizle giriş yapın.")
        
        if (isParent) {
          // Veli girişe geri dön
          localStorage.removeItem("auth_role")
          localStorage.removeItem("auth_token")
          localStorage.removeItem("parent_id")
          localStorage.removeItem("parent_name")
          localStorage.removeItem("student_tc")
          localStorage.removeItem("student_name")
          router.push("/veli-login")
        } else {
        router.push("/login")
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Şifre değiştirilirken bir hata oluştu")
      }
    } catch (error) {
      console.error("Change password error:", error)
      setError("Şifre değiştirilirken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = () => {
    if (!newPassword) return null
    if (newPassword.length < 6) return { level: "weak", label: "Zayıf", color: "text-red-600" }
    if (newPassword.length < 10) return { level: "medium", label: "Orta", color: "text-yellow-600" }
    return { level: "strong", label: "Güçlü", color: "text-green-600" }
  }

  const strength = passwordStrength()

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className={`mx-auto w-16 h-16 bg-gradient-to-br ${isParent ? 'from-green-600 to-emerald-600' : 'from-blue-600 to-indigo-600'} rounded-2xl flex items-center justify-center shadow-lg`}>
            <Key className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {isFirstLogin ? "İlk Giriş - Şifre Oluştur" : "Şifre Değiştir"}
            </CardTitle>
            <CardDescription className="mt-2">
              {isFirstLogin
                ? "Hoş geldiniz! Güvenli bir şifre oluşturun."
                : "Mevcut şifrenizi değiştirin"}
            </CardDescription>
            {staffName && (
              <p className="mt-2 text-sm font-medium text-gray-700">
                {staffName}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-8">
          {isFirstLogin && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">İlk Giriş</p>
                  <p>
                    Güvenliğiniz için yeni bir şifre oluşturmanız gerekmektedir.
                    Şifreniz en az 6 karakter olmalıdır.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isFirstLogin && (
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Mevcut Şifre</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Mevcut şifrenizi girin"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">Yeni Şifre</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifrenizi girin (min. 6 karakter)"
                required
                disabled={loading}
              />
              {strength && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        strength.level === "weak"
                          ? "w-1/3 bg-red-500"
                          : strength.level === "medium"
                          ? "w-2/3 bg-yellow-500"
                          : "w-full bg-green-500"
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-medium ${strength.color}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar girin"
                required
                disabled={loading}
              />
              {confirmPassword && (
                <div className="flex items-center gap-2 mt-2">
                  {newPassword === confirmPassword ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600">Şifreler eşleşiyor</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-red-600">Şifreler eşleşmiyor</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              >
                <Key className="h-4 w-4 mr-2" />
                {loading ? "Şifre Değiştiriliyor..." : "Şifreyi Değiştir"}
              </Button>
            </div>
          </form>

          {!isFirstLogin && (
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={loading}
              >
                İptal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

