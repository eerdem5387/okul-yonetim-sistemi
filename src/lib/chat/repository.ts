import type {
  ConversationType,
  Message,
  MessageType,
  Prisma,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { ChatActor } from "./identity"

/**
 * Sohbet veri katmanı:
 *  - findOrCreatePrivateConversation
 *  - createGroupConversation / createAnnouncementConversation
 *  - appendMessage
 *  - markReadUpTo
 *  - listConversationsForActor
 *  - listMessages (cursor pagination)
 *  - unreadCountForActor
 */

interface ParticipantRef {
  staffId?: string
  parentId?: string
  role?: "ADMIN" | "MEMBER"
}

function actorParticipantWhere(actor: ChatActor): Prisma.ConversationParticipantWhereInput {
  return actor.kind === "staff" ? { staffId: actor.staffId } : { parentId: actor.parentId }
}

/** Aktör bu sohbetin katılımcısı mı? */
export async function isActorParticipant(
  actor: ChatActor,
  conversationId: string
): Promise<{ isMember: boolean; role: "ADMIN" | "MEMBER" | null }> {
  const row = await prisma.conversationParticipant.findFirst({
    where: { conversationId, ...actorParticipantWhere(actor) },
    select: { role: true },
  })
  if (!row) return { isMember: false, role: null }
  return { isMember: true, role: row.role }
}

/**
 * İki taraf arasındaki tek PRIVATE sohbeti bulur, yoksa oluşturur.
 * Side A = aktör; Side B = staff veya parent.
 */
export async function findOrCreatePrivateConversation(
  actor: ChatActor,
  target: { staffId?: string; parentId?: string }
): Promise<string> {
  if ((target.staffId && target.parentId) || (!target.staffId && !target.parentId)) {
    throw new Error("Hedef için tam olarak biri staffId VEYA parentId olmalı")
  }

  // Aynı çift için var olan PRIVATE sohbeti bul
  const sideAFilter = actorParticipantWhere(actor)
  const sideBFilter: Prisma.ConversationParticipantWhereInput = target.staffId
    ? { staffId: target.staffId }
    : { parentId: target.parentId }

  const existing = await prisma.conversation.findFirst({
    where: {
      type: "PRIVATE",
      AND: [
        { participants: { some: sideAFilter } },
        { participants: { some: sideBFilter } },
      ],
    },
    select: { id: true },
  })
  if (existing) return existing.id

  // Oluştur
  const conv = await prisma.conversation.create({
    data: {
      type: "PRIVATE",
      participants: {
        create: [
          actor.kind === "staff" ? { staffId: actor.staffId } : { parentId: actor.parentId },
          target.staffId ? { staffId: target.staffId } : { parentId: target.parentId },
        ],
      },
    },
    select: { id: true },
  })
  return conv.id
}

export async function createGroupConversation(
  creator: ChatActor,
  options: { title: string; participants: ParticipantRef[]; type?: Extract<ConversationType, "GROUP" | "ANNOUNCEMENT"> }
): Promise<string> {
  const type = options.type ?? "GROUP"
  if (creator.kind !== "staff") throw new Error("Sadece personel grup/duyuru oluşturabilir")
  const seen = new Set<string>()
  const cleaned: ParticipantRef[] = []
  for (const p of options.participants) {
    if ((p.staffId && p.parentId) || (!p.staffId && !p.parentId)) continue
    const key = p.staffId ? `s:${p.staffId}` : `p:${p.parentId}`
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(p)
  }

  // Yaratıcının kendisi de katılımcı olarak ekle (yoksa) ADMIN rolüyle
  const creatorKey = `s:${creator.staffId}`
  if (!seen.has(creatorKey)) {
    cleaned.push({ staffId: creator.staffId, role: "ADMIN" })
  } else {
    for (const p of cleaned) {
      if (p.staffId === creator.staffId) p.role = "ADMIN"
    }
  }

  const conv = await prisma.conversation.create({
    data: {
      type,
      title: options.title.trim() || null,
      participants: {
        create: cleaned.map((p) => ({
          staffId: p.staffId,
          parentId: p.parentId,
          role: p.role ?? "MEMBER",
        })),
      },
    },
    select: { id: true },
  })
  return conv.id
}

export async function appendMessage(
  actor: ChatActor,
  input: {
    conversationId: string
    body: string
    type?: MessageType
    attachmentUrl?: string | null
  }
): Promise<Message> {
  const senderField =
    actor.kind === "staff" ? { senderStaffId: actor.staffId } : { senderParentId: actor.parentId }

  const msg = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      body: input.body,
      type: input.type ?? "TEXT",
      attachmentUrl: input.attachmentUrl ?? null,
      ...senderField,
    },
  })

  // Konuşmanın updatedAt'ini güncel tut
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  })

  // Gönderici otomatik olarak kendi mesajını "okumuş" sayılır
  try {
    if (actor.kind === "staff") {
      await prisma.messageReceipt.create({
        data: { messageId: msg.id, readerStaffId: actor.staffId },
      })
    } else {
      await prisma.messageReceipt.create({
        data: { messageId: msg.id, readerParentId: actor.parentId },
      })
    }
  } catch {
    // unique violation: yoksay
  }

  return msg
}

