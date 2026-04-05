import { prisma } from "@/lib/prisma"

/** Eski «placeholder» çocuk yıllarını temizler; yeni satır oluşturulmaz. */
export async function syncRenewalPlaceholderForPrimaryYear(primaryId: string): Promise<void> {
  const primary = await prisma.academicYear.findUnique({ where: { id: primaryId } })
  if (!primary || primary.parentActiveYearId != null) return
  await prisma.academicYear.deleteMany({ where: { parentActiveYearId: primaryId } })
}
