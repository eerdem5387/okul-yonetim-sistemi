import { validateAcademicYearTermDates } from "@/lib/academic-year-terms"

export function emptyToUndef(s: unknown): string | undefined {
  if (s == null) return undefined
  const t = String(s).trim()
  return t === "" ? undefined : t
}

export function filterWeekendDays(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((day: string) => day === "SATURDAY" || day === "SUNDAY")
}

export type ResolvedAcademicYearCalendar = {
  start: Date | null
  end: Date | null
  term1Start: Date | null
  term1End: Date | null
  term2Start: Date | null
  term2End: Date | null
  weekendDays: string[]
}

/**
 * requireFull: aktif yıl — tüm takvim + hafta tatili zorunlu.
 * aksi: taslak — yalnızca ad zorunlu; takvim ya tamamen boş ya tam dolu.
 */
export function resolveCalendarFromBody(
  body: Record<string, unknown>,
  requireFull: boolean
): { ok: true; data: ResolvedAcademicYearCalendar } | { ok: false; error: string } {
  const startS = emptyToUndef(body.startDate)
  const endS = emptyToUndef(body.endDate)
  const term1Start = emptyToUndef(body.term1Start)
  const term1End = emptyToUndef(body.term1End)
  const term2Start = emptyToUndef(body.term2Start)
  const term2End = emptyToUndef(body.term2End)
  const weekendDays = filterWeekendDays(body.weekendDays)

  const anyCal =
    !!(startS || endS || term1Start || term1End || term2Start || term2End)

  if (requireFull) {
    if (!startS || !endS) {
      return { ok: false, error: "Aktif akademik yıl için başlangıç ve bitiş tarihi zorunludur" }
    }
    if (!term1Start || !term1End || !term2Start || !term2End) {
      return { ok: false, error: "Aktif yıl için 1. ve 2. dönem başlangıç/bitiş tarihleri zorunludur" }
    }
    if (weekendDays.length < 1) {
      return { ok: false, error: "Aktif yıl için en az bir hafta tatili günü seçin (Cumartesi ve/veya Pazar)" }
    }
    const start = new Date(startS)
    const end = new Date(endS)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { ok: false, error: "Geçersiz tarih formatı" }
    }
    if (start >= end) {
      return { ok: false, error: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır" }
    }
    const termCheck = validateAcademicYearTermDates({
      yearStart: start,
      yearEnd: end,
      term1Start,
      term1End,
      term2Start,
      term2End,
    })
    if (!termCheck.ok) return { ok: false, error: termCheck.error }
    return {
      ok: true,
      data: {
        start,
        end,
        term1Start: new Date(term1Start),
        term1End: new Date(term1End),
        term2Start: new Date(term2Start),
        term2End: new Date(term2End),
        weekendDays,
      },
    }
  }

  if (!anyCal) {
    return {
      ok: true,
      data: {
        start: null,
        end: null,
        term1Start: null,
        term1End: null,
        term2Start: null,
        term2End: null,
        weekendDays: [],
      },
    }
  }

  if (!startS || !endS || !term1Start || !term1End || !term2Start || !term2End) {
    return {
      ok: false,
      error: "Takvimi kısmen doldurmayın: tüm tarih alanlarını girin veya hepsini boş bırakın (yalnızca taslak adı).",
    }
  }

  const start = new Date(startS)
  const end = new Date(endS)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, error: "Geçersiz tarih formatı" }
  }
  if (start >= end) {
    return { ok: false, error: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır" }
  }
  const termCheck = validateAcademicYearTermDates({
    yearStart: start,
    yearEnd: end,
    term1Start,
    term1End,
    term2Start,
    term2End,
  })
  if (!termCheck.ok) return { ok: false, error: termCheck.error }

  return {
    ok: true,
    data: {
      start,
      end,
      term1Start: new Date(term1Start),
      term1End: new Date(term1End),
      term2Start: new Date(term2Start),
      term2End: new Date(term2End),
      weekendDays,
    },
  }
}
