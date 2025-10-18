"use client"

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
  Home
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

  return (
    <div className="flex h-full w-64 flex-col sidebar">
      <div className="flex h-16 items-center px-4 border-b border-gray-200">
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary-dark)' }}>Okul Yönetim Sistemi</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
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
    </div>
  )
}
