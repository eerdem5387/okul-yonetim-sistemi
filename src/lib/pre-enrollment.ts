import type { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"

/**
 * Student.preEnrollment bayrağını yeniden hesaplar.
 *
 * Ön kayıt = yalnızca aktif akademik yıldan SONRAKİ bir yıl için yeni kaydı olan (aktif yıla
 * kaydı olmayan) öğrenci; bu tanım getRenewalTargetContext().futureYearOnlyNewRegistrationStudentIds
 * ile aynıdır. Bayraklı öğrenciler kulüp, etüt, sınav, yoklama, etkinlik vb. listelerde ve yıl
 * devrinde (sınıf yükseltme) dikkate alınmaz. Kayıtlı oldukları yıl aktif yapıldığında bu fonksiyon
 * bayrağı kaldırır ve öğrenci normal öğrenci olur.
 *
 * Çağrıldığı yerler: yeni kayıt sözleşmesi ekleme/düzenleme/silme, öğrenci kayıt durumu
 * değişikliği, akademik yıl ekleme/düzenleme/silme.
 */
export async function syncPreEnrollmentFlags(client: PrismaClient = prisma): Promise<number> {
  const { futureYearOnlyNewRegistrationStudentIds } = await getRenewalTargetContext(client)
  const ids = [...futureYearOnlyNewRegistrationStudentIds]
  // updateMany varsayılan gizleme filtresinden etkilenmez.
  await client.$transaction([
    client.student.updateMany({
      where: { preEnrollment: true, ...(ids.length ? { id: { notIn: ids } } : {}) },
      data: { preEnrollment: false },
    }),
    ...(ids.length
      ? [client.student.updateMany({ where: { preEnrollment: false, id: { in: ids } }, data: { preEnrollment: true } })]
      : []),
  ])
  return ids.length
}

/** Asıl işlemi bozmadan bayrakları günceller (hata yalnızca loglanır). */
export async function syncPreEnrollmentFlagsSafe(): Promise<void> {
  try {
    await syncPreEnrollmentFlags()
  } catch (error) {
    console.error("[pre-enrollment] bayraklar güncellenemedi:", error)
  }
}
