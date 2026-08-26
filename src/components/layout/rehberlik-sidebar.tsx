"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Target,
  MapPin,
  Users,
  Award,
  MessageSquare,
  School,
  Menu,
  X,
  LogOut,
  ClipboardList,
  FileText,
  Handshake,
  Contact,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { UnreadBadge } from "@/components/chat/UnreadBadge"
import { checkNavPermission, useStaffPermissions } from "@/hooks/use-staff-permissions"
import type { LucideIcon } from "lucide-react"

type NavDef = { name: string; href: string; icon: LucideIcon; module: string; action: string }

const baseNavigation: NavDef[] = [
  { name: "Dashboard", href: "/rehberlik", icon: LayoutDashboard, module: "dashboard", action: "view" },
  { name: "Mesajlar", href: "/mesajlar", icon: MessageSquare, module: "messaging", action: "view" },
  { name: "Neredeyiz?", href: "/rehberlik/neredeyiz", icon: Target, module: "neredeyiz", action: "view" },
  { name: "Sınıf Yönetimi", href: "/sinif-yonetimi", icon: School, module: "classes", action: "view" },
  { name: "Gezi Yönetimi", href: "/rehberlik/gezi", icon: MapPin, module: "gezi", action: "view" },
  { name: "Kulüp Yönetimi", href: "/rehberlik/clubs", icon: Users, module: "clubs", action: "view" },
  { name: "Faaliyet Yönetimi", href: "/faaliyet-yonetimi", icon: Award, module: "activity_events", action: "view" },
  { name: "Veli Görüşmeleri", href: "/rehberlik/veli-gorusmeleri", icon: MessageSquare, module: "parent_meetings", action: "view" },
]

const headCounselorNavigation: NavDef[] = [
  { name: "Bursluluk Başvuruları", href: "/basvurular", icon: ClipboardList, module: "applications", action: "view" },
  { name: "Yaz Okulu Başvuruları", href: "/yaz-okulu-basvurular", icon: ClipboardList, module: "applications", action: "view" },
  { name: "Teklif Görüşmeleri", href: "/teklif-gorusmeleri", icon: Handshake, module: "applications", action: "view" },
  { name: "Aday Öğrenci Tespiti", href: "/aday-ogrenci-tespiti", icon: Contact, module: "aday_tespit", action: "view" },
  { name: "Yeni Kayıt", href: "/new-registration", icon: FileText, module: "registrations", action: "create" },
  { name: "Kayıt Yenileme", href: "/renewal", icon: FileText, module: "registrations", action: "view" },
]

export function RehberlikSidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [staffName, setStaffName] = useState<string>("")
  const [isHeadCounselor, setIsHeadCounselor] = useState(false)
  const permState = useStaffPermissions()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name = localStorage.getItem("staff_name")
      const role = localStorage.getItem("auth_role")
      setStaffName(name || "Rehberlik Uzmanı")
      setIsHeadCounselor(role === "head_counselor")
    }
  }, [])

  const navigation = useMemo(() => {
    const base = baseNavigation.filter((item) =>
      checkNavPermission(permState, item.module, item.action, true)
    )
    const extra = headCounselorNavigation.filter((item) =>
      checkNavPermission(permState, item.module, item.action, isHeadCounselor)
    )
    return [...base, ...extra]
  }, [permState, isHeadCounselor])

  const handleLogout = () => {
    if (confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      localStorage.removeItem("auth_role")
      localStorage.removeItem("auth_token")
      localStorage.removeItem("staff_id")
      localStorage.removeItem("staff_name")
      localStorage.removeItem("staff_department")
      window.location.href = "/login"
    }
  }

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-3 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-100"
        aria-label="Menüyü Aç/Kapat"
      >
        {mobileMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <Menu className="h-6 w-6 text-gray-700" />}
      </button>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={cn(
          "flex h-full w-72 flex-col sidebar fixed lg:relative z-50 transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="sidebar-header px-6 py-6">
          <h1 className="text-xl font-bold text-white">Rehberlik</h1>
          <p className="text-xs text-blue-100 mt-1">Levent Kolej</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={`${item.href}-${item.name}`}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn("sidebar-nav-item group", isActive && "active")}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-blue-600"
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1">{item.name}</span>
                {item.href === "/mesajlar" && <UnreadBadge />}
              </Link>
            )
          })}
        </nav>

        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-slate-50">
          <p className="text-sm font-semibold text-gray-900 truncate mb-3">{staffName}</p>
          <Button variant="outline" className="w-full mb-3" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </div>
    </>
  )
}
