"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
  Menu,
  X,
  Calendar,
  Target,
} from "lucide-react"
import { useState, useEffect } from "react"

const navigation = [
  {
    name: "Dashboard",
    href: "/neredeyiz",
    icon: LayoutDashboard,
    description: "Genel bakış ve istatistikler",
  },
  {
    name: "İlerleme Takibi",
    href: "/neredeyiz/ilerleme",
    icon: TrendingUp,
    description: "Konu tamamlanma durumu",
  },
  {
    name: "Aksamalar",
    href: "/neredeyiz/aksamalar",
    icon: AlertTriangle,
    description: "Plan dışı gelişmeler",
  },
  {
    name: "Raporlar",
    href: "/neredeyiz/raporlar",
    icon: BarChart3,
    description: "Detaylı analiz ve raporlar",
  },
]

export function NeredeyizSidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [backUrl, setBackUrl] = useState("/")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      // Rehberlik kullanıcısı ise rehberlik paneline, değilse ana panele yönlendir
      setBackUrl(role === "counselor" ? "/rehberlik" : "/")
    }
  }, [])

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
          "flex h-full w-72 flex-col bg-gradient-to-b from-blue-600 to-blue-700 shadow-2xl fixed lg:relative z-50 transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="px-6 py-6 border-b border-blue-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative h-12 w-12 flex-shrink-0 bg-white rounded-xl shadow-lg p-2.5 flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Neredeyiz?</h1>
              <p className="text-xs text-blue-100 mt-0.5">Yıllık Plan Takip</p>
            </div>
          </div>
          <Link href={backUrl}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-white hover:bg-blue-500/50 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Panele Dön
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/neredeyiz" && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white text-blue-600 shadow-lg"
                    : "text-blue-100 hover:bg-blue-500/50 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    isActive ? "text-blue-600" : "text-blue-200 group-hover:text-white"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{item.name}</div>
                  <div
                    className={cn(
                      "text-xs mt-0.5 truncate",
                      isActive ? "text-blue-500" : "text-blue-200/70 group-hover:text-blue-100"
                    )}
                  >
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-blue-500/30">
          <div className="px-4 py-3 bg-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-blue-100 text-xs">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Yıllık Plan Takip Sistemi</span>
            </div>
            <p className="text-blue-200/70 text-[10px] mt-1">
              Eğitim-öğretim yılı ilerleme takibi
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

