"use client"

import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import OgretmenSidebar from "@/components/layout/ogretmen-sidebar"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [authRole, setAuthRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Client-side'da auth kontrolü
    const storedRole = localStorage.getItem("auth_role")
    let normalizedRole: "admin" | "principal" | "student_affairs" | "parent" | "teacher" | "counselor" | null = null

    if (storedRole === "admin" || storedRole === "principal" || storedRole === "student_affairs" || storedRole === "parent" || storedRole === "teacher" || storedRole === "counselor") {
      normalizedRole = storedRole
    } else if (storedRole) {
      // Eski veya geçersiz roller için localStorage temizle
      localStorage.removeItem("auth_role")
      localStorage.removeItem("auth_token")
      localStorage.removeItem("staff_id")
      localStorage.removeItem("staff_name")
      localStorage.removeItem("staff_department")
    }

    setAuthRole(normalizedRole)
    setIsLoading(false)
  }, [])

  // Auth kontrolü ve yönlendirme (pathname değiştiğinde)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (isLoading) {
      console.log("[Layout] ⏳ Loading, yönlendirme yapılmıyor")
      return // Loading sırasında yönlendirme yapma
    }

    const storedRole = localStorage.getItem("auth_role")
    const normalizedRole = storedRole === "admin" || storedRole === "principal" || storedRole === "student_affairs" || storedRole === "parent" || storedRole === "teacher" || storedRole === "counselor" ? storedRole : null

    console.log("[Layout] 🔍 Auth Kontrolü - Pathname:", pathname, "StoredRole:", storedRole, "NormalizedRole:", normalizedRole, "AuthRole State:", authRole)

    // IB Viewer sayfaları için özel kontrol
    if (pathname?.startsWith("/ib-viewer")) {
      if (pathname === "/ib-viewer/login") {
        return
      }
      const ibToken = localStorage.getItem("ib_viewer_token")
      if (!ibToken) {
        console.log("[Layout] ❌ IB Viewer token yok, /login'e yönlendiriliyor")
        router.push("/login")
        return
      }
    }

    // Öğretmen sayfaları için kontrol
    if (pathname?.startsWith("/ogretmen")) {
      if (normalizedRole !== "teacher") {
        console.log("[Layout] ❌ Öğretmen sayfası ama role teacher değil, /login'e yönlendiriliyor")
        router.push("/login")
        return
      }
    }

    // Rehberlik sayfaları için kontrol
    if (pathname?.startsWith("/rehberlik")) {
      if (normalizedRole !== "counselor") {
        console.log("[Layout] ❌ Rehberlik sayfası ama role counselor değil, /login'e yönlendiriliyor")
        router.push("/login")
        return
      }
    }

    // Veli sayfaları için kontrol (veli ve parent sayfaları)
    if (pathname?.startsWith("/veli") || pathname === "/parent") {
      console.log("[Layout] 👨‍👩‍👧 Veli sayfası kontrolü - Pathname:", pathname, "Role:", normalizedRole)
      if (normalizedRole !== "parent") {
        console.log("[Layout] ❌ Veli sayfası ama role parent değil! StoredRole:", storedRole, "/veli-login'e yönlendiriliyor")
        router.push("/veli-login")
        return
      }
      console.log("[Layout] ✅ Veli sayfası - Erişim izni var, yönlendirme yapılmıyor")
      // Parent rolü varsa, erişim izni var
      return
    }

    // Login sayfalarına herkes erişebilir
    const allowedPaths = ["/login", "/veli-login", "/ib-viewer/login", "/change-password"]
    const isAllowedPath = allowedPaths.some((p) => pathname === p || pathname?.startsWith(p))
    
    console.log("[Layout] 📋 Allowed paths kontrolü - Pathname:", pathname, "IsAllowed:", isAllowedPath, "Role:", normalizedRole)
    
    // Login sayfası değilse ve yetkili rol yoksa login'e yönlendir
    if (!isAllowedPath && !normalizedRole) {
      console.log("[Layout] ❌ Yetkisiz erişim, /login'e yönlendiriliyor")
      router.push("/login")
    }
  }, [pathname, router, isLoading, authRole])

  // Login, Veli Login ve Change Password sayfaları için özel layout
  if (pathname === "/login" || pathname === "/veli-login" || pathname === "/change-password") {
    return (
      <html lang="tr">
        <head>
          <title>Okul Yönetim Sistemi - Giriş</title>
          <meta name="description" content="Öğrenci kayıt ve sözleşme yönetim sistemi" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }

  // IB Viewer sayfaları için özel layout (sidebar yok)
  if (pathname?.startsWith("/ib-viewer")) {
    return (
      <html lang="tr">
        <head>
          <title>IB Program Görüntüleme - Okul Yönetim Sistemi</title>
          <meta name="description" content="IB programı öğrenci faaliyet görüntüleme" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }

  // Loading durumu
  if (isLoading) {
    return (
      <html lang="tr">
        <body className={inter.className}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-gray-600">Yükleniyor...</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  // Neredeyiz modülü için özel layout (kendi sidebar'ı var)
  if (pathname?.startsWith("/neredeyiz")) {
    return (
      <html lang="tr">
        <head>
          <title>Neredeyiz? - Yıllık Plan Takip Sistemi</title>
          <meta name="description" content="Yıllık plan takip ve ilerleme yönetim sistemi" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }

  // Öğretmen sayfaları için özel layout (sidebar ile)
  if (pathname?.startsWith("/ogretmen")) {
    return (
      <html lang="tr">
        <head>
          <title>Öğretmen Paneli - Okul Yönetim Sistemi</title>
          <meta name="description" content="Öğretmen yıllık plan takip paneli" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          <div className="flex h-screen bg-gray-50 lg:flex-row">
            <OgretmenSidebar />
            <div className="flex-1 overflow-y-auto w-full lg:w-auto">
              {children}
            </div>
          </div>
        </body>
      </html>
    )
  }

  // Rehberlik sayfaları için özel layout (kendi sidebar'ı var)
  if (pathname?.startsWith("/rehberlik")) {
    return (
      <html lang="tr">
        <head>
          <title>Rehberlik Paneli - Okul Yönetim Sistemi</title>
          <meta name="description" content="Rehberlik danışmanı yönetim paneli" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }

  // Veli sayfaları için özel layout (kendi sidebar'ı var)
  if (pathname?.startsWith("/veli") || pathname === "/parent") {
    return (
      <html lang="tr">
        <head>
          <title>Veli Paneli - Okul Yönetim Sistemi</title>
          <meta name="description" content="Veli paneli ve öğrenci takip sistemi" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }

  // Admin, Principal, Student Affairs, Counselor için normal layout (sidebar ile)
  // Counselor /rehberlik dışındaki sayfalarda (örn: /sinif-yonetimi) normal sidebar kullanır
  if (authRole === "admin" || authRole === "principal" || authRole === "student_affairs" || authRole === "counselor") {
    return (
      <html lang="tr">
        <head>
          <title>Okul Yönetim Sistemi</title>
          <meta name="description" content="Öğrenci kayıt ve sözleşme yönetim sistemi" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </body>
      </html>
    )
  }

  // Parent rolü için de layout render edilmeli (veli sayfaları için özel layout zaten yukarıda)
  // Eğer parent rolü varsa ama veli sayfası değilse, yine de render et (yönlendirme useEffect'te yapılacak)
  if (authRole === "parent") {
    console.log("[Layout] ✅ Parent rolü var, layout render ediliyor")
    // Veli sayfaları için özel layout zaten yukarıda kontrol edildi
    // Buraya düşerse, muhtemelen bir hata var, ama yine de render et
    return (
      <html lang="tr">
        <head>
          <title>Veli Paneli - Okul Yönetim Sistemi</title>
          <meta name="description" content="Veli paneli ve öğrenci takip sistemi" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }

  // Auth yoksa login'e yönlendir (bu durumda zaten yönlendirme yapıldı)
  console.log("[Layout] ⚠️ Auth yok, yönlendirme ekranı gösteriliyor")
  return (
    <html lang="tr">
      <body className={inter.className}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mx-auto mb-4" />
            <p className="text-gray-600">Yönlendiriliyor...</p>
          </div>
        </div>
      </body>
    </html>
  )
}
