const YEAR_SPAN_RE = /(\d{4})\s*[-–/]\s*(\d{4})/

/** Akademik yıl adı: "2027-2028 Akademik Yılı" */
export function formatAcademicYearName(startYear: number, endYear: number = startYear + 1): string {
  return `${startYear}-${endYear} Akademik Yılı`
}

/** Sözleşme etiketi: "2027-2028" */
export function formatAcademicYearLabel(startYear: number, endYear: number = startYear + 1): string {
  return `${startYear}-${endYear}`
}

/** Form seçenekleri (başlangıç yılı). */
export function academicYearStartOptions(centerYear = new Date().getFullYear(), span = 8): number[] {
  const start = centerYear - 3
  return Array.from({ length: span }, (_, i) => start + i)
}

/**
 * Yıldan yıl aralığını çıkarır (isim veya startDate).
 * Serbest metin / seçici fark etmez; sıralama ve «sonraki yıl» hesabı buna dayanır.
 */
export function parseAcademicYearSpan(y: {
  name?: string | null
  startDate?: Date | string | null
}): { startYear: number; endYear: number } | null {
  const name = y.name?.trim() ?? ""
  const m = name.match(YEAR_SPAN_RE)
  if (m) {
    const startYear = Number.parseInt(m[1], 10)
    const endYear = Number.parseInt(m[2], 10)
    if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) return { startYear, endYear }
  }
  if (y.startDate != null && y.startDate !== "") {
    const start = new Date(y.startDate)
    if (!Number.isNaN(start.getTime())) {
      const startYear = start.getFullYear()
      return { startYear, endYear: startYear + 1 }
    }
  }
  return null
}

/** Sözleşme / istatistiklerde kullanılan "YYYY-YYYY" etiketi (mevcut new-registration uyumu). */
export function contractYearLabelFromAcademicYear(y: {
  name: string
  startDate?: Date | string | null
}): string {
  const span = parseAcademicYearSpan(y)
  if (span) return formatAcademicYearLabel(span.startYear, span.endYear)
  return y.name.trim() || ""
}

/** Bir sonraki sözleşme yılı etiketi (YYYY-YYYY); isimde çift yıl yoksa başlangıç yılından türetilir. */
export function followingContractYearLabelFromRow(y: {
  name: string
  startDate?: Date | string | null
}): string | null {
  const span = parseAcademicYearSpan(y)
  if (!span) return null
  return formatAcademicYearLabel(span.startYear + 1, span.endYear + 1)
}

function compareAcademicYearsChrono(
  a: { name: string; startDate?: string | null },
  b: { name: string; startDate?: string | null },
): number {
  const sa = parseAcademicYearSpan(a)
  const sb = parseAcademicYearSpan(b)
  if (sa && sb && sa.startYear !== sb.startYear) return sa.startYear - sb.startYear
  if (sa && !sb) return -1
  if (!sa && sb) return 1

  const aTime = a.startDate ? new Date(a.startDate).getTime() : NaN
  const bTime = b.startDate ? new Date(b.startDate).getTime() : NaN
  const aHas = !Number.isNaN(aTime)
  const bHas = !Number.isNaN(bTime)
  if (aHas && bHas && aTime !== bTime) return aTime - bTime
  if (aHas !== bHas) return aHas ? -1 : 1
  return a.name.localeCompare(b.name, "tr")
}

export type AcademicYearListItem = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  isActive: boolean
  /** Kayıt yenileme kampanya dönemi (aktif öğretim yılından bağımsız). */
  isRenewalPeriod?: boolean
  parentActiveYearId?: string | null
  term1Start?: string | null
  term1End?: string | null
  term2Start?: string | null
  term2End?: string | null
}

/**
 * Kayıt yenileme hedefi:
 * 1) Ayarlar’da «Kayıt Yenileme Dönemi» açık olan yıl (isRenewalPeriod)
 * 2) Yoksa geriye dönük: aktif yıl + bir sonraki etiket
 */
