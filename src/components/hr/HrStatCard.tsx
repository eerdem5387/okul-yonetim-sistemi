"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface HrStatCardProps {
  label: string
  value: number | string | ReactNode
  icon?: LucideIcon
  hint?: string
  tone?: "blue" | "amber" | "emerald" | "rose"
}

const TONE_STYLES: Record<NonNullable<HrStatCardProps["tone"]>, { bg: string; iconBg: string; ring: string }> = {
  blue: {
    bg: "from-blue-500/5 via-indigo-500/5 to-transparent",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
    ring: "ring-blue-100",
  },
  amber: {
    bg: "from-amber-500/5 via-orange-500/5 to-transparent",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
    ring: "ring-amber-100",
  },
  emerald: {
    bg: "from-emerald-500/5 via-teal-500/5 to-transparent",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
    ring: "ring-emerald-100",
  },
  rose: {
    bg: "from-rose-500/5 via-pink-500/5 to-transparent",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600 text-white",
    ring: "ring-rose-100",
  },
}

export function HrStatCard({ label, value, icon: Icon, hint, tone = "blue" }: HrStatCardProps) {
  const t = TONE_STYLES[tone]
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 transition-all hover:shadow-md",
        t.ring
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", t.bg)} />
      <div className="relative flex items-center gap-4">
        {Icon && (
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm", t.iconBg)}>
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
      </div>
    </div>
  )
}
