"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/finans", label: "Özet", exact: true },
  { href: "/finans/talepler", label: "Harcama talepleri" },
  { href: "/finans/gelir-gider", label: "Gelir / Gider" },
  { href: "/finans/yetkiler", label: "Erişim yetkileri" },
]

export function FinanceTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TABS.map((tab) => {
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