/**
 * Aktörün bu sohbette belirtilen mesajdan eski (ve dahil) tüm mesajları okumuş kabul edilmesi.
 */
export async function markReadUpTo(
  actor: ChatActor,
  conversationId: string,
  uptoMessageId?: string
): Promise<{ marked: number }> {
  const upto = uptoMessageId
    ? await prisma.message.findUnique({
        where: { id: uptoMessageId },
        select: { createdAt: true, conversationId: true },
      })
    : null

  if (uptoMessageId && (!upto || upto.conversationId !== conversationId)) {
    return { marked: 0 }
  }

  // Aktör için bu sohbette okunmamış mesajları topla
  const senderExclude =
    actor.kind === "staff"
      ? { senderStaffId: { not: actor.staffId } }
      : { senderParentId: { not: actor.parentId } }

  const readerWhere =
    actor.kind === "staff"
      ? { receipts: { some: { readerStaffId: actor.staffId } } }
      : { receipts: { some: { readerParentId: actor.parentId } } }

  const targets = await prisma.message.findMany({
    where: {
      conversationId,
      ...senderExclude,
      ...(upto?.createdAt ? { createdAt: { lte: upto.createdAt } } : {}),
      NOT: readerWhere,
    },
    select: { id: true },
  })
  if (targets.length === 0) return { marked: 0 }

  if (actor.kind === "staff") {
    const data = targets.map((m) => ({ messageId: m.id, readerStaffId: actor.staffId }))
    await prisma.messageReceipt.createMany({ data, skipDuplicates: true })
  } else {
    const data = targets.map((m) => ({ messageId: m.id, readerParentId: actor.parentId }))
    await prisma.messageReceipt.createMany({ data, skipDuplicates: true })
  }
  return { marked: targets.length }
}

interface ConversationListItem {
  id: string
  type: ConversationType
  title: string | null
  updatedAt: Date
  myRole: "ADMIN" | "MEMBER"
  participants: Array<{
    role: "ADMIN" | "MEMBER"
    staff: { id: string; firstName: string; lastName: string; department: string } | null
    parent: { id: string; displayName: string; studentTcNumber: string } | null
  }>
  lastMessage: {
    id: string
    body: string
    type: MessageType
    attachmentUrl: string | null
    createdAt: Date
    senderStaffId: string | null
    senderParentId: string | null
  } | null
  unreadCount: number
}

