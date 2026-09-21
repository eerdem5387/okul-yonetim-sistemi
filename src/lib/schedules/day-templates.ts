import type { SchoolBand, SchoolDaySlotKind } from "@prisma/client"
import { DEFAULT_LESSON_SLOTS, type LessonSlot } from "@/lib/schedules/lesson-slots"

export type DaySlotInput = {
  label: string
  kind: SchoolDaySlotKind | "LESSON" | "BREAK"
  startTime: string
  endTime: string
}

export type DaySlotView = LessonSlot & {
  kind: "LESSON" | "BREAK"
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

/** İlk kurulum için varsayılan ders satırları (teneffüs yok; kullanıcı ekler). */
export function defaultSlotsForBand(band: SchoolBand): DaySlotInput[] {
  // Lise için aynı varsayılan; kullanıcı düzenler
  void band
  return DEFAULT_LESSON_SLOTS.map((s) => ({
    label: s.label,
    kind: "LESSON" as const,
    startTime: s.startTime,
    endTime: s.endTime,
  }))
}

export function toLessonSlots(
  rows: Array<{ id?: string; label: string; kind: string; startTime: string; endTime: string; sortOrder?: number }>
): DaySlotView[] {
  return rows.map((row, index) => ({
    id: index + 1,
    dbId: row.id,
    label: row.label,
    kind: row.kind === "BREAK" ? "BREAK" : "LESSON",
    startTime: row.startTime,
    endTime: row.endTime,
  }))
}
