"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Shirt, 
  Utensils, 
  Bus, 
  BookOpen, 
  UserPlus, 
  History,
  Menu,
  X,
  LogOut,
  ClipboardList,
  Award
} from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Bursluluk Başvuruları", href: "/basvurular", icon: ClipboardList },
  { name: "Öğrenci Yönetimi", href: "/students", icon: UserPlus },
  { name: "Kulüp Yönetimi", href: "/clubs", icon: Users },
  { name: "IB Faaliyet Yönetimi", href: "/activities", icon: Award },
  { name: "Yeni Kayıt", href: "/new-registration", icon: FileText },
  { name: "Kayıt Yenileme", href: "/renewal", icon: FileText },
  { name: "Forma Sözleşmesi", href: "/uniform", icon: Shirt },
  { name: "Yemek Sözleşmesi", href: "/meal", icon: Utensils },
  { name: "Servis Sözleşmesi", href: "/service", icon: Bus },
  { name: "Kitap Sözleşmesi", href: "/book", icon: BookOpen },
  { name: "Geçmiş Sözleşmeler", href: "/history", icon: History },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("auth_role")
    localStorage.removeItem("auth_token")
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
      <div className={cn(
        "flex h-full w-72 flex-col sidebar fixed lg:relative z-50 transition-transform duration-300 ease-in-out",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header with Logo */}
        <div className="sidebar-header px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 flex-shrink-0 bg-white rounded-xl shadow-lg p-2">
              <Image
                src="/logo.png"
                alt="Okul Logosu"
                fill
                className="object-contain rounded-lg"
                priority
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">Levent Kolej</h1>
              <p className="text-xs text-blue-100 mt-0.5">Okul Yönetim Sistemi</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
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
                    isActive ? "text-white" : "text-gray-500 group-hover:text-blue-600"
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
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Öğrenci İşleri</p>
              <p className="text-xs text-gray-500">Aktif Oturum</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mb-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış Yap
          </Button>
          <div className="text-center pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} 
              <span className="font-semibold text-gray-700"> Yakın Boğaz</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">v1.0.0</p>
          </div>
        </div>
      </div>
    </>
  )
}