export async function listConversationsForActor(
  actor: ChatActor
): Promise<ConversationListItem[]> {
  const myWhere = actorParticipantWhere(actor)
  const convos = await prisma.conversation.findMany({
    where: { participants: { some: myWhere } },
    include: {
      participants: {
        include: {
          staff: { select: { id: true, firstName: true, lastName: true, department: true } },
          parent: {
            select: {
              id: true,
              studentTcNumber: true,
              students: { select: { parentName: true }, take: 1 },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          body: true,
          type: true,
          attachmentUrl: true,
          createdAt: true,
          senderStaffId: true,
          senderParentId: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const result: ConversationListItem[] = []
  for (const c of convos) {
    const me = c.participants.find((p) =>
      actor.kind === "staff" ? p.staffId === actor.staffId : p.parentId === actor.parentId
    )
    if (!me) continue

    // Unread count
    let unread = 0
    if (actor.kind === "staff") {
      unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderStaffId: { not: actor.staffId },
          NOT: { receipts: { some: { readerStaffId: actor.staffId } } },
        },
      })
    } else {
      unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderParentId: { not: actor.parentId },
          NOT: { receipts: { some: { readerParentId: actor.parentId } } },
        },
      })
    }

    result.push({
      id: c.id,
      type: c.type,
      title: c.title,
      updatedAt: c.updatedAt,
      myRole: me.role,
      participants: c.participants.map((p) => ({
        role: p.role,
        staff: p.staff,
        parent: p.parent
          ? {
              id: p.parent.id,
              displayName:
                p.parent.students[0]?.parentName?.trim() || `Veli (${p.parent.studentTcNumber.slice(0, 4)}...)`,
              studentTcNumber: p.parent.studentTcNumber,
            }
          : null,
      })),
      lastMessage: c.messages[0] ?? null,
      unreadCount: unread,
    })
  }
  return result
}

export async function listMessages(
  conversationId: string,
  options: { cursor?: string; limit?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100)
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: {
      senderStaff: { select: { id: true, firstName: true, lastName: true, department: true } },
      senderParent: {
        select: {
          id: true,
          studentTcNumber: true,
          students: { select: { parentName: true }, take: 1 },
        },
      },
    },
  })

  let nextCursor: string | null = null
  if (messages.length > limit) {
    const next = messages.pop()
    nextCursor = next?.id ?? null
  }

  // En eskiden en yeniye sırala (UI'da chronological)
  return {
    messages: messages.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      body: m.body,
      type: m.type,
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt,
      sender:
        m.senderStaff != null
          ? {
              kind: "staff" as const,
              id: m.senderStaff.id,
              displayName: `${m.senderStaff.firstName} ${m.senderStaff.lastName}`.trim(),
              department: m.senderStaff.department,
            }
          : m.senderParent != null
            ? {
                kind: "parent" as const,
                id: m.senderParent.id,
                displayName:
                  m.senderParent.students[0]?.parentName?.trim() ||
                  `Veli (${m.senderParent.studentTcNumber.slice(0, 4)}...)`,
              }
            : null,
    })),
    nextCursor,
  }
}

export async function unreadCountForActor(actor: ChatActor): Promise<number> {
  if (actor.kind === "staff") {
    return prisma.message.count({
      where: {
        senderStaffId: { not: actor.staffId },
        conversation: { participants: { some: { staffId: actor.staffId } } },
        NOT: { receipts: { some: { readerStaffId: actor.staffId } } },
      },
    })
  }
  return prisma.message.count({
    where: {
      senderParentId: { not: actor.parentId },
      conversation: { participants: { some: { parentId: actor.parentId } } },
      NOT: { receipts: { some: { readerParentId: actor.parentId } } },
    },
  })
}

/**
 * Aktör bu sohbette mesaj atabilir mi?
 *  - Üye değilse: hayır
 *  - ANNOUNCEMENT ise sadece ADMIN
 */
export async function canActorSendMessage(
  actor: ChatActor,
  conversationId: string
): Promise<{ ok: boolean; reason?: "not_member" | "announcement_only_admin" | "not_found" }> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, type: true },
  })
  if (!conv) return { ok: false, reason: "not_found" }
  const { isMember, role } = await isActorParticipant(actor, conversationId)
  if (!isMember) return { ok: false, reason: "not_member" }
  if (conv.type === "ANNOUNCEMENT" && role !== "ADMIN") {
    return { ok: false, reason: "announcement_only_admin" }
  }
  return { ok: true }
}
