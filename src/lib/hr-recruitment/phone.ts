/** Tarayıcıda da kullanılabilen telefon yardımcıları (prisma içe aktarmaz). */
export const PLACEHOLDER_PHONE = "—"

export function isPlaceholderPhone(phone: string | null | undefined): boolean {
  if (!phone?.trim() || phone.trim() === PLACEHOLDER_PHONE) return true
  return false
}

export function formatDisplayPhone(phone: string | null | undefined): string {
  if (isPlaceholderPhone(phone)) return ""
  return phone!.trim()
}
