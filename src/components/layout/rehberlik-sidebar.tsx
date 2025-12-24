"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
} from "lucide-react"
import { useState, useEffect } from "react"

const navigation = [
  { name: "Dashboard", href: "/rehberlik", icon: LayoutDashboard },
  { name: "Neredeyiz?", href: "/rehberlik/neredeyiz", icon: Target },
  { name: "Sınıf Yönetimi", href: "/sinif-yonetimi", icon: School },
  { name: "Gezi Yönetimi", href: "/rehberlik/gezi", icon: MapPin },
  { name: "Kulüp Yönetimi", href: "/rehberlik/clubs", icon: Users },
  { name: "IB Faaliyet Yönetimi", href: "/rehberlik/activities", icon: Award },
  { name: "Veli Görüşmeleri", href: "/rehberlik/veli-gorusmeleri", icon: MessageSquare },
]

export function RehberlikSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [staffName, setStaffName] = useState<string>("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name = localStorage.getItem("staff_name")
      setStaffName(name || "Rehberlik Uzmanı")
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("auth_role")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("staff_id")
    localStorage.removeItem("staff_name")
    localStorage.removeItem("staff_department")
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-3 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-100"
        aria-label="Menüyü Aç/Kapat"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex h-full w-72 flex-col sidebar fixed lg:relative z-50 transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="sidebar-header px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 flex-shrink-0 bg-white rounded-xl shadow-lg p-2 flex items-center justify-center">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">Rehberlik</h1>
              <p className="text-xs text-green-100 mt-0.5">Yönetim Paneli</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/rehberlik" && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "sidebar-nav-item group",
                  isActive && "active"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-green-600"
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <div className="h-2 w-2 bg-white rounded-full shadow-lg animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-slate-50">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {staffName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {staffName}
              </p>
              <p className="text-xs text-gray-500">Rehberlik</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </div>
    </>
  )
}

