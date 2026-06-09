import type { StaffRetentionOutcome } from "@prisma/client"
import { RETENTION_OUTCOME_LABELS } from "@/lib/hr/retention"

export function retentionOutcomeLabel(outcome: StaffRetentionOutcome | null | undefined): string {
  if (!outcome) return "Görüşme Yapılmadı"
  return RETENTION_OUTCOME_LABELS[outcome]
}

export function retentionOutcomeBadgeClass(outcome: StaffRetentionOutcome | null | undefined): string {
  switch (outcome) {
    case "WILL_CONTINUE":
      return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
    case "UNCERTAIN":
      return "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
    case "WILL_NOT_CONTINUE":
      return "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
    default:
      return "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
  }
}
