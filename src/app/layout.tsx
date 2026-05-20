"use client"

import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import OgretmenSidebar from "@/components/layout/ogretmen-sidebar"
import VeliSidebar from "@/components/layout/veli-sidebar"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"

const inter = Inter({ subsets: ["latin"] })

type AuthRole = "admin" | "principal" | "student_affairs" | "parent" | "teacher" | "counselor" | "head_counselor" | null

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [authRole, setAuthRole] = useState<AuthRole>(null)
  const [isLoading, setIsLoading] = useState(true)
  const redirectingRef = useRef(false) // Yönlendirme yapılıyor mu kontrolü için

  // İlk yüklemede auth kontrolü
  useEffect(() => {
    if (typeof window === "undefined") return

    const checkAuth = () => {
      const storedRole = localStorage.getItem("auth_role")
      let normalizedRole: AuthRole = null

      if (storedRole === "admin" || storedRole === "principal" || storedRole === "student_affairs" || storedRole === "parent" || storedRole === "teacher" || storedRole === "counselor" || storedRole === "head_counselor") {
        normalizedRole = storedRole
      } else if (storedRole) {
        // Geçersiz rol - temizle
        localStorage.removeItem("auth_role")
        localStorage.removeItem("auth_token")
        localStorage.removeItem("staff_id")
        localStorage.removeItem("staff_name")
        localStorage.removeItem("staff_department")
        localStorage.removeItem("parent_id")
        localStorage.removeItem("student_id")
        localStorage.removeItem("student_name")
      }

      setAuthRole(normalizedRole)
      setIsLoading(false)
    }

    checkAuth()

    // Storage değişikliklerini dinle (başka tab'da logout gibi durumlar için)
    const handleStorageChange = () => {
      checkAuth()
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Pathname değiştiğinde auth kontrolü ve yönlendirme
  useEffect(() => {
    if (typeof window === "undefined") return
    if (isLoading) return
    if (redirectingRef.current) return // Zaten yönlendirme yapılıyorsa tekrar çalışma

    const storedRole = localStorage.getItem("auth_role")
    let normalizedRole: AuthRole = null

    if (storedRole === "admin" || storedRole === "principal" || storedRole === "student_affairs" || storedRole === "parent" || storedRole === "teacher" || storedRole === "counselor" || storedRole === "head_counselor") {
      normalizedRole = storedRole
    }

    // State'i güncelle (sadece gerçekten değiştiğinde)
    if (normalizedRole !== authRole) {
      setAuthRole(normalizedRole)
      // State güncellendiğinde bu effect tekrar çalışacak, bu yüzden şimdi return et
      return
    }

    // IB Viewer sayfaları için özel kontrol
    if (pathname?.startsWith("/ib-viewer")) {
      if (pathname === "/ib-viewer/login") return
      const ibToken = localStorage.getItem("ib_viewer_token")
      if (!ibToken) {
        if (!redirectingRef.current) {
          redirectingRef.current = true
          router.push("/login")
          setTimeout(() => { redirectingRef.current = false }, 100)
        }
        return
      }
      return
    }

    // Login sayfalarına herkes erişebilir
    const allowedPaths = ["/login", "/veli-login", "/ib-viewer/login", "/change-password"]
    const isAllowedPath = allowedPaths.some((p) => pathname === p || pathname?.startsWith(p))

    // Login sayfasındaysa ve zaten giriş yapılmışsa, rolüne göre yönlendir
    if (pathname === "/login" && normalizedRole) {
      if (!redirectingRef.current) {
        redirectingRef.current = true
        if (normalizedRole === "teacher") {
          router.push("/ogretmen")
        } else if (normalizedRole === "counselor" || normalizedRole === "head_counselor") {
          router.push("/rehberlik")
        } else if (normalizedRole === "parent") {
          router.push("/veli/panel")
        } else {
          router.push("/")
        }
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Veli login sayfasındaysa ve zaten parent rolü varsa, veli paneline yönlendir
    if (pathname === "/veli-login" && normalizedRole === "parent") {
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/veli/panel")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Öğretmen sayfaları için kontrol – sadece öğretmen erişir (Faaliyet Ekle admin vb. için /faaliyet-ekle)
    if (pathname?.startsWith("/ogretmen")) {
      if (normalizedRole !== "teacher") {
        if (!redirectingRef.current) {
          redirectingRef.current = true
          router.push("/login")
          setTimeout(() => { redirectingRef.current = false }, 100)
        }
        return
      }
      return
    }

    // Öğretmen — yeni faaliyet modülü (/faaliyet-yonetimi/*) sihirbaz ve detay (layout aşağıda OgretmenSidebar ile)
    if (pathname?.startsWith("/faaliyet-yonetimi") && normalizedRole === "teacher") {
      return
    }

    // Rehberlik sayfaları için kontrol (sistem yöneticisi dahil)
    if (pathname?.startsWith("/rehberlik")) {
      if (
        normalizedRole !== "counselor" &&
        normalizedRole !== "head_counselor" &&
        normalizedRole !== "admin"
      ) {
        if (!redirectingRef.current) {
          redirectingRef.current = true
          router.push("/login")
          setTimeout(() => { redirectingRef.current = false }, 100)
        }
        return
      }
      return
    }

    // Veli Görüşmeleri sayfası için özel kontrol (admin, principal, student_affairs, counselor erişebilir)
    // BU SAYFA VELİ PANELİNE YÖNLENDİRME YAPMAZ - SADECE GÖRÜNTÜLEME MODUNDA
    // ÖNEMLİ: Bu kontrol /veli kontrolünden ÖNCE yapılmalı çünkü /veli-gorusmeleri /veli ile başlıyor
    if (pathname === "/veli-gorusmeleri") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "counselor" || normalizedRole === "head_counselor") {
        // Bu roller için erişim izni var - YÖNLENDİRME YOK, direkt sayfaya erişebilirler
        return
      }
      // Parent rolü için de erişim izni var
      if (normalizedRole === "parent") {
        return
      }
      // Diğer roller için login'e yönlendir
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Admin Veli Görüşmeleri sayfası için kontrol (admin, principal, student_affairs erişebilir)
    if (pathname === "/admin/veli-gorusmeleri") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs") {
        // Bu roller için erişim izni var - YÖNLENDİRME YOK
        return
      }
      // Diğer roller için login'e yönlendir
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Yönetim Veli Görüşmeleri sayfası için kontrol (admin, principal, student_affairs erişebilir)
    // BU SAYFA YÖNLENDİRME YAPMAZ - SADECE GÖRÜNTÜLEME MODUNDA
    if (pathname === "/yonetim/parent-meetings") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs") {
        // Bu roller için erişim izni var - YÖNLENDİRME YOK
        return
      }
      // Diğer roller için login'e yönlendir
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    if (pathname === "/yonetim/ayarlar") {
      if (
        normalizedRole === "admin" ||
        normalizedRole === "principal" ||
        normalizedRole === "student_affairs" ||
        normalizedRole === "counselor" ||
        normalizedRole === "head_counselor"
      ) {
        return
      }
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    if (pathname === "/yonetim/yetkilendirme") {
      if (normalizedRole === "admin") return
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Veli sayfaları için kontrol (/veli-gorusmeleri ve /admin/veli-gorusmeleri hariç)
    // ÖNEMLİ: Bu kontrol /veli-gorusmeleri kontrolünden SONRA yapılmalı
    if ((pathname?.startsWith("/veli") && pathname !== "/veli-gorusmeleri") || pathname === "/parent") {
      if (normalizedRole !== "parent") {
        if (!redirectingRef.current) {
          redirectingRef.current = true
          router.push("/veli-login")
          setTimeout(() => { redirectingRef.current = false }, 100)
        }
        return
      }
      return
    }

    // Bursluluk Başvuruları sayfası için kontrol (admin, principal, student_affairs, head_counselor erişebilir)
    if (pathname === "/basvurular") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Yeni Kayıt sayfası için kontrol (admin, principal, student_affairs, head_counselor erişebilir)
    if (pathname === "/new-registration") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Kayıt Yenileme sayfası için kontrol (admin, principal, student_affairs, head_counselor erişebilir)
    if (pathname === "/renewal") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Geçmiş Sözleşmeler sayfası için kontrol (admin, principal, student_affairs, head_counselor erişebilir)
    if (pathname === "/history") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Teklif Görüşmeleri sayfası için kontrol (admin, principal, student_affairs, head_counselor erişebilir)
    if (pathname === "/teklif-gorusmeleri") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Faaliyet Ekle – admin, principal, student_affairs, counselor, head_counselor kendi panelinden erişir
    if (pathname === "/faaliyet-ekle") {
      if (normalizedRole != null && ["admin", "principal", "student_affairs", "counselor", "head_counselor"].includes(normalizedRole)) {
        return
      }
      if (normalizedRole === "teacher") {
        if (!redirectingRef.current) {
          redirectingRef.current = true
          router.push("/faaliyet-ekle")
          setTimeout(() => { redirectingRef.current = false }, 100)
        }
        return
      }
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Ana sayfa (/) için kontrol
    if (pathname === "/") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "counselor" || normalizedRole === "head_counselor") {
        // Ana sayfaya erişim izni var
        return
      }
      if (normalizedRole === "teacher") {
        if (!redirectingRef.current) {
          redirectingRef.current = true
          router.push("/ogretmen")
          setTimeout(() => { redirectingRef.current = false }, 100)
        }
        return
      }
      if (normalizedRole === "parent") {
        if (!redirectingRef.current) {
          redirectingRef.current = true
          router.push("/veli/panel")
          setTimeout(() => { redirectingRef.current = false }, 100)
        }
        return
      }
      // Auth yoksa login'e yönlendir
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }

    // Login sayfası değilse ve yetkili rol yoksa login'e yönlendir
    if (!isAllowedPath && !normalizedRole) {
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.push("/login")
        setTimeout(() => { redirectingRef.current = false }, 100)
      }
      return
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- authRole session'dan geliyor, pathname/isLoading değişince yeterli
  }, [pathname, router, isLoading])

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

  // IB Viewer sayfaları için özel layout
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

  // Neredeyiz modülü için özel layout
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

  // Öğretmen sayfaları için özel layout
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

  // Öğretmen — /mesajlar kök layout’ta sidebar (sayfa içinde tekrarlanmaması için)
  if (authRole === "teacher" && pathname === "/mesajlar") {
    return (
      <html lang="tr">
        <head>
          <title>Mesajlar - Öğretmen Paneli</title>
          <meta name="description" content="Okul içi mesajlaşma" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <body className={inter.className}>
          <div className="flex h-screen overflow-hidden bg-gray-50 lg:flex-row">
            <OgretmenSidebar />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </div>
        </body>
      </html>
    )
  }

  // Öğretmen — IB faaliyet sihirbazı/detayı /faaliyet-yonetimi altında; aynı öğretmen kabuğu
  if (authRole === "teacher" && pathname?.startsWith("/faaliyet-yonetimi")) {
    return (
      <html lang="tr">
        <head>
          <title>Faaliyet Yönetimi - Öğretmen Paneli</title>
          <meta name="description" content="IB faaliyet oluşturma ve takip" />
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

  // Rehberlik sayfaları için özel layout
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

  // Veli sayfaları için özel layout
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
          <div className="flex h-screen bg-gray-50">
            <VeliSidebar key="veli-sidebar" />
            <div
              className={
                pathname === "/veli/mesajlar"
                  ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                  : "flex-1 overflow-y-auto"
              }
            >
              {children}
            </div>
          </div>
        </body>
      </html>
    )
  }

  // Admin, Principal, Student Affairs, Counselor, Head Counselor için normal layout (sidebar ile)
  if (authRole === "admin" || authRole === "principal" || authRole === "student_affairs" || authRole === "counselor" || authRole === "head_counselor") {
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
            <main
              className={
                pathname === "/mesajlar"
                  ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
                  : "flex-1 overflow-y-auto"
              }
            >
              {children}
            </main>
          </div>
        </body>
      </html>
    )
  }

  // Auth yoksa yönlendirme ekranı
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
