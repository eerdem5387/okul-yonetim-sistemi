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
    // Client-side'da auth kontrolü
    const role = localStorage.getItem("auth_role")
    setAuthRole(role)
    setIsLoading(false)

    // Login sayfası değilse ve auth yoksa login'e yönlendir
    if (pathname !== "/login" && pathname !== "/parent" && !role) {
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

  // Sekreter için normal layout (sidebar ile)
  if (authRole === "secretary") {
    return (
      <html lang="tr">
        <head>
          <title>Okul Yönetim Sistemi</title>
          <meta name="description" content="Öğrenci kayıt ve sözleşme yönetim sistemi" />
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
