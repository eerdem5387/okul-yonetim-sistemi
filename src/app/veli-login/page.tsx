"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function VeliLoginPage() {
  const router = useRouter()
  const [studentTcNumber, setStudentTcNumber] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/parent-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentTcNumber: studentTcNumber.trim(),
          password: password.trim()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        console.log("[Veli Login] ✅ Login başarılı, localStorage'a kaydediliyor")
        
        // LocalStorage'a kaydet
        localStorage.setItem("auth_role", "parent")
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("parent_id", data.parent.id)
        localStorage.setItem("student_tc", data.parent.studentTcNumber)
        
        console.log("[Veli Login] 💾 LocalStorage kaydedildi - auth_role: parent, parent_id:", data.parent.id)
        
        // Öğrenci bilgisi varsa kaydet
        if (data.parent.student) {
          localStorage.setItem("student_id", data.parent.student.id)
          localStorage.setItem("student_name", `${data.parent.student.firstName} ${data.parent.student.lastName}`)
          console.log("[Veli Login] 💾 Öğrenci bilgisi kaydedildi - student_id:", data.parent.student.id, "student_name:", `${data.parent.student.firstName} ${data.parent.student.lastName}`)
        }
        
        // Veli bilgileri varsa kaydet (önce anne, yoksa baba)
        if (data.parent.parents && data.parent.parents.length > 0) {
          // Anne bilgisini öncelikli bul
          const mother = data.parent.parents.find((p: { relation: string }) => p.relation === "ANNE")
          const father = data.parent.parents.find((p: { relation: string }) => p.relation === "BABA")
          const guardian = data.parent.parents.find((p: { relation: string }) => p.relation === "VASI")
          
          // Anne varsa anne, yoksa baba, o da yoksa vasi
          const primaryParent = mother || father || guardian || data.parent.parents[0]
          localStorage.setItem("parent_name", primaryParent.name)
          localStorage.setItem("parent_relation", primaryParent.relation)
        }
        
        // LocalStorage kontrolü
        const checkRole = localStorage.getItem("auth_role")
        console.log("[Veli Login] 🔍 LocalStorage kontrolü - auth_role:", checkRole)
        
        // İlk giriş kontrolü
        if (data.parent.isFirstLogin) {
          console.log("[Veli Login] 🔄 İlk giriş, /change-password'e yönlendiriliyor")
          router.push("/change-password?parent=true")
          return
        }
        
        // Ana panele yönlendir
        console.log("[Veli Login] 🏠 /veli/panel'e yönlendiriliyor")
        router.push("/veli/panel")
        router.refresh()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "TC Kimlik numarası veya şifre hatalı!")
      }
    } catch (error) {
      console.error("Veli login error:", error)
      setError("Giriş yapılırken bir hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-3 sm:p-4 md:p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
              Veli Girişi
            </CardTitle>
            <CardDescription className="mt-1 sm:mt-2 text-sm sm:text-base">
              Öğrencinizin TC Kimlik No ile giriş yapın
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentTcNumber">Öğrencinin TC Kimlik Numarası</Label>
              <Input
                id="studentTcNumber"
                value={studentTcNumber}
                onChange={(e) => setStudentTcNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="Öğrencinizin 11 haneli TC numarasını girin"
                required
                disabled={loading}
                maxLength={11}
                pattern="[0-9]{11}"
              />
              <p className="text-xs text-gray-500">
                Öğrencinizin TC Kimlik numarasını girin
              </p>
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
                İlk girişte şifreniz öğrencinizin TC Kimlik numarasıdır
              </p>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-sm sm:text-base bg-green-600 hover:bg-green-700" 
              disabled={loading || studentTcNumber.length !== 11 || !password}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
          </div>

          {/* Personel Girişine Dön */}
          <div className="text-center">
            <Link href="/login">
              <Button
                type="button"
                variant="ghost"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Personel Girişine Dön
              </Button>
            </Link>
          </div>

          {/* Yardım Bilgisi */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-green-900">
              Giriş Yapamıyor musunuz?
            </h4>
            <p className="text-xs text-green-700">
              • <strong>Öğrencinizin</strong> TC Kimlik numarasını kullanın<br />
              • İlk girişte şifre: Öğrencinizin TC Kimlik numarası<br />
              • TC numarasını 11 haneli olarak eksiksiz girin<br />
              • Sorun devam ederse okul idaresi ile iletişime geçin
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

