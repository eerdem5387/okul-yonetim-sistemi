import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/chat/identity"
import {
  canDeleteConversation,
  canManageGroupSettings,
  deleteConversation,
  isActorParticipant,
} from "@/lib/chat/repository"
import {
  triggerConversationUpdated,
  userParentChannel,
  userStaffChannel,
} from "@/lib/chat/pusher-server"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** GET: Sohbet detayı (katılımcılar) */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const { isMember, role } = await isActorParticipant(actor, id)
  if (!isMember) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      student: { select: { firstName: true, lastName: true } },
      class: { select: { name: true } },
      branch: { select: { name: true } },
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
    },
  })
  if (!conv) return NextResponse.json({ error: "Sohbet bulunamadı" }, { status: 404 })

  return NextResponse.json(
    {
      conversation: {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        membersCanPost: conv.membersCanPost,
        createdByStaffId: conv.createdByStaffId,
        systemKey: conv.systemKey,
        studentName: conv.student ? `${conv.student.firstName} ${conv.student.lastName}`.trim() : null,
        className: conv.class?.name ?? null,
        branchName: conv.branch?.name ?? null,
        myRole: role,
        participants: conv.participants.map((p) => ({
          id: p.id,
          role: p.role,
          canPost: p.canPost,
          staff: p.staff,
          parent: p.parent
            ? {
                id: p.parent.id,
                displayName:
                  p.parent.students[0]?.parentName?.trim() ||
                  `Veli (${p.parent.studentTcNumber.slice(0, 4)}...)`,
                studentTcNumber: p.parent.studentTcNumber,
              }
            : null,
        })),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

/** PATCH: Başlık / yazma kuralları / seçili yazarlar (yalnızca sohbet ADMIN'i) */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  if (!(await canManageGroupSettings(actor, id))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  let body: {
    title?: string
    membersCanPost?: boolean
    /** "all" | "admin" | "selected" — yazma modu */
    postingMode?: "all" | "admin" | "selected"
    /** postingMode=selected iken yazabilecek üyeler */
    allowedPosters?: Array<{ staffId?: string; parentId?: string }>
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  const data: { title?: string | null; membersCanPost?: boolean } = {}
  if (typeof body.title === "string") {
    data.title = body.title.trim() || null
  }

  if (body.postingMode === "all") {
    data.membersCanPost = true
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, role: "MEMBER" },
      data: { canPost: false },
    })
  } else if (body.postingMode === "admin") {
    data.membersCanPost = false
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, role: "MEMBER" },
      data: { canPost: false },
    })
  } else if (body.postingMode === "selected") {
    data.membersCanPost = false
    const allowed = Array.isArray(body.allowedPosters) ? body.allowedPosters : []
    const staffIds = allowed.map((row) => row.staffId).filter((v): v is string => Boolean(v))
    const parentIds = allowed.map((row) => row.parentId).filter((v): v is string => Boolean(v))
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, role: "MEMBER" },
      data: { canPost: false },
    })
    if (staffIds.length) {
      await prisma.conversationParticipant.updateMany({
        where: { conversationId: id, role: "MEMBER", staffId: { in: staffIds } },
        data: { canPost: true },
      })
    }
    if (parentIds.length) {
      await prisma.conversationParticipant.updateMany({
        where: { conversationId: id, role: "MEMBER", parentId: { in: parentIds } },
        data: { canPost: true },
      })
    }
  } else if (typeof body.membersCanPost === "boolean") {
    data.membersCanPost = body.membersCanPost
    if (!body.membersCanPost) {
      await prisma.conversationParticipant.updateMany({
        where: { conversationId: id, role: "MEMBER" },
        data: { canPost: false },
      })
    }
  }

  if (Object.keys(data).length === 0 && body.postingMode == null) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 })
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: Object.keys(data).length ? data : {},
    select: { id: true, title: true, membersCanPost: true },
  })
  return NextResponse.json({ conversation: updated })
}

/** DELETE: Sohbeti sil (özel: üye; grup/duyuru: admin veya kurucu; sistem kanalı silinemez) */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(_request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const allowed = await canDeleteConversation(actor, id)
  if (!allowed.ok) {
    const message =
      allowed.reason === "system_channel"
        ? "Kalıcı sistem kanalları silinemez."
        : allowed.reason === "not_found"
          ? "Sohbet bulunamadı"
          : "Bu sohbeti silme yetkiniz yok"
    const status = allowed.reason === "not_found" ? 404 : 403
    return NextResponse.json({ error: message }, { status })
  }

  await deleteConversation(id)
  const channels: string[] = []
  for (const row of allowed.participants) {
    if (row.staffId) channels.push(userStaffChannel(row.staffId))
    if (row.parentId) channels.push(userParentChannel(row.parentId))
  }
  await triggerConversationUpdated(channels, {
    conversationId: id,
    reason: "deleted",
  })
  return NextResponse.json({ ok: true })
}
