export const DAY_NAMES = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const

export const WEEKDAY_INDEXES = [1, 2, 3, 4, 5] as const

export type LessonSlot = {
  id: number
  label: string
  startTime: string
  endTime: string
}

/** Varsayılan ders slotları — hücre tıklayınca hızlı doldurma için. Saatler formda serbestçe değiştirilebilir. */
export const DEFAULT_LESSON_SLOTS: LessonSlot[] = [
  { id: 1, label: "1. Ders", startTime: "08:00", endTime: "09:00" },
  { id: 2, label: "2. Ders", startTime: "09:00", endTime: "10:00" },
  { id: 3, label: "3. Ders", startTime: "10:00", endTime: "11:00" },
  { id: 4, label: "4. Ders", startTime: "11:00", endTime: "12:00" },
  { id: 5, label: "5. Ders", startTime: "12:00", endTime: "13:00" },
  { id: 6, label: "6. Ders", startTime: "13:00", endTime: "14:00" },
  { id: 7, label: "7. Ders", startTime: "14:00", endTime: "15:00" },
  { id: 8, label: "8. Ders", startTime: "15:00", endTime: "16:00" },
  { id: 9, label: "1. Etüt", startTime: "16:00", endTime: "17:00" },
  { id: 10, label: "2. Etüt", startTime: "17:00", endTime: "18:00" },
]

export type GradeBand = "all" | "ortaokul" | "lise"

export function gradeBandFor(grade: number): "ortaokul" | "lise" | null {
  if (grade >= 5 && grade <= 8) return "ortaokul"
  if (grade >= 9 && grade <= 12) return "lise"
  return null
}

export function gradesForBand(band: GradeBand): number[] | null {
  if (band === "ortaokul") return [5, 6, 7, 8]
  if (band === "lise") return [9, 10, 11, 12]
  return null
}

export function findSlotLabel(startTime: string, endTime?: string): string {
  const slot = DEFAULT_LESSON_SLOTS.find(
    (s) => s.startTime === startTime && (!endTime || s.endTime === endTime)
  )
  if (slot) return slot.label
  return `${startTime}${endTime ? `–${endTime}` : ""}`
}
