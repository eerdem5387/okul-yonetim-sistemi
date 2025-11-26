"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, Award, Lock, ArrowLeft } from "lucide-react"

export default function IBViewerLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/ib/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("ib_viewer_token", data.token)
        localStorage.setItem("ib_viewer_id", data.viewer.id)
        localStorage.setItem("ib_viewer_name", data.viewer.fullName)
        router.push("/ib-viewer")
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md card-premium border-0 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 w-20 h-20 flex items-center justify-center">
            <Award className="h-10 w-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">IB Program Görüntüleme</CardTitle>
            <CardDescription className="mt-2">
              Öğrenci faaliyet kayıtlarını görüntülemek için giriş yapın
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı girin"
                  required
                  disabled={loading}
                  className="pl-10"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin"
                  required
                  disabled={loading}
                  className="pl-10"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Giriş Sayfasına Dön
            </Button>
            <p className="text-xs text-center text-gray-500">
              Bu sayfa sadece yetkili IB personeli için tasarlanmıştır.
              <br />
              Erişim için okul yönetimi ile iletişime geçin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

