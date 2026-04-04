/** Sözleşme / istatistiklerde kullanılan "YYYY-YYYY" etiketi (mevcut new-registration uyumu). */
export function contractYearLabelFromAcademicYear(y: { name: string; startDate: Date | string }): string {
  const m = y.name.match(/(\d{4})\s*[-–/]\s*(\d{4})/)
  if (m) return `${m[1]}-${m[2]}`
  const start = new Date(y.startDate)
  if (Number.isNaN(start.getTime())) return y.name.trim() || ""
  const y0 = start.getFullYear()
  return `${y0}-${y0 + 1}`
}

export type AcademicYearListItem = {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

/** Aktif yıl (bayrak) veya takvim aralığına göre "içinde olduğumuz" yıl; sonra startDate sırasıyla bir sonrakı. */
/** Kayıt yenileme hedefi: aktif yılı takip eden tek bir sonraki yıl (sıra kontrollü). */
export function getRenewalTargetYearFromList(
  rows: AcademicYearListItem[]
): { id: string; name: string; label: string } | null {
  const { active, next } = resolveActiveAndNextAcademicYear(rows)
  if (!active || !next) return null
  const sorted = [...rows].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )
  const ai = sorted.findIndex((y) => y.id === active.id)
  if (ai < 0 || sorted[ai + 1]?.id !== next.id) return null
  return {
    id: next.id,
    name: next.name,
    label: contractYearLabelFromAcademicYear(next),
  }
}

/** Kayıt yenileme hedefi neden yok? (Aktif yıl varken çoğunlukla `no_following_year` — sonraki dönem satırı eksik.) */
export type RenewalYearSetupIssue = "no_years" | "no_active" | "no_following_year"

export function getRenewalYearSetupIssue(years: AcademicYearListItem[]): RenewalYearSetupIssue | null {
  if (getRenewalTargetYearFromList(years)) return null
  if (!years.length) return "no_years"
  const { active, next } = resolveActiveAndNextAcademicYear(years)
  if (!active) return "no_active"
  if (!next) return "no_following_year"
  return "no_following_year"
}

/** API / arayüz için açıklayıcı hata metni */
export function renewalSetupErrorMessage(
  issue: RenewalYearSetupIssue,
  years: AcademicYearListItem[]
): string {
  const { active } = resolveActiveAndNextAcademicYear(years)
  switch (issue) {
    case "no_years":
      return "Sistemde hiç akademik yıl kaydı yok. Ayarlar → Akademik Yıllar sekmesinden en az iki yıl ekleyin (aktif yıl + bir sonraki öğretim yılı)."
    case "no_active":
      return "Aktif öğretim yılı seçilemedi. Ayarlar’dan bir akademik yılı «Aktif» olarak işaretleyin veya takvimde içinde bulunduğumuz tarih aralığına denk gelen bir yıl tanımlayın."
    case "no_following_year": {
      const activePart = active
        ? ` Aktif kayıtlı yıl: «${active.name}».`
        : ""
      return (
        `${activePart} Kayıt yenileme yalnızca bir sonraki öğretim yılı için yapılır; bu yüzden listede aktif yıldan sonra başlayan ikinci bir akademik yıl da tanımlı olmalıdır (ör. 2026–2027). ` +
        `Ayarlar → Akademik Yıllar’dan «Yeni Akademik Yıl» ile sıradaki dönemi ekleyin; yıllar başlangıç tarihine göre sıralı olmalıdır.`
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
  const sorted = [...years].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )
  const byFlag = sorted.find((y) => y.isActive)
  const now = Date.now()
  const byDateRange = sorted.find((y) => {
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
