import type { PrismaClient } from "@prisma/client"
import {
  getRenewalTargetYearFromList,
  type AcademicYearListItem,
} from "@/lib/academic-year-ui"

export function contractMatchesRenewalTarget(
  contractData: unknown,
  targetId: string,
  targetLabel: string
): boolean {
  const cd = contractData as Record<string, unknown>
  return (
    cd.academicYearId === targetId || String(cd.academicYear ?? "").trim() === targetLabel
  )
}

export type RenewalTargetInfo = { id: string; name: string; label: string }

export async function getRenewalTargetContext(client: PrismaClient): Promise<{
  target: RenewalTargetInfo | null
  renewedStudentIds: Set<string>
  newRegistrationStudentIds: Set<string>
}> {
  const yearRows = await client.academicYear.findMany({
    orderBy: { startDate: "desc" },
  })
  const list: AcademicYearListItem[] = yearRows.map((r) => ({
    id: r.id,
    name: r.name,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    isActive: r.isActive,
  }))
  const targetRow = getRenewalTargetYearFromList(list)
  if (!targetRow) {
    return {
      target: null,
      renewedStudentIds: new Set(),
      newRegistrationStudentIds: new Set(),
    }
  }
  const target: RenewalTargetInfo = {
    id: targetRow.id,
    name: targetRow.name,
    label: targetRow.label,
  }

  const [renewals, newRegs] = await Promise.all([
    client.renewal.findMany({ select: { studentId: true, contractData: true } }),
    client.newRegistration.findMany({ select: { studentId: true, contractData: true } }),
  ])

  const renewedStudentIds = new Set<string>()
  for (const r of renewals) {
    if (contractMatchesRenewalTarget(r.contractData, target.id, target.label)) {
      renewedStudentIds.add(r.studentId)
    }
  }
  const newRegistrationStudentIds = new Set<string>()
  for (const r of newRegs) {
    if (contractMatchesRenewalTarget(r.contractData, target.id, target.label)) {
      newRegistrationStudentIds.add(r.studentId)
    }
  }

  return { target, renewedStudentIds, newRegistrationStudentIds }
}

export function registrationStatusText(
  target: RenewalTargetInfo | null,
  studentId: string,
  renewedStudentIds: Set<string>,
  newRegistrationStudentIds: Set<string>
): string {
  if (!target) return "Kayıt dönemi tanımsız"
  if (newRegistrationStudentIds.has(studentId)) return "Yeni Kayıt"
  if (renewedStudentIds.has(studentId)) return `${target.label} kaydı yenilendi`
  return "Kaydı yenilenmedi"
}
