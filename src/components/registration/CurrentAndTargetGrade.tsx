"use client"

import { normalizeGradeLabel } from "@/lib/renewal-grade-display"

interface CurrentAndTargetGradeProps {
  currentGrade?: string | null
  targetGrade?: string | null
  layout?: "stack" | "inline"
  className?: string
}

export function CurrentAndTargetGrade({
  currentGrade,
  targetGrade,
  layout = "stack",
  className = "",
}: CurrentAndTargetGradeProps) {
  const current = currentGrade?.trim() ? normalizeGradeLabel(currentGrade) : null
  const target = targetGrade?.trim() ? normalizeGradeLabel(targetGrade) : null

  if (!current && !target) {
    return <span className="text-gray-400 text-sm">—</span>
  }

  const rowClass =
    layout === "inline"
      ? "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
      : "space-y-1 text-sm"

  return (
    <div className={`${rowClass} ${className}`}>
      <p className="text-gray-700">
        <span className="font-medium text-gray-900">Mevcut sınıf (bu yıl):</span>{" "}
        {current ?? "—"}
      </p>
      <p className="text-gray-700">
        <span className="font-medium text-gray-900">Hedef sınıf (yenileme):</span>{" "}
        {target ?? "—"}
      </p>
    </div>
  )
}
