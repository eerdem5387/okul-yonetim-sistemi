/**
 * IB 4 ana faaliyet türü eşlemesi
 * Prisma ActivityType enum değerleri -> Eğitim, Etkinlik, Spor, Yarışma
 */

export const IB_MAIN_TYPES = ["education", "event", "sport", "competition"] as const
export type IbMainType = (typeof IB_MAIN_TYPES)[number]

export const IB_MAIN_TYPE_LABELS: Record<IbMainType, string> = {
  education: "Eğitim",
  event: "Etkinlik",
  sport: "Spor",
  competition: "Yarışma",
}

const EDUCATION_TYPES = ["SEMINER", "WORKSHOP", "DIL", "BILIM", "DEGER"]
const EVENT_TYPES = ["ETKINLIK", "GEZI", "SANAT", "SOSYAL"]
const SPORT_TYPES = ["SPORT"]
const COMPETITION_TYPES = ["YARISMA", "PROJE", "SINAV"]
const OTHER_TYPES = ["DIGER"]

/** Prisma ActivityType -> IbMainType (DIGER -> event) */
export function activityTypeToMain(type: string): IbMainType {
  if (EDUCATION_TYPES.includes(type)) return "education"
  if (EVENT_TYPES.includes(type)) return "event"
  if (SPORT_TYPES.includes(type)) return "sport"
  if (COMPETITION_TYPES.includes(type)) return "competition"
  if (OTHER_TYPES.includes(type)) return "event"
  return "event"
}
