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
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [loginType, setLoginType] = useState<"student_affairs" | "ib_viewer" | "teacher_counselor">("student_affairs")
  const [showTeacherCounselorModal, setShowTeacherCounselorModal] = useState(false)
  const [tcNumber, setTcNumber] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      let response: Response

      // Debug: loginType'ı kontrol et
      console.log("Login type:", loginType)

      if (loginType === "student_affairs") {
        // Öğrenci İşleri login
        console.log("Attempting student_affairs login")
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, role: "student_affairs" })
        })

        if (response.ok) {
          const data: { token?: string } = await response.json()
          localStorage.setItem("auth_role", "student_affairs")
          localStorage.setItem("auth_token", data.token || "authenticated")
          router.push("/")
          router.refresh()
          return
        }
      } else if (loginType === "ib_viewer") {
        // IB Viewer login
        console.log("Attempting IB Viewer login")
        response = await fetch("/api/ib/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        })

        if (response.ok) {
          const data: { token: string; viewer: { id: string; fullName: string } } = await response.json()
          localStorage.setItem("ib_viewer_token", data.token)
          localStorage.setItem("ib_viewer_id", data.viewer.id)
          localStorage.setItem("ib_viewer_name", data.viewer.fullName)
          router.push("/ib-viewer")
          router.refresh()
          return
        }
      } else {
        setError("Lütfen bir giriş tipi seçin!")
        setLoading(false)
        return
      }

      // Hata durumu
      const errorData: { error?: string } = await response.json()
      setError(errorData.error || "Kullanıcı adı veya şifre hatalı!")
    } catch (error) {
      console.error("Login error:", error)
      setError("Giriş yapılırken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  const handleParentAccess = () => {
    localStorage.setItem("auth_role", "parent")
    router.push("/parent")
    router.refresh()
  }

  const handleTeacherCounselorLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/tc-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcNumber: tcNumber.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("auth_role", data.role)
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("staff_id", data.staffId)
        localStorage.setItem("staff_name", data.staffName)
        localStorage.setItem("staff_department", data.department)
        
        if (data.role === "teacher") {
          router.push("/ogretmen")
        } else if (data.role === "counselor") {
          router.push("/rehberlik")
        }
        router.refresh()
      } else {
        const errorData: { error?: string } = await response.json()
        setError(errorData.error || "TC Kimlik numarası hatalı veya kullanıcı bulunamadı!")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Giriş yapılırken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Okul Yönetim Sistemi</CardTitle>
            <CardDescription className="mt-1 sm:mt-2 text-sm sm:text-base">Giriş yapın veya veli olarak devam edin</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          {/* Login Type Selection */}
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={loginType === "student_affairs" ? "default" : "outline"}
              className={`flex-1 ${loginType === "student_affairs" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => {
                console.log("Setting login type to student_affairs")
                setLoginType("student_affairs")
                setError("")
                setUsername("")
                setPassword("")
              }}
            >
              <User className="h-4 w-4 mr-2" />
              Öğrenci İşleri
            </Button>
            <Button
              type="button"
              variant={loginType === "ib_viewer" ? "default" : "outline"}
              className={`flex-1 ${loginType === "ib_viewer" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => {
                console.log("Setting login type to ib_viewer")
                setLoginType("ib_viewer")
                setError("")
                setUsername("")
                setPassword("")
              }}
            >
              <Award className="h-4 w-4 mr-2" />
              IB Viewer
            </Button>
          </div>
          
          {/* Debug: Show current login type */}
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs text-gray-500 mb-2">
              Seçili tip: {loginType === "student_affairs" ? "Öğrenci İşleri" : "IB Viewer"}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı girin"
                required
                disabled={loading}
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
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-sm sm:text-base" 
              disabled={loading}
              onClick={(e) => {
                // Double check loginType before submit
                console.log("Form submit - loginType:", loginType)
                if (!loginType) {
                  e.preventDefault()
                  setError("Lütfen bir giriş tipi seçin!")
                  return false
                }
              }}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading
                ? "Giriş yapılıyor..."
                : loginType === "student_affairs"
                  ? "Öğrenci İşleri Olarak Giriş Yap"
                  : loginType === "ib_viewer"
                    ? "IB Viewer Olarak Giriş Yap"
                    : "Giriş Yap"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">veya</span>
            </div>
          </div>

          {/* Veli Erişimi */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 sm:h-12 text-sm sm:text-base"
            onClick={handleParentAccess}
          >
            <User className="h-4 w-4 mr-2" />
            Veli Olarak Devam Et
          </Button>

          {/* Rehberlik/Öğretmen Girişi */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 sm:h-12 text-sm sm:text-base border-green-500 text-green-700 hover:bg-green-50"
            onClick={() => setShowTeacherCounselorModal(true)}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Rehberlik/Öğretmen Girişi
          </Button>
        </CardContent>
      </Card>

      {/* Rehberlik/Öğretmen Giriş Modal */}
      {showTeacherCounselorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <LogIn className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Rehberlik/Öğretmen Girişi</CardTitle>
                <CardDescription className="mt-1 sm:mt-2 text-sm sm:text-base">TC Kimlik numaranız ile giriş yapın</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
              <form onSubmit={handleTeacherCounselorLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tcNumber">TC Kimlik Numarası</Label>
                  <Input
                    id="tcNumber"
                    value={tcNumber}
                    onChange={(e) => setTcNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="TC Kimlik numaranızı girin"
                    required
                    disabled={loading}
                    maxLength={11}
                    pattern="[0-9]{11}"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowTeacherCounselorModal(false)
                      setTcNumber("")
                      setError("")
                    }}
                    disabled={loading}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={loading || tcNumber.length !== 11}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

