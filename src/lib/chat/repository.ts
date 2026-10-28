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
  target: { staffId?: string; parentId?: string },
  link?: { studentId?: string | null }
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
    select: { id: true, studentId: true },
  })
  const linkedStudentId = await resolvePrivateStudentId(target.parentId, link?.studentId)
  if (existing) {
    if (linkedStudentId && !existing.studentId) {
      const classId = await activeClassIdForStudent(linkedStudentId)
      await prisma.conversation.update({
        where: { id: existing.id },
        data: { studentId: linkedStudentId, classId },
      })
    }
    return existing.id
  }

  const classId = linkedStudentId ? await activeClassIdForStudent(linkedStudentId) : null
  const conv = await prisma.conversation.create({
    data: {
      type: "PRIVATE",
      studentId: linkedStudentId,
      classId,
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

async function resolvePrivateStudentId(
  parentId: string | undefined,
  requested: string | null | undefined
): Promise<string | null> {
  if (!parentId) return null
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    select: { studentId: true },
  })
  const ids = links.map((link) => link.studentId)
  if (requested) return ids.includes(requested) ? requested : null
  return ids.length === 1 ? ids[0] : null
}

async function activeClassIdForStudent(studentId: string): Promise<string | null> {
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true, parentActiveYearId: null },
    select: { id: true },
  })
  const assignment = await prisma.classStudent.findFirst({
    where: {
      studentId,
      ...(activeYear ? { class: { academicYearId: activeYear.id } } : {}),
    },
    select: { classId: true },
    orderBy: { createdAt: "desc" },
  })
  return assignment?.classId ?? null
}

export async function createGroupConversation(
  creator: ChatActor,
  options: {
    title: string
    participants: ParticipantRef[]
    type?: Extract<ConversationType, "GROUP" | "ANNOUNCEMENT">
    studentId?: string | null
    classId?: string | null
    branchId?: string | null
  }
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
      membersCanPost: type !== "ANNOUNCEMENT",
      createdByStaffId: creator.staffId,
      studentId: options.studentId || null,
      classId: options.classId || null,
      branchId: options.branchId || null,
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
  membersCanPost: boolean
  createdByStaffId: string | null
  systemKey: string | null
  studentName: string | null
  className: string | null
  branchName: string | null
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

function staffOnlyPrivateExclusion(): Prisma.ConversationWhereInput {
  return {
    NOT: {
      AND: [{ type: "PRIVATE" }, { participants: { every: { parentId: null } } }],
    },
  }
}

function conversationSearchWhere(q: string): Prisma.ConversationWhereInput {
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { class: { name: { contains: q, mode: "insensitive" } } },
      { branch: { name: { contains: q, mode: "insensitive" } } },
      {
        student: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      {
        participants: {
          some: {
            staff: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      },
      {
        participants: {
          some: {
            parent: { students: { some: { parentName: { contains: q, mode: "insensitive" } } } },
          },
        },
      },
      {
        messages: { some: { body: { contains: q, mode: "insensitive" } } },
      },
    ],
  }
}

export async function listConversationsForActor(
  actor: ChatActor,
  query?: string
): Promise<ConversationListItem[]> {
  const myWhere = actorParticipantWhere(actor)
  const q = query?.trim()
  const convos = await prisma.conversation.findMany({
    where: {
      AND: [
        { participants: { some: myWhere } },
        actor.kind === "staff" ? staffOnlyPrivateExclusion() : {},
        q ? conversationSearchWhere(q) : {},
      ],
    },
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
      student: { select: { firstName: true, lastName: true } },
      class: { select: { name: true } },
      branch: { select: { name: true } },
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

  const unreadByConversation = new Map<string, number>()
  if (convos.length > 0) {
    const grouped = await prisma.message.groupBy({
      by: ["conversationId"],
      where:
        actor.kind === "staff"
          ? {
              conversationId: { in: convos.map((row) => row.id) },
              senderStaffId: { not: actor.staffId },
              NOT: { receipts: { some: { readerStaffId: actor.staffId } } },
            }
          : {
              conversationId: { in: convos.map((row) => row.id) },
              senderParentId: { not: actor.parentId },
              NOT: { receipts: { some: { readerParentId: actor.parentId } } },
            },
      _count: { _all: true },
    })
    for (const row of grouped) unreadByConversation.set(row.conversationId, row._count._all)
  }

  const result: ConversationListItem[] = []
  for (const c of convos) {
    const me = c.participants.find((p) =>
      actor.kind === "staff" ? p.staffId === actor.staffId : p.parentId === actor.parentId
    )
    if (!me) continue

    const unread = unreadByConversation.get(c.id) ?? 0

    result.push({
      id: c.id,
      type: c.type,
      title: c.title,
      updatedAt: c.updatedAt,
      myRole: me.role,
      membersCanPost: c.membersCanPost,
      createdByStaffId: c.createdByStaffId,
      systemKey: c.systemKey,
      studentName: c.student ? `${c.student.firstName} ${c.student.lastName}`.trim() : null,
      className: c.class?.name ?? null,
      branchName: c.branch?.name ?? null,
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
        conversation: {
          AND: [
            { participants: { some: { staffId: actor.staffId } } },
            staffOnlyPrivateExclusion(),
          ],
        },
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
): Promise<{
  ok: boolean
  reason?: "not_member" | "announcement_only_admin" | "posting_locked" | "staff_private_disabled" | "not_found"
}> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      type: true,
      membersCanPost: true,
      participants: { select: { staffId: true, parentId: true } },
    },
  })
  if (!conv) return { ok: false, reason: "not_found" }
  const { isMember, role } = await isActorParticipant(actor, conversationId)
  if (!isMember) return { ok: false, reason: "not_member" }
  const staffOnly =
    conv.type === "PRIVATE" &&
    conv.participants.length > 0 &&
    conv.participants.every((participant) => participant.parentId == null)
  if (staffOnly) return { ok: false, reason: "staff_private_disabled" }
  if (conv.type === "ANNOUNCEMENT" && role !== "ADMIN") {
    return { ok: false, reason: "announcement_only_admin" }
  }
  if (conv.type === "GROUP" && !conv.membersCanPost && role !== "ADMIN") {
    return { ok: false, reason: "posting_locked" }
  }
  return { ok: true }
}

export async function canToggleMemberPosting(actor: ChatActor, conversationId: string): Promise<boolean> {
  if (actor.kind !== "staff") return false
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true, createdByStaffId: true },
  })
  if (!conv || conv.type !== "GROUP") return false
  const { isMember, role } = await isActorParticipant(actor, conversationId)
  if (!isMember) return false
  if (conv.createdByStaffId) return conv.createdByStaffId === actor.staffId
  return role === "ADMIN"
}
