import { prisma } from "@/lib/prisma"
import {
  contractYearLabelFromAcademicYear,
  followingContractYearLabelFromRow,
  getRenewalTargetYearFromList,
  getRenewalYearSetupIssue,
  renewalSetupErrorMessage,
  resolveActiveAndNextAcademicYear,
  type AcademicYearListItem,
} from "@/lib/academic-year-ui"

export async function listAcademicYearsForContract(): Promise<AcademicYearListItem[]> {
  const rows = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    isActive: r.isActive,
    parentActiveYearId: r.parentActiveYearId,
    term1Start: r.term1Start?.toISOString() ?? null,
    term1End: r.term1End?.toISOString() ?? null,
    term2Start: r.term2Start?.toISOString() ?? null,
    term2End: r.term2End?.toISOString() ?? null,
  }))
}

/** Kayıt yenileme: yalnızca aktif yılı takip eden bir sonraki akademik yıl. */
export async function getRenewalTargetYear(): Promise<{
  id: string
  name: string
  label: string
} | null> {
  const rows = await listAcademicYearsForContract()
  return getRenewalTargetYearFromList(rows)
}

/** Yeni kayıt: yalnızca aktif veya bir sonraki yıl. */
export async function validateNewRegistrationAcademicYear(contractData: Record<string, unknown>): Promise<{
  ok: true
} | { ok: false; error: string }> {
  const rows = await listAcademicYearsForContract()
  const { active, next } = resolveActiveAndNextAcademicYear(rows)
  const allowed: Array<{ id: string; label: string }> = []
  if (active) {
    allowed.push({ id: active.id, label: contractYearLabelFromAcademicYear(active) })
    const follow = followingContractYearLabelFromRow(active)
    if (follow) allowed.push({ id: active.id, label: follow })
  }
  if (next && !next.parentActiveYearId) {
    allowed.push({ id: next.id, label: contractYearLabelFromAcademicYear(next) })
  }

  const label = (contractData.academicYear as string | undefined)?.trim()
  const id = (contractData.academicYearId as string | undefined)?.trim()

  if (!label) {
    return { ok: false, error: "Akademik yıl (etiket) zorunludur." }
  }
  if (!id) {
    return { ok: false, error: "Akademik yıl kimliği (academicYearId) zorunludur." }
  }

  const match = allowed.find((a) => a.label === label && a.id === id)
  if (!match) {
    return {
      ok: false,
      error:
        "Yeni kayıt yalnızca izin verilen akademik yıl ve etiket kombinasyonlarından biri için yapılabilir (aktif yıl, aynı kayıt üzerinden türetilen bir sonraki etiket veya bir sonraki ana yıl); etiket ve kimlik eşleşmelidir.",
    }
  }
  return { ok: true }
}

export async function validateRenewalAcademicYear(contractData: Record<string, unknown>): Promise<{
  ok: true
} | { ok: false; error: string }> {
  const rows = await listAcademicYearsForContract()
  const target = getRenewalTargetYearFromList(rows)
  if (!target) {
    const issue = getRenewalYearSetupIssue(rows)
    return {
      ok: false,
      error: issue
        ? renewalSetupErrorMessage(issue, rows)
        : "Akademik yıl ayarları kayıt yenileme için uygun değil.",
    }
  }
  const label = (contractData.academicYear as string | undefined)?.trim()
  const id = (contractData.academicYearId as string | undefined)?.trim()
  if (!label || label !== target.label) {
    return {
      ok: false,
      error: `Kayıt yenileme yalnızca aktif yıldan türetilen hedef etiket ile yapılabilir: ${target.label} (${target.name}).`,
    }
  }
  if (!id || id !== target.id) {
    return {
      ok: false,
      error:
        "Sözleşmedeki akademik yıl kimliği (academicYearId), aktif akademik yıl kaydı ile eşleşmelidir.",
    }
  }
  return { ok: true }
}
