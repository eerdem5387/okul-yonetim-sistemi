import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/comms/identity"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

type TimelineMessage = {
  kind: "message"
  id: string
  body: string
  attachmentUrl: string | null
  createdAt: Date
  sender: { kind: "staff" | "parent"; id: string; displayName: string } | null
}

type TimelineAnnouncement = {
  kind: "announcement"
  id: string
  subject: string
  body: string
  createdAt: Date
  sender: { kind: "staff"; id: string; displayName: string } | null
  seenAt: Date | null
}

export async function GET(request: NextRequest, context: Ctx) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params

  const member = await prisma.classGroupMember.findFirst({
    where:
      chat.kind === "staff"
        ? { classGroupId: id, staffId: chat.staffId }
        : { classGroupId: id, parentId: chat.parentId },
  })
  const group = await prisma.classGroup.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
  if (!member && !(chat.kind === "staff" && group.createdByStaffId === chat.staffId)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const [messages, announcements] = await Promise.all([
    prisma.classGroupMessage.findMany({
      where: { classGroupId: id },
      include: {
        senderStaff: { select: { id: true, firstName: true, lastName: true } },
        senderParent: {
          select: {
            id: true,
            studentTcNumber: true,
            students: { select: { parentName: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 300,
    }),
    prisma.classAnnouncement.findMany({
      where: { classGroupId: id },
      include: {
        senderStaff: { select: { id: true, firstName: true, lastName: true } },
        ...(chat.kind === "parent"
          ? { acks: { where: { parentId: chat.parentId }, take: 1 } }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ])

  const now = new Date()
  const markedSeen = new Set<string>()
  if (chat.kind === "parent") {
    const unreadIds: string[] = []
    for (const a of announcements) {
      const ack = "acks" in a ? a.acks[0] : undefined
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

  const timelineMessages: TimelineMessage[] = messages.map((m) => ({
    kind: "message",
    id: m.id,
    body: m.body,
    attachmentUrl: m.attachmentUrl,
    createdAt: m.createdAt,
    sender: m.senderStaff
      ? {
          kind: "staff" as const,
          id: m.senderStaff.id,
          displayName: `${m.senderStaff.firstName} ${m.senderStaff.lastName}`.trim(),
        }
      : m.senderParent
        ? {
            kind: "parent" as const,
            id: m.senderParent.id,
            displayName:
              m.senderParent.students[0]?.parentName?.trim() ||
              `Veli (${m.senderParent.studentTcNumber.slice(0, 4)}...)`,
          }
        : null,
  }))

  const timelineAnnouncements: TimelineAnnouncement[] = announcements.map((a) => {
    const ack = "acks" in a ? a.acks[0] : undefined
    return {
      kind: "announcement",
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
    }
  })

  const timeline = [...timelineMessages, ...timelineAnnouncements].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return NextResponse.json({
    messages: timelineMessages,
    timeline,
    parentsCanPost: group.parentsCanPost,
  })
}

export async function POST(request: NextRequest, context: Ctx) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params
  const group = await prisma.classGroup.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })

  const member = await prisma.classGroupMember.findFirst({
    where:
      chat.kind === "staff"
        ? { classGroupId: id, staffId: chat.staffId }
        : { classGroupId: id, parentId: chat.parentId },
  })
  if (!member && !(chat.kind === "staff" && group.createdByStaffId === chat.staffId)) {
    return NextResponse.json({ error: "Bu grupta değilsiniz" }, { status: 403 })
  }

  if (chat.kind === "parent" && !group.parentsCanPost) {
    return NextResponse.json(
      { error: "Bu grupta velilerin mesaj yazma yetkisi kapalıdır." },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const text = String(body?.body || "").trim()
  if (!text) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 })

  const msg = await prisma.classGroupMessage.create({
    data: {
      classGroupId: id,
      body: text,
      attachmentUrl: body?.attachmentUrl ? String(body.attachmentUrl) : null,
      senderStaffId: chat.kind === "staff" ? chat.staffId : null,
      senderParentId: chat.kind === "parent" ? chat.parentId : null,
    },
  })
  await prisma.classGroup.update({ where: { id }, data: { updatedAt: new Date() } })
  return NextResponse.json({ message: msg }, { status: 201 })
}
