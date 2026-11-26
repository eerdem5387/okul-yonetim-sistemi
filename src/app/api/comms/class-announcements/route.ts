import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveChatActor } from "@/lib/comms/identity"
import { canSendClassAnnouncement, clampText, COMMS_LIMITS } from "@/lib/comms/access"
import {
  syncClassGroupParentsForClass,
  syncClassGroupParentsForParent,
} from "@/lib/comms/sync-class-group-parents"
import { resolveGroupAccess } from "@/lib/comms/groups"
import { notifyParentsComms, notifyStaffComms } from "@/lib/comms/notify"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (chat.kind === "parent") {
    await syncClassGroupParentsForParent(chat.parentId)
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
  const subject = clampText(body?.subject, COMMS_LIMITS.subject)
  const text = clampText(body?.body, COMMS_LIMITS.body)
  const templateId = body?.templateId ? String(body.templateId) : null
  if (!classGroupId || !subject || !text) {
    return NextResponse.json({ error: "Grup, konu ve metin zorunlu" }, { status: 400 })
  }

  const access = await resolveGroupAccess(classGroupId, { kind: "staff", ...actor })
  if (!access) return NextResponse.json({ error: "Sınıf grubu bulunamadı" }, { status: 404 })

  // Gönderim öncesi sınıf roster'ını gruba senkronize et
  const synced = await syncClassGroupParentsForClass(access.group.classId)
  const parentIds = synced.parentIds
  if (!parentIds.length) {
    return NextResponse.json(
      { error: "Bu sınıf grubunda veli yok. Öğrencilerin sınıfa atanmış ve veli hesabı açık olmalı." },
      { status: 400 }
    )
  }

  const announcement = await prisma.classAnnouncement.create({
    data: {
      classGroupId,
      templateId,
      subject,
      body: text,
      senderStaffId: actor.staffId,
      batchId: randomUUID(),
      acks: { create: parentIds.map((parentId) => ({ parentId })) },
    },
  })
  await prisma.classGroup.update({ where: { id: classGroupId }, data: { updatedAt: new Date() } })

  const data = { kind: "comms_class_announcement" as const, tab: "groups" as const, groupId: classGroupId }
  notifyParentsComms({
    parentIds,
    title: `Duyuru · ${access.group.title}`,
    body: subject,
    data,
    official: true,
  })
  const staffMembers = await prisma.classGroupMember.findMany({
    where: { classGroupId, staffId: { not: null } },
    select: { staffId: true },
  })
  notifyStaffComms({
    staffIds: staffMembers.map((m) => m.staffId!).filter((s) => s !== actor.staffId),
    title: `Duyuru · ${access.group.title}`,
    body: subject,
    data,
    inApp: false,
  })

  return NextResponse.json({ announcement, recipientCount: parentIds.length }, { status: 201 })
}
