/**
 * IB Faaliyet formu doğrulama kuralları
 * - Tarih sırası: Başlangıç <= Bitiş
 * - Zorunlu alanlar
 */

import type { IbActivityFormData } from "@/types/ib-activity"

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateActivityForm(data: IbActivityFormData | null): ValidationResult {
  const errors: string[] = []
  if (!data) return { valid: false, errors: ["Form verisi yok."] }

  const { common } = data

  if (!common.title?.trim()) {
    errors.push("Başlık zorunludur.")
  }
  if (!common.participantIds?.length) {
    errors.push("En az bir katılımcı seçilmelidir.")
  }
  if (!common.startDate) {
    errors.push("Başlangıç tarihi zorunludur.")
  }
  if (!common.endDate) {
    errors.push("Bitiş tarihi zorunludur.")
  }
  if (common.startDate && common.endDate) {
    const start = new Date(common.startDate).getTime()
    const end = new Date(common.endDate).getTime()
    if (start > end) {
      errors.push("Başlangıç tarihi, bitiş tarihinden sonra olamaz.")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
