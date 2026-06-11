"use client"

import type { HrApplicationMeetingOutcome } from "@prisma/client"
import {
  applicationMeetingOutcomeBadgeClass,
  applicationMeetingOutcomeLabel,
} from "./meeting-utils"

export function HrApplicationMeetingOutcomeBadge({
  outcome,
}: {
  outcome: HrApplicationMeetingOutcome | null | undefined
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${applicationMeetingOutcomeBadgeClass(outcome)}`}
    >
      {applicationMeetingOutcomeLabel(outcome)}
    </span>
  )
}
