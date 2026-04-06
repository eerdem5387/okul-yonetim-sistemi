import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  contractYearLabelFromAcademicYear,
  resolveActiveAndNextAcademicYear,
} from "@/lib/academic-year-ui"
import {
  getRenewalTargetYear,
  listAcademicYearsForContract,
  validateNewRegistrationAcademicYear,
  validateRenewalAcademicYear,
} from "@/lib/academic-year-contract-server"
import { academicYearLabelsEquivalent } from "@/lib/student-registration-meta"

type PutError = { status: number; error: string; code?: string }

export async function updateNewRegistrationContract(
  registrationId: string,
  incoming: Record<string, unknown>
): Promise<{ ok: true; registration: unknown } | { ok: false } & PutError> {
  const existing = await prisma.newRegistration.findUnique({
    where: { id: registrationId },
    select: { studentId: true, contractData: true },
  })
  if (!existing) {
    return { ok: false, status: 404, error: "Registration not found" }
  }

  const oldRaw = (existing.contractData || {}) as Record<string, unknown>
  const merged: Record<string, unknown> = { ...oldRaw, ...incoming }

  const oldLabel = String(oldRaw.academicYear ?? "").trim()
  const oldId = String(oldRaw.academicYearId ?? "").trim()
  const newLabel = String(merged.academicYear ?? "").trim()
  const newId = String(merged.academicYearId ?? "").trim()
  const yearUnchanged =
    academicYearLabelsEquivalent(oldLabel, newLabel) && newId === oldId

  let mergedContractData: Record<string, unknown>

  if (yearUnchanged) {
    mergedContractData = { ...merged }
    const rows = await listAcademicYearsForContract()
    const { active, next } = resolveActiveAndNextAcademicYear(rows)
    const yearRow = [active, next].find(
      (y) =>
        y &&
        academicYearLabelsEquivalent(contractYearLabelFromAcademicYear(y), newLabel)
    )
    if (yearRow && (!newId || newId === yearRow.id)) {
      mergedContractData.academicYearId = yearRow.id
      mergedContractData.academicYear = contractYearLabelFromAcademicYear(yearRow)
    }
  } else {
    const regYearValidation = await validateNewRegistrationAcademicYear(merged)
    if (!regYearValidation.ok) {
      return { ok: false, status: 400, error: regYearValidation.error }
    }
    const rows = await listAcademicYearsForContract()
    const { active, next } = resolveActiveAndNextAcademicYear(rows)
    const yearId = String(merged.academicYearId ?? "").trim()
    const yearRow = [active, next].find((y) => y && y.id === yearId)
    mergedContractData = {
      ...merged,
      academicYear: yearRow ? contractYearLabelFromAcademicYear(yearRow) : merged.academicYear,
      academicYearId: yearId,
    }
  }

  const academicYear = mergedContractData.academicYear as string | undefined
  const yearIdFinal = mergedContractData.academicYearId as string | undefined
  if (academicYear) {
    const otherRegs = await prisma.newRegistration.findMany({
      where: { studentId: existing.studentId, NOT: { id: registrationId } },
      select: { contractData: true },
    })
    const hasDuplicate = otherRegs.some((reg) => {
      const cd = reg.contractData as Record<string, unknown>
      const sameLabel = academicYearLabelsEquivalent(cd.academicYear, academicYear)
      const sameId = yearIdFinal && cd.academicYearId === yearIdFinal
      return sameLabel || Boolean(sameId)
    })
    if (hasDuplicate) {
      return {
        ok: false,
        status: 409,
        error: "Bu öğrenci için seçilen akademik yılda zaten yeni kayıt yapılmış!",
        code: "DUPLICATE_REGISTRATION",
      }
    }
  }

  const registration = await prisma.newRegistration.update({
    where: { id: registrationId },
    data: { contractData: mergedContractData as Prisma.InputJsonValue },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          tcNumber: true,
        },
      },
    },
  })

  return { ok: true, registration }
}

export async function updateRenewalContract(
  renewalId: string,
  incoming: Record<string, unknown>
): Promise<{ ok: true; renewal: unknown } | { ok: false } & PutError> {
  const existing = await prisma.renewal.findUnique({
    where: { id: renewalId },
    select: { studentId: true, contractData: true },
  })
  if (!existing) {
    return { ok: false, status: 404, error: "Renewal not found" }
  }

  const oldRaw = (existing.contractData || {}) as Record<string, unknown>
  const merged: Record<string, unknown> = { ...oldRaw, ...incoming }
  merged.studentClass = oldRaw.studentClass

  const oldLabel = String(oldRaw.academicYear ?? "").trim()
  const oldId = String(oldRaw.academicYearId ?? "").trim()
  const newLabel = String(merged.academicYear ?? "").trim()
  const newId = String(merged.academicYearId ?? "").trim()
  const yearUnchanged =
    academicYearLabelsEquivalent(oldLabel, newLabel) && newId === oldId

  let mergedContractData: Record<string, unknown>

  if (yearUnchanged) {
    mergedContractData = { ...merged }
  } else {
    const renewalValidation = await validateRenewalAcademicYear(merged)
    if (!renewalValidation.ok) {
      return { ok: false, status: 400, error: renewalValidation.error }
    }
    const targetYear = await getRenewalTargetYear()
    if (!targetYear) {
      return {
        ok: false,
        status: 400,
        error: "Kayıt yenileme için aktif ve bir sonraki akademik yıl tanımlı olmalıdır.",
      }
    }
    mergedContractData = {
      ...merged,
      academicYear: targetYear.label,
      academicYearId: targetYear.id,
    }
  }

  const academicYear = mergedContractData.academicYear as string | undefined
  const academicYearId = mergedContractData.academicYearId as string | undefined
  if (academicYear) {
    const otherRenewals = await prisma.renewal.findMany({
      where: { studentId: existing.studentId, NOT: { id: renewalId } },
      select: { contractData: true },
    })
    const hasDuplicate = otherRenewals.some((r) => {
      const cd = r.contractData as Record<string, unknown>
      const sameLabel = academicYearLabelsEquivalent(cd.academicYear, academicYear)
      const sameId = academicYearId && cd.academicYearId === academicYearId
      return sameLabel || Boolean(sameId)
    })
    if (hasDuplicate) {
      return {
        ok: false,
        status: 409,
        error: "Bu öğrenci için seçilen akademik yılda zaten kayıt yenileme yapılmış!",
        code: "DUPLICATE_RENEWAL",
      }
    }
  }

  const renewal = await prisma.renewal.update({
    where: { id: renewalId },
    data: { contractData: mergedContractData as Prisma.InputJsonValue },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          tcNumber: true,
        },
      },
    },
  })

  return { ok: true, renewal }
}
