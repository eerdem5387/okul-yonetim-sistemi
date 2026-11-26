import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"

export const COMMS_MODULE = "messaging"
export const SEND_OFFICIAL_ACTION = "create" // StaffPermission: messaging.create = resmi gönderim yetkisi

/** Mesaj/ileti metin sınırları */
export const COMMS_LIMITS = {
  subject: 200,
  body: 10_000,
  message: 4_000,
  note: 1_000,
} as const

const MANAGEMENT: StaffDepartment[] = ["KURUCU", "MUDUR", "SUPER_ADMIN"]

/** Kurucu / Müdür / Sistem yöneticisi */
export function isCommsManager(department: StaffDepartment): boolean {
  return MANAGEMENT.includes(department)
}

export function isNativeOfficialSender(department: StaffDepartment): boolean {
  return isCommsManager(department)
}

export function isRequestApprover(department: StaffDepartment): boolean {
  return isCommsManager(department)
}

export function isGuidanceDepartment(department: StaffDepartment): boolean {
  return department === "REHBERLIK" || department === "BAS_REHBERLIK"
}

/** Şablon yönetimi: yönetim (Kurucu/Müdür) + sistem yöneticisi */
export function canManageTemplates(department: StaffDepartment): boolean {
  return isCommsManager(department)
}

/** Resmi gönderim yetkisi (grant) dağıtımı: Kurucu + sistem yöneticisi */
export function canManageGrants(department: StaffDepartment): boolean {
  return department === "SUPER_ADMIN" || department === "KURUCU"
}

export function canCreateClassGroup(department: StaffDepartment): boolean {
  return isCommsManager(department)
}

/** Sistem yöneticisi / Kurucu / Müdür — ileti geri çekme, duyuru, sohbet, grup silme */
export function canDeleteComms(department: StaffDepartment): boolean {
  return isCommsManager(department)
}

/** Grup ayarları (veli yazma izni, üyeler, ad): yönetim veya grubun rehberi */
export function canManageGroup(
  group: { counselorStaffId: string | null; createdByStaffId?: string | null },
  actor: { staffId: string; department: StaffDepartment }
): boolean {
  return isCommsManager(actor.department) || group.counselorStaffId === actor.staffId
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

export type OfficialRecipient = {
  id: string
  firstName: string
  lastName: string
  department: StaffDepartment
  subject: string | null
}

/**
 * Resmi ileti alıcıları: gönderim yetkilileri (Kurucu/Müdür/grant) hiyerarşide alıcı değildir.
 */
export async function listOfficialNoticeRecipients(excludeStaffId?: string): Promise<OfficialRecipient[]> {
  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      ...(excludeStaffId ? { id: { not: excludeStaffId } } : {}),
      department: { notIn: MANAGEMENT },
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

/** Sınıf grubuna eklenebilecek personel: öğretmen + rehberlik */
export const GROUP_STAFF_DEPARTMENTS: StaffDepartment[] = ["OGRETMEN", "REHBERLIK", "BAS_REHBERLIK", "MUDUR_YARDIMCISI"]

export function clampText(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max)
}
