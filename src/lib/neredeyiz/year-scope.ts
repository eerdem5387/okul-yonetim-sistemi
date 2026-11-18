import { prisma } from "@/lib/prisma"
import { getActiveAcademicYear } from "@/lib/activity-academic-year"

/**
 * Neredeyiz uç noktalarında akademik yıl seçimi:
 * `?academicYearId=<id>` verilmişse o yıl, yoksa aktif yıl (isActive, yoksa bugünü kapsayan yıl).
 * Hiç yıl bulunamazsa null.
 */
export async function resolveNeredeyizYearId(searchParams: URLSearchParams): Promise<string | null> {
  const raw = searchParams.get("academicYearId")?.trim()
  if (raw) {
    const y = await prisma.academicYear.findUnique({ where: { id: raw }, select: { id: true } })
    return y?.id ?? null
  }
  return (await getActiveAcademicYear())?.id ?? null
}
