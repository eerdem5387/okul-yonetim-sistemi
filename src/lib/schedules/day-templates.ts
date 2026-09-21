import type { SchoolBand, SchoolDaySlotKind } from "@prisma/client"
import { DEFAULT_LESSON_SLOTS, type LessonSlot } from "@/lib/schedules/lesson-slots"

export type SlotKind = "LESSON" | "BREAK" | "ETUT"

export type DaySlotInput = {
  label: string
  kind: SlotKind
  startTime: string
  endTime: string
}

export type DaySlotView = LessonSlot & {
  kind: SlotKind
  dbId?: string
}

export function bandToEnum(band: string): SchoolBand | null {
  const b = band.toLowerCase()
  if (b === "ortaokul") return "ORTAOKUL"
  if (b === "lise") return "LISE"
  return null
}

export function enumToBand(band: SchoolBand): "ortaokul" | "lise" {
  return band === "ORTAOKUL" ? "ortaokul" : "lise"
}

export function normalizeSlotKind(raw: string, label?: string): SlotKind {
  const k = String(raw ?? "").toUpperCase()
  if (k === "BREAK") return "BREAK"
  if (k === "ETUT" || k === "STUDY" || k === "STUDY_HALL") return "ETUT"
  const labelLower = (label ?? "").toLocaleLowerCase("tr-TR")
  if (labelLower.includes("etüt") || labelLower.includes("etut")) return "ETUT"
  return "LESSON"
}

export function kindToDb(kind: SlotKind): SchoolDaySlotKind {
  if (kind === "BREAK") return "BREAK"
  if (kind === "ETUT") return "ETUT"
  return "LESSON"
}

/** İlk kurulum için varsayılan ders/etüt satırları. */
export function defaultSlotsForBand(band: SchoolBand): DaySlotInput[] {
  void band
  return DEFAULT_LESSON_SLOTS.map((s) => ({
    label: s.label,
    kind: normalizeSlotKind("LESSON", s.label),
    startTime: s.startTime,
    endTime: s.endTime,
  }))
}

export function toLessonSlots(
  rows: Array<{
    id?: string
    label: string
    kind: string
    startTime: string
    endTime: string
    sortOrder?: number
  }>
): DaySlotView[] {
  return rows.map((row, index) => ({
    id: index + 1,
    dbId: row.id,
    label: row.label,
    kind: normalizeSlotKind(row.kind, row.label),
    startTime: row.startTime,
    endTime: row.endTime,
  }))
}
