import type { ActivityMainType } from "@prisma/client"
import type { IbMainType } from "@/lib/ib-activity-types"

/** ActivityEvent.mainType → IB Viewer 4'lü grafik kategorisi */
export function activityMainTypeToIbViewer(mainType: ActivityMainType): IbMainType {
  switch (mainType) {
    case "EGITIM":
      return "education"
    case "SPOR":
      return "sport"
    case "TURNUVA":
      return "competition"
    default:
      return "event"
  }
}

export function emptyIbMainTypeCounts(): Record<IbMainType, number> {
  return { education: 0, event: 0, sport: 0, competition: 0 }
}
