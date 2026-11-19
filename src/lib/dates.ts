/**
 * Türkiye saatine göre "YYYY-AA-GG" tarih metni.
 * `toISOString().split("T")[0]` UTC tarihi verir; gece 00:00–03:00 arasında bir gün geri kayar.
 * Tarayıcıda da sunucuda (UTC) da aynı sonucu verir.
 */
const TR_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function isoDateTR(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  return TR_DATE.format(d)
}
