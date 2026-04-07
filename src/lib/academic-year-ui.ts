/** Sözleşme / istatistiklerde kullanılan "YYYY-YYYY" etiketi (mevcut new-registration uyumu). */
export function contractYearLabelFromAcademicYear(y: {
  name: string
  startDate?: Date | string | null
}): string {
  const m = y.name.match(/(\d{4})\s*[-–/]\s*(\d{4})/)
  if (m) return `${m[1]}-${m[2]}`
  if (y.startDate != null && y.startDate !== "") {
    const start = new Date(y.startDate)
    if (!Number.isNaN(start.getTime())) {
      const y0 = start.getFullYear()
      return `${y0}-${y0 + 1}`
    }
  }
  return y.name.trim() || ""
}

/** Bir sonraki sözleşme yılı etiketi (YYYY-YYYY); isimde çift yıl yoksa başlangıç yılından türetilir. */
export function followingContractYearLabelFromRow(y: {
  name: string
  startDate?: Date | string | null
}): string | null {
  const m = y.name.match(/(\d{4})[-–/](\d{4})/)
  if (m) {
    const a = parseInt(m[1], 10)
    const b = parseInt(m[2], 10)
    if (Number.isNaN(a) || Number.isNaN(b)) return null
    return `${a + 1}-${b + 1}`
  }
  if (y.startDate == null || y.startDate === "") return null
  const start = new Date(y.startDate)
  if (Number.isNaN(start.getTime())) return null
  const y0 = start.getFullYear()
  return `${y0 + 1}-${y0 + 2}`
}

export type AcademicYearListItem = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  isActive: boolean
  parentActiveYearId?: string | null
  term1Start?: string | null
  term1End?: string | null
  term2Start?: string | null
  term2End?: string | null
}

/** Aktif yıl (bayrak) veya takvim aralığına göre "içinde olduğumuz" yıl; sonra startDate sırasıyla bir sonrakı. */
/** Kayıt yenileme hedefi: aktif yıl satırının kimliği + bir sonraki sözleşme yılı etiketi. */
export function getRenewalTargetYearFromList(
  rows: AcademicYearListItem[]
): { id: string; name: string; label: string } | null {
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
export type RenewalYearSetupIssue = "no_years" | "no_active" | "renewal_label_unknown"

export function getRenewalYearSetupIssue(years: AcademicYearListItem[]): RenewalYearSetupIssue | null {
  if (getRenewalTargetYearFromList(years)) return null
  if (!years.length) return "no_years"
  const { active } = resolveActiveAndNextAcademicYear(years)
  if (!active) return "no_active"
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
    case "renewal_label_unknown": {
      const activePart = active ? ` Aktif kayıtlı yıl: «${active.name}».` : ""
      return (
        `${activePart} Kayıt yenileme yılı etiketi çıkarılamadı. Yıl adında «2024-2025» biçiminde iki yıl içeren bir ifade kullanın ` +
        `veya geçerli bir öğretim yılı başlangıç tarihi girin (etiket başlangıç yılından türetilir).`
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
  const sorted = [...years].sort((a, b) => {
    const ta = a.startDate ? new Date(a.startDate).getTime() : 0
    const tb = b.startDate ? new Date(b.startDate).getTime() : 0
    if (ta !== tb) return ta - tb
    return a.name.localeCompare(b.name, "tr")
  })
  const primaries = sorted.filter((y) => !y.parentActiveYearId)
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
  const idx = sorted.findIndex((y) => y.id === active.id)
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1]! : null
  return { active, next }
}
