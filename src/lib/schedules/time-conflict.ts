/** HH:mm → dakika */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

/** İki zaman aralığı çakışıyor mu? */
export function hasTimeConflict(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const a0 = timeToMinutes(start1)
  const a1 = timeToMinutes(end1)
  const b0 = timeToMinutes(start2)
  const b1 = timeToMinutes(end2)
  return a0 < b1 && a1 > b0
}

export const DAY_LABELS: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
}
