import { prisma } from "@/lib/prisma"
import type { CommsActor } from "@/lib/comms/identity"

type Reader = { kind: "staff"; staffId: string } | { kind: "parent"; parentId: string }

export function readerOf(actor: CommsActor): Reader {
  return actor.kind === "staff"
    ? { kind: "staff", staffId: actor.staffId }
    : { kind: "parent", parentId: actor.parentId }
}

/** Sohbet okunmamış sayacının tutulduğu gruplar: kişinin üye (veya rehber) olduğu gruplar */
async function memberGroups(reader: Reader): Promise<Array<{ classGroupId: string; joinedAt: Date }>> {
  if (reader.kind === "parent") {
    return prisma.classGroupMember.findMany({
      where: { parentId: reader.parentId },
      select: { classGroupId: true, joinedAt: true },
    })
  }
  const [members, counselorGroups] = await Promise.all([
    prisma.classGroupMember.findMany({
      where: { staffId: reader.staffId },
      select: { classGroupId: true, joinedAt: true },
    }),
    prisma.classGroup.findMany({
      where: { counselorStaffId: reader.staffId },
      select: { id: true, createdAt: true },
    }),
  ])
  const map = new Map(members.map((m) => [m.classGroupId, m.joinedAt]))
  for (const g of counselorGroups) if (!map.has(g.id)) map.set(g.id, g.createdAt)
  return [...map.entries()].map(([classGroupId, joinedAt]) => ({ classGroupId, joinedAt }))
}

/** Grup başına okunmamış mesaj sayısı (kişinin kendi mesajları hariç). */
export async function unreadMessagesByGroup(
  reader: Reader,
  onlyGroupIds?: string[]
): Promise<Record<string, number>> {
  let groups = await memberGroups(reader)
  if (onlyGroupIds) {
    const allow = new Set(onlyGroupIds)
    groups = groups.filter((g) => allow.has(g.classGroupId))
  }
  if (!groups.length) return {}

  const reads = await prisma.classGroupRead.findMany({
    where: {
      classGroupId: { in: groups.map((g) => g.classGroupId) },
      ...(reader.kind === "staff" ? { staffId: reader.staffId } : { parentId: reader.parentId }),
    },
    select: { classGroupId: true, lastReadAt: true },
  })
  const readMap = new Map(reads.map((r) => [r.classGroupId, r.lastReadAt]))

  const counts = await Promise.all(
    groups.map(async (g) => {
      const since = readMap.get(g.classGroupId) ?? g.joinedAt
      const count = await prisma.classGroupMessage.count({
        where: {
          classGroupId: g.classGroupId,
          createdAt: { gt: since },
          ...(reader.kind === "staff"
            ? { OR: [{ senderStaffId: null }, { senderStaffId: { not: reader.staffId } }] }
            : { OR: [{ senderParentId: null }, { senderParentId: { not: reader.parentId } }] }),
        },
      })
      return [g.classGroupId, count] as const
    })
  )
  return Object.fromEntries(counts.filter(([, c]) => c > 0))
}

export async function totalUnreadMessages(reader: Reader): Promise<number> {
  const map = await unreadMessagesByGroup(reader)
  return Object.values(map).reduce((a, b) => a + b, 0)
}

export async function markGroupRead(groupId: string, reader: Reader): Promise<void> {
  const now = new Date()
  if (reader.kind === "staff") {
    await prisma.classGroupRead.upsert({
      where: { classGroupId_staffId: { classGroupId: groupId, staffId: reader.staffId } },
      create: { classGroupId: groupId, staffId: reader.staffId, lastReadAt: now },
      update: { lastReadAt: now },
    })
  } else {
    await prisma.classGroupRead.upsert({
      where: { classGroupId_parentId: { classGroupId: groupId, parentId: reader.parentId } },
      create: { classGroupId: groupId, parentId: reader.parentId, lastReadAt: now },
      update: { lastReadAt: now },
    })
  }
}

/** Personel rozet sayıları (me + unread-count ortak kaynağı) */
export async function staffBadges(staffId: string, approver: boolean) {
  const [unreadNotices, pendingRequests, decidedUnseen, unreadMessages] = await Promise.all([
    prisma.officialNotice.count({ where: { recipientStaffId: staffId, seenAt: null, deletedAt: null } }),
    approver ? prisma.staffCommsRequest.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    approver
      ? Promise.resolve(0)
      : prisma.staffCommsRequest.count({
          where: {
            requesterStaffId: staffId,
            status: { in: ["APPROVED", "REJECTED"] },
            decisionSeenAt: null,
          },
        }),
    totalUnreadMessages({ kind: "staff", staffId }),
  ])
  return { unreadNotices, pendingRequests, decidedRequests: decidedUnseen, unreadMessages }
}

export async function parentBadges(parentId: string) {
  const [unreadAnnouncements, unreadMessages] = await Promise.all([
    prisma.classAnnouncementAck.count({ where: { parentId, seenAt: null } }),
    totalUnreadMessages({ kind: "parent", parentId }),
  ])
  return { unreadAnnouncements, unreadMessages }
}
