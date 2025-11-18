"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, User } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSecretaryLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: "secretary" })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("auth_role", "secretary")
        localStorage.setItem("auth_token", data.token || "authenticated")
        router.push("/")
        router.refresh()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Kullanıcı adı veya şifre hatalı!")
      }
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
          {/* Sekreter Girişi */}
          <form onSubmit={handleSecretaryLogin} className="space-y-4">
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
            <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Giriş yapılıyor..." : "Sekreter Olarak Giriş Yap"}
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
        </CardContent>
      </Card>
    </div>
  )
}

