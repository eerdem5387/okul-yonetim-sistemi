/** Sunucu/istemci ortak: dönem tarihleri doğrulama (ISO veya YYYY-MM-DD). */
export type TermDateInput = string | Date

export type ValidateTermDatesResult =
  | { ok: true }
  | { ok: false; error: string }

function toMs(d: TermDateInput): number {
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime()
  return t
}

/** Öğretim yılı sınırları içinde, 1. dönem ≤ 2. dönem ve arada en az bir gün boşluk (yarıyıl). */
export function validateAcademicYearTermDates(input: {
  yearStart: TermDateInput
  yearEnd: TermDateInput
  term1Start: TermDateInput
  term1End: TermDateInput
  term2Start: TermDateInput
  term2End: TermDateInput
}): ValidateTermDatesResult {
  const ys = toMs(input.yearStart)
  const ye = toMs(input.yearEnd)
  const t1s = toMs(input.term1Start)
  const t1e = toMs(input.term1End)
  const t2s = toMs(input.term2Start)
  const t2e = toMs(input.term2End)
  if ([ys, ye, t1s, t1e, t2s, t2e].some((n) => Number.isNaN(n))) {
    return { ok: false, error: "Geçersiz tarih değeri." }
  }
  if (ys >= ye) {
    return { ok: false, error: "Öğretim yılı bitişi başlangıçtan sonra olmalıdır." }
  }
  if (t1s < ys || t2e > ye) {
    return { ok: false, error: "Dönem tarihleri öğretim yılı başlangıç/bitiş aralığının dışına taşamaz." }
  }
  if (t1s > t1e || t2s > t2e) {
    return { ok: false, error: "Her dönemde bitiş, başlangıçtan önce olamaz." }
  }
  if (t1e >= t2s) {
    return { ok: false, error: "1. dönem bitişi, 2. dönem başlangıcından önce olmalıdır (yarıyıl aralığı için boşluk bırakın)." }
  }
  return { ok: true }
}

export type CurrentTermPhase = 1 | 2 | "between_terms" | "before_year" | "after_year" | "unknown"

export function getCurrentAcademicTermPhase(
  nowMs: number,
  year: {
    startDate: string
    endDate: string
    term1Start: string | null | undefined
    term1End: string | null | undefined
    term2Start: string | null | undefined
    term2End: string | null | undefined
  }
): CurrentTermPhase {
  const ys = new Date(year.startDate).getTime()
  const ye = new Date(year.endDate).getTime()
  if (!year.term1Start || !year.term1End || !year.term2Start || !year.term2End) {
    return "unknown"
  }
  const t1s = new Date(year.term1Start).getTime()
  const t1e = new Date(year.term1End).getTime()
  const t2s = new Date(year.term2Start).getTime()
  const t2e = new Date(year.term2End).getTime()
  if ([ys, ye, t1s, t1e, t2s, t2e].some((n) => Number.isNaN(n))) return "unknown"
  if (nowMs < ys) return "before_year"
  if (nowMs > ye) return "after_year"
  if (nowMs >= t1s && nowMs <= t1e) return 1
  if (nowMs >= t2s && nowMs <= t2e) return 2
  if (nowMs > t1e && nowMs < t2s) return "between_terms"
  if (nowMs >= ys && nowMs < t1s) return "between_terms"
  if (nowMs > t2e && nowMs <= ye) return "between_terms"
  return "unknown"
}

export function describeCurrentTermPhase(phase: CurrentTermPhase): string {
  switch (phase) {
    case 1:
      return "1. dönem"
    case 2:
      return "2. dönem"
    case "between_terms":
      return "Dönem arası / tatil"
    case "before_year":
      return "Yıl başlamadı"
    case "after_year":
      return "Yıl bitti"
    default:
      return "Dönem bilgisi yok"
  }
}
