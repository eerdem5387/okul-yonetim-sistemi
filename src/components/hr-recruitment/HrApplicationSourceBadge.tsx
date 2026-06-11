"use client"

import type { HrApplicationSource } from "@prisma/client"
import { Globe, UserPlus } from "lucide-react"
import { HR_SOURCE_COLORS, HR_SOURCE_LABELS } from "@/lib/hr-recruitment/constants"

export function HrApplicationSourceBadge({ source }: { source: HrApplicationSource }) {
  const Icon = source === "MANUAL" ? UserPlus : Globe

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${HR_SOURCE_COLORS[source]}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {HR_SOURCE_LABELS[source]}
    </span>
  )
}