export function getRenewalTargetYearFromList(
  rows: AcademicYearListItem[]
): { id: string; name: string; label: string } | null {
  const primaries = rows.filter((y) => !y.parentActiveYearId)
  const period = primaries.find((y) => y.isRenewalPeriod)
  if (period) {
    const label = contractYearLabelFromAcademicYear(period)
    if (!label) return null
    return {
      id: period.id,
      name: `${period.name} (kayıt yenileme dönemi)`,
      label,
    }
  }

  // Geriye dönük uyumluluk (dönem henüz set edilmemiş ortamlar)
  const { active } = resolveActiveAndNextAcademicYear(rows)
  if (!active) return null
  const label = followingContractYearLabelFromRow(active)
  if (!label) return null
  return {
    id: active.id,
    name: `${label} (kayıt yenileme hedefi)`,
    label,
  }
}

/** Kayıt yenileme hedefi neden yok? */
export type RenewalYearSetupIssue =
  | "no_years"
  | "no_active"
  | "no_renewal_period"
  | "renewal_label_unknown"

export function getRenewalYearSetupIssue(years: AcademicYearListItem[]): RenewalYearSetupIssue | null {
  if (getRenewalTargetYearFromList(years)) return null
  if (!years.length) return "no_years"
  const primaries = years.filter((y) => !y.parentActiveYearId)
  const hasPeriodFlag = primaries.some((y) => y.isRenewalPeriod)
  if (!hasPeriodFlag) {
    const { active } = resolveActiveAndNextAcademicYear(years)
    if (!active) return "no_renewal_period"
    return "renewal_label_unknown"
  }
  return "renewal_label_unknown"
}

/** API / arayüz için açıklayıcı hata metni */
export function renewalSetupErrorMessage(
  issue: RenewalYearSetupIssue,
  years: AcademicYearListItem[]
): string {
  const { active } = resolveActiveAndNextAcademicYear(years)
  switch (issue) {
    case "no_years":
      return "Sistemde hiç akademik yıl kaydı yok. Ayarlar → Akademik Yıllar sekmesinden öğretim yılını oluşturup aktif yapın."
    case "no_active":
      return "Aktif öğretim yılı seçilemedi. Ayarlar’dan bir akademik yılı «Aktif» olarak işaretleyin veya takvimde içinde bulunduğumuz tarih aralığına denk gelen bir yıl tanımlayın."
    case "no_renewal_period":
      return "Kayıt yenileme dönemi açık değil. Ayarlar → Akademik Yıllar bölümünden «Kayıt Yenileme Dönemi» switch’ini açın."
    case "renewal_label_unknown": {
      const activePart = active ? ` Aktif kayıtlı yıl: «${active.name}».` : ""
      return (
        `${activePart} Kayıt yenileme yılı etiketi çıkarılamadı. Yıl adında «2024-2025» biçiminde iki yıl içeren bir ifade kullanın ` +
        `veya Ayarlar’dan geçerli bir kayıt yenileme dönemi seçin.`
      )
    }
    default:
      return "Akademik yıl ayarları kayıt yenileme için uygun değil. Ayarlar sayfasını kontrol edin."
  }
}

export function resolveActiveAndNextAcademicYear(years: AcademicYearListItem[]): {
  active: AcademicYearListItem | null
  next: AcademicYearListItem | null
} {
  if (!years.length) return { active: null, next: null }
  const primaries = [...years]
    .filter((y) => !y.parentActiveYearId)
    .sort(compareAcademicYearsChrono)
  const byFlag = primaries.find((y) => y.isActive)
  const now = Date.now()
  const byDateRange = primaries.find((y) => {
    if (!y.startDate || !y.endDate) return false
    const s = new Date(y.startDate).getTime()
    const e = new Date(y.endDate).getTime()
    return !Number.isNaN(s) && !Number.isNaN(e) && now >= s && now <= e
  })
  const active = byFlag ?? byDateRange ?? null
  if (!active) return { active: null, next: null }

  /**
   * «Bir sonraki yıl»: ana kayıtlarda startYear (isimden veya startDate’ten) aktiften büyük
   * olan ilk yıl. Takvimsiz taslaklar da isimdeki YYYY-YYYY ile doğru sıraya girer.
   */
  const activeSpan = parseAcademicYearSpan(active)
  const next =
    (activeSpan
      ? primaries.find((y) => {
          if (y.id === active.id) return false
          const span = parseAcademicYearSpan(y)
          return span != null && span.startYear > activeSpan.startYear
        })
      : null) ??
    (() => {
      const idx = primaries.findIndex((y) => y.id === active.id)
      return idx >= 0 && idx < primaries.length - 1 ? primaries[idx + 1]! : null
    })()

  return { active, next }
}
