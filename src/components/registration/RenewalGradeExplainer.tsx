"use client"

import { Info } from "lucide-react"
import { RENEWAL_GRADE_RULE_SUMMARY } from "@/lib/renewal-grade-display"

interface RenewalGradeExplainerProps {
  compact?: boolean
  className?: string
}

export function RenewalGradeExplainer({
  compact = false,
  className = "",
}: RenewalGradeExplainerProps) {
  return (
    <div
      className={`flex gap-2 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2.5 text-sky-950 ${className}`}
    >
      <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" aria-hidden />
      <p className={compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"}>
        {RENEWAL_GRADE_RULE_SUMMARY}
      </p>
    </div>
  )
}
