"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, LayoutDashboard, Calendar, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { isHrAdminClient } from "./hr-utils"

interface TabDef {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
  exact?: boolean
}

const TABS: TabDef[] = [
  { href: "/personel/dashboard", label: "HR Dashboard", icon: LayoutDashboard, adminOnly: true },
  { href: "/personel", label: "Personel Listesi", icon: Users, exact: true },
  { href: "/personel/izinler", label: "İzinler", icon: Calendar, adminOnly: true },
  { href: "/personel/nobet", label: "Nöbet", icon: Shield, adminOnly: true },
]

export function HrTabs() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(isHrAdminClient())
  }, [])

  const visible = TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="-mb-px flex flex-wrap gap-x-2 px-4 sm:px-6">
        {visible.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
