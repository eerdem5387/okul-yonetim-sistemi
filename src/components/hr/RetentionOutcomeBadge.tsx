"use client"

import type { StaffRetentionOutcome } from "@prisma/client"
import { retentionOutcomeBadgeClass, retentionOutcomeLabel } from "./retention-utils"

export function RetentionOutcomeBadge({
  outcome,
}: {
  outcome: StaffRetentionOutcome | null | undefined
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${retentionOutcomeBadgeClass(outcome)}`}
    >
      {retentionOutcomeLabel(outcome)}
    </span>
  )
}
