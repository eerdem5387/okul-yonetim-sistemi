import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveChatActor } from "@/lib/comms/identity"
import { canSendClassAnnouncement } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (chat.kind === "parent") {
    const acks = await prisma.classAnnouncementAck.findMany({
      where: { parentId: chat.parentId },
      include: {
        announcement: {
          include: {
            senderStaff: { select: { id: true, firstName: true, lastName: true } },
            classGroup: { select: { id: true, title: true, class: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return NextResponse.json({
      announcements: acks.map((a) => ({
        ...a.announcement,
        seenAt: a.seenAt,
        ackId: a.id,
      })),
    })
  }

  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const classGroupId = request.nextUrl.searchParams.get("classGroupId")
  const announcements = await prisma.classAnnouncement.findMany({
    where: {
      senderStaffId: actor.staffId,
      ...(classGroupId ? { classGroupId } : {}),
    },
    include: {
      classGroup: { select: { id: true, title: true, class: { select: { name: true } } } },
      _count: { select: { acks: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return NextResponse.json({ announcements })
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!(await canSendClassAnnouncement(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Sınıf duyurusu gönderme yetkiniz yok" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const classGroupId = String(body?.classGroupId || "")
  const subject = String(body?.subject || "").trim()
  const text = String(body?.body || "").trim()
  const templateId = body?.templateId ? String(body.templateId) : null
  if (!classGroupId || !subject || !text) {
    return NextResponse.json({ error: "classGroupId, subject ve body zorunlu" }, { status: 400 })
  }

  const group = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
    include: { members: { where: { role: "PARENT" }, select: { parentId: true } } },
  })
  if (!group) return NextResponse.json({ error: "Sınıf grubu bulunamadı" }, { status: 404 })

  const parentIds = group.members.map((m) => m.parentId!).filter(Boolean)
  if (!parentIds.length) {
    return NextResponse.json({ error: "Bu grupta veli yok" }, { status: 400 })
  }

  const batchId = randomUUID()
  const announcement = await prisma.classAnnouncement.create({
    data: {
      classGroupId,
      templateId,
      subject,
      body: text,
      senderStaffId: actor.staffId,
      batchId,
      acks: {
        create: parentIds.map((parentId) => ({ parentId })),
      },
    },
  })
  return NextResponse.json({ announcement, recipientCount: parentIds.length }, { status: 201 })
}
