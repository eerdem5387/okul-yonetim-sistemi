"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  BookOpen,
  ClipboardList,
  MessageSquare,
  LayoutDashboard,
  Calendar,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  GraduationCap,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OgretmenSidebarProps {
  className?: string
}

export default function OgretmenSidebar({ className }: OgretmenSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [staffName, setStaffName] = useState("")
  const [staffSubject, setStaffSubject] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name = localStorage.getItem("staff_name") || "Öğretmen"
      setStaffName(name)
      
      // Öğretmen ders bilgisini API'den çek
      const staffId = localStorage.getItem("staff_id")
      if (staffId) {
        fetch(`/api/staff/${staffId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.subject) {
              setStaffSubject(data.subject)
            }
          })
          .catch(() => {})
      }
    }
  }, [])

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

  const navigation = [
    { name: "Ana Sayfa", href: "/ogretmen", icon: Home },
    { name: "Ders Programım", href: "/ogretmen/ders-programim", icon: Calendar },
    { name: "Ödev Yönetimi", href: "/ogretmen/odevler", icon: BookOpen },
    { name: "Yoklama Al", href: "/ogretmen/yoklama", icon: ClipboardList },
    { name: "Öğrenci Görüşleri", href: "/ogretmen/gorusler", icon: MessageSquare },
    { name: "Öğrenci Dashboard", href: "/ogretmen/ogrenci-dashboard", icon: GraduationCap },
    { name: "Gecikmeler", href: "/ogretmen/gecikmeler", icon: AlertTriangle },
    { name: "Neredeyiz?", href: "/neredeyiz", icon: LayoutDashboard },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col h-screen bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 text-white transition-all duration-300 ease-in-out border-r border-blue-700 z-40",
          "lg:relative fixed",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
      {/* Header */}
      <div className="p-4 border-b border-blue-700/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Öğretmen Paneli</h2>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/ogretmen" && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                  : "hover:bg-white/10 text-white/90"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium truncate">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer - User Info */}
      <div className="p-4 border-t border-blue-700/50">
        {!isCollapsed ? (
          <div className="mb-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold text-white">
                  {staffName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{staffName}</p>
                {staffSubject && (
                  <span className="inline-block px-2 py-0.5 text-xs bg-white/20 rounded-full mt-1">
                    {staffSubject}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-xs font-bold text-white">
                {staffName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors w-full",
            "text-white/90 hover:text-white"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Çıkış Yap</span>}
        </button>
      </div>
      </div>
    </>
  )
}

