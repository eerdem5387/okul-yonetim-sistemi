"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, BookOpen, Calendar, FileText, MessageSquare, LogOut, ChevronLeft, ChevronRight, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface VeliSidebarProps {
  className?: string
}

export default function VeliSidebar({ className }: VeliSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [studentName, setStudentName] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Öğrenci adını göster (veli adı yerine)
      const name = localStorage.getItem("student_name") || "Öğrenci"
      setStudentName(name)
    }
  }, [])

  const handleLogout = () => {
    if (confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      localStorage.removeItem("auth_role")
      localStorage.removeItem("auth_token")
      localStorage.removeItem("parent_id")
      localStorage.removeItem("parent_name")
      localStorage.removeItem("parent_relation")
      localStorage.removeItem("student_id")
      localStorage.removeItem("student_name")
      localStorage.removeItem("student_tc")
      window.location.href = "/veli-login"
    }
  }

  const navigation = [
    { name: "Öğrencim", href: "/veli/panel", icon: User },
    { name: "Kulüp Seçimi", href: "/parent", icon: Users },
  ]

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-green-600 via-emerald-600 to-teal-600 text-white transition-all duration-300 ease-in-out border-r border-green-700",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-green-700/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Veli Paneli</h2>
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
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
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
      <div className="p-4 border-t border-green-700/50">
        {!isCollapsed ? (
          <div className="mb-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold text-white">
                  {studentName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{studentName}</p>
                <span className="inline-block px-2 py-0.5 text-xs bg-white/20 rounded-full">
                  Öğrenci
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-xs font-bold text-white">
                {studentName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
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
  )
}

