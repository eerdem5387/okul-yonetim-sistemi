import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveChatActor } from "@/lib/comms/identity"
import { canCreateClassGroup, clampText, COMMS_LIMITS, isGuidanceDepartment } from "@/lib/comms/access"
import {
  resolveParentIdsForClass,
  syncClassGroupParentsForClass,
  syncClassGroupParentsForParent,
} from "@/lib/comms/sync-class-group-parents"
import { readerOf, unreadMessagesByGroup } from "@/lib/comms/unread"

export const dynamic = "force-dynamic"

const GROUP_INCLUDE = {
  class: { select: { id: true, name: true } },
  counselorStaff: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { members: true, messages: true } },
} as const

async function withPreview<T extends { id: string }>(groups: T[], unread: Record<string, number>) {
  return Promise.all(
    groups.map(async (g) => {
      const last = await prisma.classGroupMessage.findFirst({
        where: { classGroupId: g.id },
        orderBy: { createdAt: "desc" },
        select: {
          body: true,
          createdAt: true,
          attachmentUrl: true,
          senderStaff: { select: { firstName: true } },
          senderParent: { select: { students: { take: 1, select: { parentName: true } } } },
        },
      })
      return {
        ...g,
        unreadCount: unread[g.id] ?? 0,
        lastMessage: last
          ? {
              body: last.body || (last.attachmentUrl ? "📎 Ek" : ""),
              createdAt: last.createdAt,
              senderName:
                last.senderStaff?.firstName ||
                last.senderParent?.students[0]?.parentName?.split(" ")[0] ||
                "",
            }
          : null,
      }
    })
  )
}

export async function GET(request: NextRequest) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (chat.kind === "parent") {
    // Öğrenci sonradan sınıfa atandıysa/ayrıldıysa üyelik burada düzeltilir
    await syncClassGroupParentsForParent(chat.parentId)
    const groups = await prisma.classGroup.findMany({
      where: { members: { some: { parentId: chat.parentId } } },
      include: GROUP_INCLUDE,
      orderBy: { updatedAt: "desc" },
    })
    const unread = await unreadMessagesByGroup(readerOf(chat))
    return NextResponse.json({ groups: await withPreview(groups, unread) })
  }

  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  // Kurucu/Müdür tüm grupları; rehberlik de sınıf duyurusu için tüm grupları görür
  const groups = await prisma.classGroup.findMany({
    where: {
      OR: [
        { createdByStaffId: actor.staffId },
        { counselorStaffId: actor.staffId },
        { members: { some: { staffId: actor.staffId } } },
        ...(canCreateClassGroup(actor.department) || isGuidanceDepartment(actor.department) ? [{}] : []),
      ],
    },
    include: GROUP_INCLUDE,
    orderBy: { updatedAt: "desc" },
  })
  const unread = await unreadMessagesByGroup({ kind: "staff", staffId: actor.staffId })
  return NextResponse.json({ groups: await withPreview(groups, unread) })
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canCreateClassGroup(actor.department)) {
    return NextResponse.json({ error: "Sınıf grubu oluşturma yetkiniz yok" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const classId = String(body?.classId || "")
  const titleInput = clampText(body?.title, COMMS_LIMITS.subject)
  const counselorStaffId = body?.counselorStaffId ? String(body.counselorStaffId) : null
  const parentsCanPost = Boolean(body?.parentsCanPost)
  if (!classId) {
    return NextResponse.json({ error: "Sınıf seçin" }, { status: 400 })
  }

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true } })
  if (!cls) return NextResponse.json({ error: "Sınıf bulunamadı" }, { status: 404 })

  if (counselorStaffId) {
    const guide = await prisma.staff.findFirst({
      where: {
        id: counselorStaffId,
        isActive: true,
        department: { in: ["REHBERLIK", "BAS_REHBERLIK"] },
      },
    })
    if (!guide) return NextResponse.json({ error: "Geçerli rehberlik personeli seçin" }, { status: 400 })
  }

  const parentIds = await resolveParentIdsForClass(classId)

  const group = await prisma.classGroup.create({
    data: {
      classId,
      title: titleInput || `${cls.name} Veli Grubu`,
      counselorStaffId,
      parentsCanPost,
      createdByStaffId: actor.staffId,
      members: {
        create: [
          ...(counselorStaffId ? [{ staffId: counselorStaffId, role: "COUNSELOR" as const }] : []),
          ...parentIds.map((parentId) => ({ parentId, role: "PARENT" as const })),
        ],
      },
    },
    include: {
      class: { select: { id: true, name: true } },
      counselorStaff: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { members: true } },
    },
  })
  // Aynı sınıftaki diğer gruplar da güncel roster ile hizalansın
  await syncClassGroupParentsForClass(classId)
  return NextResponse.json({ group, parentCount: parentIds.length }, { status: 201 })
}
