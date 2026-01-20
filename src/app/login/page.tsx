"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, User, Award } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [tcNumber, setTcNumber] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showIBViewer, setShowIBViewer] = useState(false)
  const [ibUsername, setIbUsername] = useState("")
  const [ibPassword, setIbPassword] = useState("")

  // Personel Girişi (Ana giriş)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/tc-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tcNumber: tcNumber.trim(),
          password: password.trim()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // İlk giriş kontrolü
        if (data.isFirstLogin) {
          localStorage.setItem("auth_role", data.role)
          localStorage.setItem("auth_token", data.token)
          localStorage.setItem("staff_id", data.staffId)
          localStorage.setItem("staff_name", data.staffName)
          localStorage.setItem("staff_department", data.department)
          window.location.href = `/change-password?first=true&tc=${tcNumber.trim()}`
          return
        }
        
        // Normal giriş - localStorage'a kaydet
        localStorage.setItem("auth_role", data.role)
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("staff_id", data.staffId)
        localStorage.setItem("staff_name", data.staffName)
        localStorage.setItem("staff_department", data.department)
        
        // Rol bazlı yönlendirme - window.location.href kullanarak tam sayfa yenileme
        if (data.role === "teacher") {
          window.location.href = "/ogretmen"
        } else if (data.role === "counselor" || data.role === "head_counselor") {
          window.location.href = "/rehberlik"
        } else {
          window.location.href = "/"
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "TC Kimlik numarası veya şifre hatalı!")
        
        // Login başarısız olduğunda localStorage'ı temizle
        localStorage.removeItem("auth_role")
        localStorage.removeItem("auth_token")
        localStorage.removeItem("staff_id")
        localStorage.removeItem("staff_name")
        localStorage.removeItem("staff_department")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Giriş yapılırken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  // IB Viewer Girişi
  const handleIBLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/ib/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: ibUsername, password: ibPassword })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("ib_viewer_token", data.token)
        localStorage.setItem("ib_viewer_id", data.viewer.id)
        localStorage.setItem("ib_viewer_name", data.viewer.fullName)
        window.location.href = "/ib-viewer"
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Kullanıcı adı veya şifre hatalı!")
      }
    } catch (error) {
      console.error("IB Login error:", error)
      setError("Giriş yapılırken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  // Veli Erişimi
  const handleParentAccess = () => {
    router.push("/veli-login")
  }

  if (showIBViewer) {
    // IB Viewer Giriş Ekranı
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">IB Viewer Girişi</CardTitle>
              <CardDescription className="mt-1 sm:mt-2 text-sm sm:text-base">
                IB Faaliyet sistemine özel erişim
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
            <form onSubmit={handleIBLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ibUsername">Kullanıcı Adı</Label>
                <Input
                  id="ibUsername"
                  value={ibUsername}
                  onChange={(e) => setIbUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı girin"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ibPassword">Şifre</Label>
                <Input
                  id="ibPassword"
                  type="password"
                  value={ibPassword}
                  onChange={(e) => setIbPassword(e.target.value)}
                  placeholder="Şifrenizi girin"
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setShowIBViewer(false)
                  setIbUsername("")
                  setIbPassword("")
                  setError("")
                }}
              >
                ← Personel Girişine Dön
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ana Giriş Ekranı (Personel)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
              Okul Yönetim Sistemi
            </CardTitle>
            <CardDescription className="mt-1 sm:mt-2 text-sm sm:text-base">
              Personel Girişi
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tcNumber">TC Kimlik Numarası</Label>
              <Input
                id="tcNumber"
                value={tcNumber}
                onChange={(e) => setTcNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="11 haneli TC numaranızı girin"
                required
                disabled={loading}
                maxLength={11}
                pattern="[0-9]{11}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                İlk girişte şifreniz TC Kimlik numaranızdır
              </p>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-sm sm:text-base" 
              disabled={loading || tcNumber.length !== 11 || !password}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">veya</span>
            </div>
          </div>

          {/* Veli Erişimi - Büyük Buton */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 sm:h-12 text-sm sm:text-base border-green-500 text-green-700 hover:bg-green-50 hover:text-green-800"
            onClick={handleParentAccess}
          >
            <User className="h-5 w-5 mr-2" />
            Veli Olarak Giriş Yap
          </Button>

          {/* IB Viewer - Küçük Link */}
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setShowIBViewer(true)}
              className="text-purple-600 hover:text-purple-700 hover:underline font-medium transition-colors"
            >
              <Award className="h-4 w-4 inline mr-1" />
              IB Viewer Girişi
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

