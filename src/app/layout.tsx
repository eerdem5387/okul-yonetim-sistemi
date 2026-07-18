"use client"

import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import OgretmenSidebar from "@/components/layout/ogretmen-sidebar"
import VeliSidebar from "@/components/layout/veli-sidebar"
import { usePathname } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import { ToastProvider } from "@/components/ui/toast"
import { isStaffAuthRole, isStaffTokenExpired } from "@/lib/auth/token"
import {
  invalidateExpiredStaffSession,
  installStaffSessionGuard,
} from "@/lib/auth/session-guard"
import { clearStaffSession, redirectToStaffLogin } from "@/lib/permissions/client"

const inter = Inter({ subsets: ["latin"] })

function LayoutBody({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <body className={className}>
      <ToastProvider>{children}</ToastProvider>
    </body>
  )
}

type AuthRole = "admin" | "principal" | "student_affairs" | "parent" | "teacher" | "counselor" | "head_counselor" | null

const PUBLIC_AUTH_PATHS = ["/login", "/veli-login", "/ib-viewer/login", "/change-password"]

function isPublicAuthPath(pathname: string | null): boolean {
  if (!pathname) return false
  return PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p))
}

function normalizeStoredRole(storedRole: string | null): AuthRole {
  if (
    storedRole === "admin" ||
    storedRole === "principal" ||
    storedRole === "student_affairs" ||
    storedRole === "parent" ||
    storedRole === "teacher" ||
    storedRole === "counselor" ||
    storedRole === "head_counselor"
  ) {
    return storedRole
  }
  return null
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [authRole, setAuthRole] = useState<AuthRole>(null)
  const [isLoading, setIsLoading] = useState(true)
  const redirectingRef = useRef(false)

  const hardRedirect = useCallback((href: string) => {
    if (redirectingRef.current) return
    redirectingRef.current = true
    window.location.href = href
  }, [])

  // İlk yüklemede auth kontrolü
  useEffect(() => {
    if (typeof window === "undefined") return

    const removeSessionGuard = installStaffSessionGuard()

    const checkAuth = () => {
      const storedRole = localStorage.getItem("auth_role")
      const token = localStorage.getItem("auth_token")
      const currentPath = window.location.pathname

      if (isStaffAuthRole(storedRole) && token && isStaffTokenExpired(token)) {
        clearStaffSession()
        setAuthRole(null)
        setIsLoading(false)
        if (!isPublicAuthPath(currentPath)) {
          redirectToStaffLogin("expired")
        }
        return
      }

      const normalizedRole = normalizeStoredRole(storedRole)

      if (storedRole && !normalizedRole) {
        clearStaffSession()
        localStorage.removeItem("parent_id")
        localStorage.removeItem("student_id")
        localStorage.removeItem("student_name")
      }

      setAuthRole(normalizedRole)
      setIsLoading(false)
    }

    checkAuth()

    const handleStorageChange = () => {
      checkAuth()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        invalidateExpiredStaffSession()
      }
    }
    const handleUserInteraction = () => {
      invalidateExpiredStaffSession()
    }

    window.addEventListener("storage", handleStorageChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    document.addEventListener("click", handleUserInteraction, true)
    return () => {
      removeSessionGuard()
      window.removeEventListener("storage", handleStorageChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("click", handleUserInteraction, true)
    }
  }, [])

  // Pathname değiştiğinde auth kontrolü ve yönlendirme
  useEffect(() => {
    if (typeof window === "undefined") return
    if (isLoading) return
    if (redirectingRef.current) return
    if (invalidateExpiredStaffSession()) return

    const storedRole = localStorage.getItem("auth_role")
    const normalizedRole = normalizeStoredRole(storedRole)

    if (normalizedRole !== authRole) {
      setAuthRole(normalizedRole)
      return
    }

    // IB Viewer sayfaları için özel kontrol
    if (pathname?.startsWith("/ib-viewer")) {
      if (pathname === "/ib-viewer/login") return
      const ibToken = localStorage.getItem("ib_viewer_token")
      if (!ibToken) {
        hardRedirect("/login")
        return
      }
      return
    }

    const isAllowedPath = isPublicAuthPath(pathname)

    // Login sayfasındaysa ve zaten giriş yapılmışsa, rolüne göre yönlendir
    if (pathname === "/login" && normalizedRole) {
      if (normalizedRole === "teacher") {
        hardRedirect("/ogretmen")
      } else if (normalizedRole === "counselor" || normalizedRole === "head_counselor") {
        hardRedirect("/rehberlik")
      } else if (normalizedRole === "parent") {
        hardRedirect("/veli/panel")
      } else {
        hardRedirect("/")
      }
      return
    }

    // Veli login sayfasındaysa ve zaten parent rolü varsa, veli paneline yönlendir
    if (pathname === "/veli-login" && normalizedRole === "parent") {
      hardRedirect("/veli/panel")
      return
    }

    // Öğretmen sayfaları için kontrol – sadece öğretmen erişir (Faaliyet Ekle admin vb. için /faaliyet-ekle)
    if (pathname?.startsWith("/ogretmen")) {
      if (normalizedRole !== "teacher") {
        hardRedirect("/login")
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
        hardRedirect("/login")
        return
      }
      return
    }

    // Veli Görüşmeleri sayfası için özel kontrol (admin, principal, student_affairs, counselor erişebilir)
    // BU SAYFA VELİ PANELİNE YÖNLENDİRME YAPMAZ - SADECE GÖRÜNTÜLEME MODUNDA
    // ÖNEMLİ: Bu kontrol /veli kontrolünden ÖNCE yapılmalı çünkü /veli-gorusmeleri /veli ile başlıyor
    if (pathname === "/veli-gorusmeleri") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "counselor" || normalizedRole === "head_counselor") {
        return
      }
      if (normalizedRole === "parent") {
        return
      }
      hardRedirect("/login")
      return
    }

    // Admin Veli Görüşmeleri sayfası için kontrol (admin, principal, student_affairs erişebilir)
    if (pathname === "/admin/veli-gorusmeleri") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs") {
        return
      }
      hardRedirect("/login")
      return
    }

    // Yönetim Veli Görüşmeleri sayfası için kontrol (admin, principal, student_affairs erişebilir)
    if (pathname === "/yonetim/parent-meetings") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs") {
        return
      }
      hardRedirect("/login")
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
      hardRedirect("/login")
      return
    }

    if (pathname === "/yonetim/yetkilendirme") {
      if (normalizedRole === "admin") return
      hardRedirect("/login")
      return
    }

    // Veli sayfaları için kontrol (/veli-gorusmeleri ve /admin/veli-gorusmeleri hariç)
    if ((pathname?.startsWith("/veli") && pathname !== "/veli-gorusmeleri") || pathname === "/parent") {
      if (normalizedRole !== "parent") {
        hardRedirect("/veli-login")
        return
      }
      return
    }

    // Bursluluk Başvuruları sayfası için kontrol
    if (pathname === "/basvurular") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      hardRedirect("/login")
      return
    }

    // Yaz Okulu Başvuruları sayfası için kontrol
    if (pathname === "/yaz-okulu-basvurular") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      hardRedirect("/login")
      return
    }

    // Yeni Kayıt sayfası için kontrol
    if (pathname === "/new-registration") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      hardRedirect("/login")
      return
    }

    // Kayıt Yenileme sayfası için kontrol
    if (pathname === "/renewal") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      hardRedirect("/login")
      return
    }

    // Geçmiş Sözleşmeler sayfası için kontrol
    if (pathname === "/history") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      hardRedirect("/login")
      return
    }

    // Teklif Görüşmeleri sayfası için kontrol
    if (pathname === "/teklif-gorusmeleri") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "head_counselor") {
        return
      }
      hardRedirect("/login")
      return
    }

    // Faaliyet Ekle – yetkili roller (öğretmen dahil; layout aşağıda OgretmenSidebar ile)
    if (pathname === "/faaliyet-ekle") {
      if (
        normalizedRole != null &&
        ["admin", "principal", "student_affairs", "counselor", "head_counselor", "teacher"].includes(
          normalizedRole
        )
      ) {
        return
      }
      hardRedirect("/login")
      return
    }

    // Ana sayfa (/) için kontrol
    if (pathname === "/") {
      if (normalizedRole === "admin" || normalizedRole === "principal" || normalizedRole === "student_affairs" || normalizedRole === "counselor" || normalizedRole === "head_counselor") {
        return
      }
      if (normalizedRole === "teacher") {
        hardRedirect("/ogretmen")
        return
      }
      if (normalizedRole === "parent") {
        hardRedirect("/veli/panel")
        return
      }
      hardRedirect("/login")
      return
    }

    // Öğretmen yalnızca kendi panel rotalarına erişebilir
    if (normalizedRole === "teacher") {
      const teacherPaths =
        pathname?.startsWith("/ogretmen") ||
        pathname === "/mesajlar" ||
        pathname === "/faaliyet-ekle" ||
        pathname?.startsWith("/faaliyet-yonetimi")
      if (!teacherPaths && !isAllowedPath) {
        hardRedirect("/ogretmen")
        return
      }
    }

    // Login sayfası değilse ve yetkili rol yoksa login'e yönlendir
    if (!isAllowedPath && !normalizedRole) {
      hardRedirect("/login")
      return
    }
  }, [pathname, isLoading, authRole, hardRedirect])

  // Loading durumu
  if (isLoading) {
    return (
      <html lang="tr">
        <LayoutBody className={inter.className}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-gray-600">Yükleniyor...</p>
            </div>
          </div>
        </LayoutBody>
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
        <LayoutBody className={inter.className}>
          {children}
        </LayoutBody>
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
        <LayoutBody className={inter.className}>
          {children}
        </LayoutBody>
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
        <LayoutBody className={inter.className}>
          {children}
        </LayoutBody>
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
        <LayoutBody className={inter.className}>
          <div className="flex h-screen bg-gray-50 lg:flex-row">
            <OgretmenSidebar />
            <div className="flex-1 overflow-y-auto w-full lg:w-auto">
              {children}
            </div>
          </div>
        </LayoutBody>
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
        <LayoutBody className={inter.className}>
          <div className="flex h-screen overflow-hidden bg-gray-50 lg:flex-row">
            <OgretmenSidebar />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </div>
        </LayoutBody>
      </html>
    )
  }

  // Öğretmen — faaliyet ekleme + yönetim/sihirbaz (/faaliyet-ekle, /faaliyet-yonetimi/*)
  if (
    authRole === "teacher" &&
    (pathname === "/faaliyet-ekle" || pathname?.startsWith("/faaliyet-yonetimi"))
  ) {
    return (
      <html lang="tr">
        <head>
          <title>Faaliyet Yönetimi - Öğretmen Paneli</title>
          <meta name="description" content="Faaliyet oluşturma ve takip" />
          <link rel="icon" href="/logo.png?v=2" type="image/png" />
          <link rel="apple-touch-icon" href="/logo.png?v=2" />
        </head>
        <LayoutBody className={inter.className}>
          <div className="flex h-screen bg-gray-50 lg:flex-row">
            <OgretmenSidebar />
            <div className="flex-1 overflow-y-auto w-full lg:w-auto">
              {children}
            </div>
          </div>
        </LayoutBody>
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
        <LayoutBody className={inter.className}>
          {children}
        </LayoutBody>
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
        <LayoutBody className={inter.className}>
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
        </LayoutBody>
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
        <LayoutBody className={inter.className}>
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
        </LayoutBody>
      </html>
    )
  }

  // Öğretmen — beklenmeyen rotalarda login veya panele yönlendir
  if (
    authRole === "teacher" &&
    pathname !== "/login" &&
    pathname !== "/change-password" &&
    !pathname?.startsWith("/ogretmen") &&
    pathname !== "/mesajlar" &&
    pathname !== "/faaliyet-ekle" &&
    !pathname?.startsWith("/faaliyet-yonetimi")
  ) {
    if (typeof window !== "undefined") {
      window.location.href = "/ogretmen"
    }
    return (
      <html lang="tr">
        <LayoutBody className={inter.className}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-gray-600">Öğretmen paneline yönlendiriliyor...</p>
            </div>
          </div>
        </LayoutBody>
      </html>
    )
  }

  // Auth yoksa login'e yönlendir
  if (!authRole && pathname && !isPublicAuthPath(pathname) && !pathname.startsWith("/ib-viewer")) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    return (
      <html lang="tr">
        <LayoutBody className={inter.className}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-gray-600">Giriş sayfasına yönlendiriliyor...</p>
            </div>
          </div>
        </LayoutBody>
      </html>
    )
  }

  return (
    <html lang="tr">
      <LayoutBody className={inter.className}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mx-auto mb-4" />
            <p className="text-gray-600">Yönlendiriliyor...</p>
          </div>
        </div>
      </LayoutBody>
    </html>
  )
}
