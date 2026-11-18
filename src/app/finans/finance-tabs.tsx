"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { canAccessExpenseRequests } from "@/lib/finance/expense-approval"

const TABS = [
  { href: "/finans", label: "Özet", exact: true },
  { href: "/finans/talepler", label: "Harcama talepleri" },
  { href: "/finans/gelir-gider", label: "Gelir / Gider" },
  { href: "/finans/yetkiler", label: "Erişim yetkileri" },
]

export function FinanceTabs() {
  const pathname = usePathname()
  const [showRequests, setShowRequests] = useState(false)
  useEffect(() => {
    setShowRequests(canAccessExpenseRequests(localStorage.getItem("staff_department")))
  }, [])
  const tabs = TABS.filter((tab) => tab.href !== "/finans/talepler" || showRequests)
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
