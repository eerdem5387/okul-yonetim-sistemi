import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"

export const COMMS_MODULE = "messaging"
export const SEND_OFFICIAL_ACTION = "create" // StaffPermission: messaging.create = resmi gönderim yetkisi

export function isNativeOfficialSender(department: StaffDepartment): boolean {
  return department === "KURUCU" || department === "MUDUR" || department === "SUPER_ADMIN"
}

export function isRequestApprover(department: StaffDepartment): boolean {
  return department === "KURUCU" || department === "MUDUR" || department === "SUPER_ADMIN"
}

export function isGuidanceDepartment(department: StaffDepartment): boolean {
  return department === "REHBERLIK" || department === "BAS_REHBERLIK"
}

export function canManageTemplates(department: StaffDepartment): boolean {
  return department === "SUPER_ADMIN"
}

export function canCreateClassGroup(department: StaffDepartment): boolean {
  return department === "KURUCU" || department === "MUDUR" || department === "SUPER_ADMIN"
}

/** Sistem yöneticisi / Kurucu / Müdür — ileti, duyuru, sohbet, grup silme */
export function canDeleteComms(department: StaffDepartment): boolean {
  return department === "KURUCU" || department === "MUDUR" || department === "SUPER_ADMIN"
}

/** İhtar / talimat / idari duyuru gönderme */
export async function canSendOfficialNotice(staffId: string, department: StaffDepartment): Promise<boolean> {
  if (isNativeOfficialSender(department)) return true
  return hasPermission(staffId, department, COMMS_MODULE, SEND_OFFICIAL_ACTION)
}

/** Sınıf duyurusu: Kurucu/Müdür/yetkili + rehberlik */
export async function canSendClassAnnouncement(
  staffId: string,
  department: StaffDepartment
): Promise<boolean> {
  if (isGuidanceDepartment(department)) return true
  return canSendOfficialNotice(staffId, department)
}

export async function listActiveStaffIds(): Promise<string[]> {
  const rows = await prisma.staff.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
  return rows.map((r) => r.id)
}

/**
 * Resmi ileti alıcıları: gönderim yetkilileri (Kurucu/Müdür/grant) hiyerarşide alıcı değildir.
 */
export async function listOfficialNoticeRecipients(excludeStaffId?: string): Promise<
  Array<{ id: string; firstName: string; lastName: string; department: StaffDepartment; subject: string | null }>
> {
  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      ...(excludeStaffId ? { id: { not: excludeStaffId } } : {}),
      department: { notIn: ["KURUCU", "MUDUR", "SUPER_ADMIN"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      subject: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  const grants = await prisma.staffPermission.findMany({
    where: {
      module: COMMS_MODULE,
      action: SEND_OFFICIAL_ACTION,
      granted: true,
      staffId: { in: staff.map((s) => s.id) },
    },
    select: { staffId: true },
  })
  const granted = new Set(grants.map((g) => g.staffId))
  return staff.filter((s) => !granted.has(s.id))
}

export async function filterOfficialNoticeRecipientIds(
  candidateIds: string[],
  excludeStaffId?: string
): Promise<string[]> {
  const eligible = await listOfficialNoticeRecipients(excludeStaffId)
  const allowed = new Set(eligible.map((s) => s.id))
  return [...new Set(candidateIds)].filter((id) => id && allowed.has(id))
}
