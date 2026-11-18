import { prisma } from "@/lib/prisma"
import { parseAcademicYearSpan } from "@/lib/academic-year-ui"

/**
 * Yıl devri (sınıf listelerini temizleme + öğrencileri bir üst sınıfa alma) yalnız
 * daha SONRAKİ bir yıla geçerken çalışır. Geçmiş bir yılı yeniden aktif yapmak (hata düzeltme)
 * devri ikinci kez çalıştırmaz.
 */
export function isLaterYear(next: { name: string; startDate?: Date | null }, prev: { name: string; startDate?: Date | null }): boolean {
  const a = parseAcademicYearSpan(next)
  const b = parseAcademicYearSpan(prev)
  if (a && b) return a.startYear > b.startYear
  if (next.startDate && prev.startDate) return next.startDate > prev.startDate
  return false
}

export const ROLLOVER_CONFIRM_ERROR =
  "Bu işlem yıl devrini başlatır: tüm sınıf listeleri temizlenir ve öğrenciler bir üst sınıfa alınır. Onaylamak için confirmRollover: true gönderin."

/** Silinmek istenen yıla bağlı veriler (varsa silme engellenir). */
export async function academicYearDependencies(id: string) {
  const [classes, subjects, activityEvents, clubBackups, holidays, disruptions] = await Promise.all([
    prisma.class.count({ where: { academicYearId: id } }),
    prisma.subject.count({ where: { academicYearId: id } }),
    prisma.activityEvent.count({ where: { academicYearId: id } }),
    prisma.clubBackup.count({ where: { academicYearId: id } }),
    prisma.holiday.count({ where: { academicYearId: id } }),
    prisma.disruption.count({ where: { academicYearId: id } }),
  ])
  return { classes, subjects, activityEvents, clubBackups, holidays, disruptions }
}
