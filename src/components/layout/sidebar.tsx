"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Users, 
  GraduationCap, 
  FileText, 
  Shirt, 
  Utensils, 
  Bus, 
  BookOpen, 
  History,
  UserPlus,
  Home,
  Menu,
  X
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Öğrenci Yönetimi", href: "/students", icon: UserPlus },
  { name: "Kulüp Yönetimi", href: "/clubs", icon: Users },
  { name: "Yeni Kayıt", href: "/new-registration", icon: GraduationCap },
  { name: "Kayıt Yenileme", href: "/renewal", icon: FileText },
  { name: "Forma Sözleşmesi", href: "/uniform", icon: Shirt },
  { name: "Yemek Sözleşmesi", href: "/meal", icon: Utensils },
  { name: "Servis Sözleşmesi", href: "/service", icon: Bus },
  { name: "Kitap Sözleşmesi", href: "/book", icon: BookOpen },
  { name: "Geçmiş Sözleşmeler", href: "/history", icon: History },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobil Hamburger Menü Butonu */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md hover:bg-gray-100 transition-colors"
        aria-label="Menüyü Aç/Kapat"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Mobil Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <div className={cn(
        "flex h-full w-64 flex-col sidebar fixed lg:relative z-40 transition-transform duration-300 ease-in-out",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-16 items-center px-4 border-b border-gray-200">
          <h1 className="text-xl font-bold" style={{ color: 'var(--primary-dark)' }}>Okul Yönetim Sistemi</h1>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  isActive
                    ? "sidebar-nav-item active"
                    : "sidebar-nav-item"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-3 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            © {new Date().getFullYear()} Developed by Yakın Boğaz
          </span>
        </div>
      </div>
    </>
  )
}
