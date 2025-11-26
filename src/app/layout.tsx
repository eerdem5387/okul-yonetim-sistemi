"use client"

import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
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
    let normalizedRole: "student_affairs" | "parent" | null = null

    if (storedRole === "student_affairs" || storedRole === "parent") {
      normalizedRole = storedRole
    } else if (storedRole) {
      // Eski veya geçersiz roller için localStorage temizle
      localStorage.removeItem("auth_role")
      localStorage.removeItem("auth_token")
    }

    setAuthRole(normalizedRole)
    setIsLoading(false)

    // IB Viewer sayfaları için özel kontrol
    if (pathname?.startsWith("/ib-viewer")) {
      if (pathname === "/ib-viewer/login") {
        // Login sayfasına herkes erişebilir
        return
      }
      // IB Viewer sayfasına sadece token ile erişilebilir
      const ibToken = localStorage.getItem("ib_viewer_token")
      if (!ibToken) {
        // Token yoksa ana login sayfasına yönlendir
        router.push("/login")
        return
      }
    }

    // Login sayfası değilse ve Öğrenci İşleri rolü yoksa login'e yönlendir
    if (pathname !== "/login" && pathname !== "/parent" && !pathname?.startsWith("/ib-viewer") && normalizedRole !== "student_affairs") {
      router.push("/login")
    }

    // Parent sayfasına sadece parent rolü erişebilsin
    if (pathname === "/parent" && normalizedRole !== "parent") {
      router.push("/login")
    }
  }, [pathname, router])

  // Login sayfası için özel layout
  if (pathname === "/login") {
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

  // Veli paneli için özel layout (sidebar yok)
  if (pathname === "/parent") {
    return (
      <html lang="tr">
        <head>
          <title>Veli Paneli - Okul Yönetim Sistemi</title>
          <meta name="description" content="Veli öğrenci ve kulüp seçim paneli" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {children}
          </div>
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

  // Öğrenci İşleri için normal layout (sidebar ile)
  if (authRole === "student_affairs") {
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

  // Auth yoksa login'e yönlendir (bu durumda zaten yönlendirme yapıldı)
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
