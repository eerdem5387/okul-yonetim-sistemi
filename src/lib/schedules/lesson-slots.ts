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
export const SATURDAY_INDEX = 6 as const

export type ClassSaturdayMode = "FULL" | "EXAM_ONLY"

/** Sınıfın cumartesi ayarına göre görüntülenecek günler (hafta içi + opsiyonel cumartesi). */
export function dayIndexesForClass(saturdayEnabled?: boolean): number[] {
  return saturdayEnabled ? [...WEEKDAY_INDEXES, SATURDAY_INDEX] : [...WEEKDAY_INDEXES]
}

export const DENEME_SINAVI_SUBJECT = "Deneme Sınavı"

export type SlotKindHint = "LESSON" | "BREAK" | "ETUT"

export type LessonSlot = {
  id: number
  label: string
  startTime: string
  endTime: string
  /** Şablon satır türü; yoksa etiket üzerinden türetilir. */
  kind?: SlotKindHint
}

/** "8:40" / "08:40:00" → "08:40" — slot eşlemede biçim farklarını yok saymak için. */
export function normalizeTime(raw: string): string {
  const m = String(raw ?? "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})/)
  if (!m) return String(raw ?? "").trim()
  return `${m[1].padStart(2, "0")}:${m[2]}`
}

/**
 * Ortaokul (5–8) hafta içi varsayılanları — Excel import / SchoolDayTemplate ile uyumlu.
 * Fallback veya boş şablon seed’inde kullanılır; eski saatlik (08:00–09:00) varsayılanlar
 * import edilen 08:40 derslerini “slot dışında” bırakıyordu.
 */
export const DEFAULT_ORTAOKUL_WEEKDAY_SLOTS: LessonSlot[] = [
  { id: 1, label: "1. Ders", startTime: "08:40", endTime: "09:20", kind: "LESSON" },
  { id: 2, label: "2. Ders", startTime: "09:40", endTime: "10:20", kind: "LESSON" },
  { id: 3, label: "3. Ders", startTime: "10:30", endTime: "11:10", kind: "LESSON" },
  { id: 4, label: "4. Ders", startTime: "11:20", endTime: "12:00", kind: "LESSON" },
  { id: 5, label: "5. Ders", startTime: "12:40", endTime: "13:20", kind: "LESSON" },
  { id: 6, label: "6. Ders", startTime: "13:30", endTime: "14:10", kind: "LESSON" },
  { id: 7, label: "7. Ders", startTime: "14:20", endTime: "15:00", kind: "LESSON" },
  { id: 8, label: "8. Ders", startTime: "15:20", endTime: "16:00", kind: "LESSON" },
  { id: 9, label: "1. Etüt", startTime: "16:10", endTime: "16:40", kind: "ETUT" },
  { id: 10, label: "2. Etüt", startTime: "16:50", endTime: "17:20", kind: "ETUT" },
]

/** Lise (9–12) hafta içi — öğleden sonra ortaokuldan farklı. */
export const DEFAULT_LISE_WEEKDAY_SLOTS: LessonSlot[] = [
  { id: 1, label: "1. Ders", startTime: "08:40", endTime: "09:20", kind: "LESSON" },
  { id: 2, label: "2. Ders", startTime: "09:40", endTime: "10:20", kind: "LESSON" },
  { id: 3, label: "3. Ders", startTime: "10:30", endTime: "11:10", kind: "LESSON" },
  { id: 4, label: "4. Ders", startTime: "11:20", endTime: "12:00", kind: "LESSON" },
  { id: 5, label: "5. Ders", startTime: "12:50", endTime: "13:30", kind: "LESSON" },
  { id: 6, label: "6. Ders", startTime: "13:40", endTime: "14:20", kind: "LESSON" },
  { id: 7, label: "7. Ders", startTime: "14:30", endTime: "15:10", kind: "LESSON" },
  { id: 8, label: "8. Ders", startTime: "15:20", endTime: "16:00", kind: "LESSON" },
  { id: 9, label: "1. Etüt", startTime: "16:10", endTime: "16:40", kind: "ETUT" },
  { id: 10, label: "2. Etüt", startTime: "16:50", endTime: "17:20", kind: "ETUT" },
]

/** Geriye uyum: ortaokul hafta içi varsayılanı. */
export const DEFAULT_LESSON_SLOTS: LessonSlot[] = DEFAULT_ORTAOKUL_WEEKDAY_SLOTS

/** Cumartesi varsayılan saatleri (ortaokul / lise ortak sabah bloğu). */
export const DEFAULT_SATURDAY_SLOTS: LessonSlot[] = [
  { id: 1, label: "1. Ders", startTime: "08:40", endTime: "09:20", kind: "LESSON" },
  { id: 2, label: "2. Ders", startTime: "09:40", endTime: "10:20", kind: "LESSON" },
  { id: 3, label: "3. Ders", startTime: "10:30", endTime: "11:10", kind: "LESSON" },
  { id: 4, label: "4. Ders", startTime: "11:20", endTime: "12:00", kind: "LESSON" },
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

export function defaultWeekdaySlotsForBand(band: "ortaokul" | "lise" | null | undefined): LessonSlot[] {
  return band === "lise" ? DEFAULT_LISE_WEEKDAY_SLOTS : DEFAULT_ORTAOKUL_WEEKDAY_SLOTS
}

export function findSlotLabel(startTime: string, endTime?: string): string {
  const start = normalizeTime(startTime)
  const end = endTime ? normalizeTime(endTime) : undefined
  const pools = [
    DEFAULT_ORTAOKUL_WEEKDAY_SLOTS,
    DEFAULT_LISE_WEEKDAY_SLOTS,
    DEFAULT_SATURDAY_SLOTS,
  ]
  for (const pool of pools) {
    const slot = pool.find(
      (s) =>
        normalizeTime(s.startTime) === start && (!end || normalizeTime(s.endTime) === end)
    )
    if (slot) return slot.label
  }
  return `${startTime}${endTime ? `–${endTime}` : ""}`
}
