import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/comms/identity"
import { clampText, COMMS_LIMITS } from "@/lib/comms/access"
import {
  groupAudience,
  PARENT_DISPLAY_SELECT,
  parentDisplayName,
  resolveGroupAccess,
  sanitizeAttachmentUrl,
} from "@/lib/comms/groups"
import { markGroupRead, readerOf } from "@/lib/comms/unread"
import { notifyParentsComms, notifyStaffComms } from "@/lib/comms/notify"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

const PAGE_SIZE = 80

type AckRow = { id: string; seenAt: Date | null }

type Sender = { kind: "staff" | "parent"; id: string; displayName: string } | null

/**
 * Sohbet zaman çizelgesi (mesaj + duyuru), en yeniden geriye sayfalı.
 * `before` (ISO) verilirse o andan eski sayfa döner. İlk sayfa okundu olarak işaretlenir.
 */
export async function GET(request: NextRequest, context: Ctx) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params

  const access = await resolveGroupAccess(id, chat)
  if (!access) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const beforeRaw = request.nextUrl.searchParams.get("before")
  const before = beforeRaw ? new Date(beforeRaw) : null
  const createdBefore = before && !Number.isNaN(before.getTime()) ? { lt: before } : undefined

  const rows = await prisma.classGroupMessage.findMany({
    where: { classGroupId: id, ...(createdBefore ? { createdAt: createdBefore } : {}) },
    include: {
      senderStaff: { select: { id: true, firstName: true, lastName: true } },
      senderParent: { select: PARENT_DISPLAY_SELECT },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
  })
  const hasMore = rows.length > PAGE_SIZE
  const messages = rows.slice(0, PAGE_SIZE).reverse()
  const lowerBound = hasMore && messages.length ? messages[0].createdAt : null

  const announcements = await prisma.classAnnouncement.findMany({
    where: {
      classGroupId: id,
      createdAt: {
        ...(createdBefore ?? {}),
        ...(lowerBound ? { gte: lowerBound } : {}),
      },
    },
    include: {
      senderStaff: { select: { id: true, firstName: true, lastName: true } },
      ...(chat.kind === "parent"
        ? { acks: { where: { parentId: chat.parentId }, take: 1 } }
        : { _count: { select: { acks: true } } }),
    },
    orderBy: { createdAt: "asc" },
  })

  // Personel: duyuru başına okuma sayısı
  const seenCounts =
    chat.kind === "staff" && announcements.length
      ? await prisma.classAnnouncementAck.groupBy({
          by: ["announcementId"],
          where: { announcementId: { in: announcements.map((a) => a.id) }, seenAt: { not: null } },
          _count: { _all: true },
        })
      : []
  const seenMap = new Map(seenCounts.map((s) => [s.announcementId, s._count._all]))

  // Veli: görüntülenen duyurular okundu sayılır
  const now = new Date()
  const markedSeen = new Set<string>()
  if (chat.kind === "parent") {
    const unreadIds: string[] = []
    for (const a of announcements) {
      const ack = "acks" in a ? (a.acks as AckRow[])[0] : undefined
      if (ack && !ack.seenAt) unreadIds.push(ack.id)
    }
    if (unreadIds.length > 0) {
      await prisma.classAnnouncementAck.updateMany({
        where: { id: { in: unreadIds } },
        data: { seenAt: now },
      })
      for (const ackId of unreadIds) markedSeen.add(ackId)
    }
  }

  if (!createdBefore) await markGroupRead(id, readerOf(chat))

  const timeline = [
    ...messages.map((m) => ({
      kind: "message" as const,
      id: m.id,
      body: m.body,
      attachmentUrl: m.attachmentUrl,
      attachmentName: m.attachmentName,
      attachmentType: m.attachmentType,
      createdAt: m.createdAt,
      sender: (m.senderStaff
        ? {
            kind: "staff" as const,
            id: m.senderStaff.id,
            displayName: `${m.senderStaff.firstName} ${m.senderStaff.lastName}`.trim(),
          }
        : m.senderParent
          ? { kind: "parent" as const, id: m.senderParent.id, displayName: parentDisplayName(m.senderParent) }
          : null) as Sender,
    })),
    ...announcements.map((a) => {
      const ack = "acks" in a ? (a.acks as AckRow[])[0] : undefined
      const total = "_count" in a ? (a._count as { acks: number }).acks : undefined
      return {
        kind: "announcement" as const,
        id: a.id,
        subject: a.subject,
        body: a.body,
        createdAt: a.createdAt,
        sender: a.senderStaff
          ? {
              kind: "staff" as const,
              id: a.senderStaff.id,
              displayName: `${a.senderStaff.firstName} ${a.senderStaff.lastName}`.trim(),
            }
          : null,
        seenAt: ack ? ack.seenAt || (markedSeen.has(ack.id) ? now : null) : null,
        ...(total !== undefined ? { readStats: { total, seen: seenMap.get(a.id) ?? 0 } } : {}),
      }
    }),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return NextResponse.json({
    timeline,
    // Eski istemci uyumluluğu
    messages: timeline.filter((t) => t.kind === "message"),
    hasMore,
    nextBefore: hasMore && messages.length ? messages[0].createdAt : null,
    parentsCanPost: access.group.parentsCanPost,
    canPost: access.canPost,
  })
}

export async function POST(request: NextRequest, context: Ctx) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params

  const access = await resolveGroupAccess(id, chat)
  if (!access) return NextResponse.json({ error: "Bu grupta değilsiniz" }, { status: 403 })
  if (!access.canPost) {
    return NextResponse.json({ error: "Bu grupta yalnızca okul personeli yazabilir." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const text = clampText(body?.body, COMMS_LIMITS.message)
  const attachmentUrl = sanitizeAttachmentUrl(body?.attachmentUrl)
  if (body?.attachmentUrl && !attachmentUrl) {
    return NextResponse.json({ error: "Geçersiz ek" }, { status: 400 })
  }
  if (!text && !attachmentUrl) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 })

  const msg = await prisma.classGroupMessage.create({
    data: {
      classGroupId: id,
      body: text,
      attachmentUrl,
      attachmentName: attachmentUrl ? clampText(body?.attachmentName, 200) || "Ek" : null,
      attachmentType: attachmentUrl ? clampText(body?.attachmentType, 100) || null : null,
      senderStaffId: chat.kind === "staff" ? chat.staffId : null,
      senderParentId: chat.kind === "parent" ? chat.parentId : null,
    },
  })
  await prisma.classGroup.update({ where: { id }, data: { updatedAt: new Date() } })
  await markGroupRead(id, readerOf(chat))

  // Grup üyelerine bildirim (gönderen hariç)
  const audience = await groupAudience(id)
  const senderName =
    chat.kind === "staff" ? `${chat.firstName} ${chat.lastName}`.trim() : chat.displayName
  const preview = text || "📎 Ek gönderdi"
  const data = { kind: "comms_group_message" as const, tab: "groups" as const, groupId: id }
  notifyStaffComms({
    staffIds: audience.staffIds.filter((s) => !(chat.kind === "staff" && s === chat.staffId)),
    title: access.group.title,
    body: `${senderName}: ${preview}`,
    data,
    inApp: false,
  })
  notifyParentsComms({
    parentIds: audience.parentIds.filter((p) => !(chat.kind === "parent" && p === chat.parentId)),
    title: access.group.title,
    body: `${senderName}: ${preview}`,
    data,
  })

  return NextResponse.json({ message: msg }, { status: 201 })
}
