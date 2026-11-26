import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { CommsActor } from "@/lib/comms/identity"
import { canManageGroup, isCommsManager, isGuidanceDepartment } from "@/lib/comms/access"

/** Veli adını gösterirken kullanılacak alanlar (TC numarası gösterilmez) */
export const PARENT_DISPLAY_SELECT = {
  id: true,
  students: {
    take: 1,
    orderBy: { createdAt: "asc" as const },
    select: { parentName: true, student: { select: { firstName: true, lastName: true } } },
  },
} as const

type ParentForDisplay = {
  students: Array<{ parentName: string | null; student: { firstName: string; lastName: string } | null }>
}

export function parentDisplayName(parent: ParentForDisplay | null | undefined): string {
  const link = parent?.students?.[0]
  const name = link?.parentName?.trim()
  const child = link?.student ? `${link.student.firstName} ${link.student.lastName}`.trim() : ""
  if (name && child) return `${name} (${child} velisi)`
  if (name) return name
  if (child) return `${child} velisi`
  return "Veli"
}

export type GroupAccess = {
  group: {
    id: string
    classId: string
    title: string
    counselorStaffId: string | null
    createdByStaffId: string | null
    parentsCanPost: boolean
  }
  isMember: boolean
  canManage: boolean
  canPost: boolean
}

/** Grup erişimi: üyeler, rehber, oluşturan, yönetim ve rehberlik birimi. */
export async function resolveGroupAccess(groupId: string, actor: CommsActor): Promise<GroupAccess | null> {
  const group = await prisma.classGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      classId: true,
      title: true,
      counselorStaffId: true,
      createdByStaffId: true,
      parentsCanPost: true,
    },
  })
  if (!group) return null

  const member = await prisma.classGroupMember.findFirst({
    where:
      actor.kind === "staff"
        ? { classGroupId: groupId, staffId: actor.staffId }
        : { classGroupId: groupId, parentId: actor.parentId },
    select: { id: true },
  })

  if (actor.kind === "parent") {
    if (!member) return null
    return { group, isMember: true, canManage: false, canPost: group.parentsCanPost }
  }

  const dept = actor.department as StaffDepartment
  const bypass =
    group.createdByStaffId === actor.staffId ||
    group.counselorStaffId === actor.staffId ||
    isCommsManager(dept) ||
    isGuidanceDepartment(dept)
  if (!member && !bypass) return null

  return {
    group,
    isMember: Boolean(member) || group.counselorStaffId === actor.staffId,
    canManage: canManageGroup(group, { staffId: actor.staffId, department: dept }),
    canPost: true,
  }
}

/** Gruba bildirim gidecek alıcılar (gönderen hariç) */
export async function groupAudience(groupId: string) {
  const [members, group] = await Promise.all([
    prisma.classGroupMember.findMany({
      where: { classGroupId: groupId },
      select: { staffId: true, parentId: true },
    }),
    prisma.classGroup.findUnique({ where: { id: groupId }, select: { counselorStaffId: true } }),
  ])
  const staffIds = new Set(members.map((m) => m.staffId).filter((x): x is string => Boolean(x)))
  if (group?.counselorStaffId) staffIds.add(group.counselorStaffId)
  const parentIds = new Set(members.map((m) => m.parentId).filter((x): x is string => Boolean(x)))
  return { staffIds: [...staffIds], parentIds: [...parentIds] }
}

/** Yalnızca kendi yüklememiz (Vercel Blob) kabul edilir; javascript: vb. bağlantılar reddedilir. */
export function sanitizeAttachmentUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== "https:") return null
    if (!u.hostname.endsWith(".blob.vercel-storage.com")) return null
    return u.toString()
  } catch {
    return null
  }
}
