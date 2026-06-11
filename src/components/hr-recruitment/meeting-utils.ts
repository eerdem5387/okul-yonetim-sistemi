import type { HrApplicationMeetingOutcome } from "@prisma/client"
import { APPLICATION_MEETING_OUTCOME_LABELS } from "@/lib/hr-recruitment/meetings"

export function applicationMeetingOutcomeLabel(
  outcome: HrApplicationMeetingOutcome | null | undefined
): string {
  if (!outcome) return "Görüşme yok"
  return APPLICATION_MEETING_OUTCOME_LABELS[outcome]
}

export function applicationMeetingOutcomeBadgeClass(
  outcome: HrApplicationMeetingOutcome | null | undefined
): string {
  switch (outcome) {
    case "OLUMLU":
    case "ISE_ALINDI":
      return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
    case "TEKLIF":
      return "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200"
    case "KARARSIZ":
      return "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
    case "OLUMSUZ":
    case "RED":
      return "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
    default:
      return "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
  }
}
