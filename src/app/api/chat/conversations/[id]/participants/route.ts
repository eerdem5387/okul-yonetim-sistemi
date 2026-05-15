import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/chat/identity"
import { isActorParticipant } from "@/lib/chat/repository"
import {
  triggerConversationUpdated,
  userParentChannel,
  userStaffChannel,
} from "@/lib/chat/pusher-server"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

interface AddBody {
  participants: Array<{ staffId?: string; parentId?: string; role?: "ADMIN" | "MEMBER" }>
}

/** POST: Katılımcı ekle (yalnızca grup ADMIN'i) */
export async function POST(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { type: true },
  })
  if (!conv) return NextResponse.json({ error: "Sohbet bulunamadı" }, { status: 404 })
  if (conv.type === "PRIVATE") {
    return NextResponse.json({ error: "PRIVATE sohbete katılımcı eklenemez" }, { status: 400 })
  }
  const { isMember, role } = await isActorParticipant(actor, id)
  if (!isMember || role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  let body: AddBody
  try {
    body = (await request.json()) as AddBody
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }
  if (!Array.isArray(body.participants) || body.participants.length === 0) {
    return NextResponse.json({ error: "Eklenecek katılımcı yok" }, { status: 400 })
  }

  const channels: string[] = []
  for (const p of body.participants) {
    if ((p.staffId && p.parentId) || (!p.staffId && !p.parentId)) continue
    try {
      await prisma.conversationParticipant.create({
        data: {
          conversationId: id,
          staffId: p.staffId,
          parentId: p.parentId,
          role: p.role ?? "MEMBER",
        },
      })
      if (p.staffId) channels.push(userStaffChannel(p.staffId))
      else if (p.parentId) channels.push(userParentChannel(p.parentId))
    } catch {
      // unique violation: zaten katılımcı, atla
    }
  }

  await triggerConversationUpdated(channels, { conversationId: id, reason: "participants_added" })
  return NextResponse.json({ ok: true })
}

/** DELETE: Katılımcı çıkar (yalnızca grup ADMIN'i) */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get("staffId")
  const parentId = searchParams.get("parentId")

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { type: true },
  })
  if (!conv) return NextResponse.json({ error: "Sohbet bulunamadı" }, { status: 404 })
  if (conv.type === "PRIVATE") {
    return NextResponse.json({ error: "PRIVATE sohbette katılımcı çıkarılamaz" }, { status: 400 })
  }
  const { isMember, role } = await isActorParticipant(actor, id)
  if (!isMember || role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  if (!staffId && !parentId) {
    return NextResponse.json({ error: "staffId veya parentId zorunlu" }, { status: 400 })
  }

  await prisma.conversationParticipant.deleteMany({
    where: {
      conversationId: id,
      ...(staffId ? { staffId } : {}),
      ...(parentId ? { parentId } : {}),
    },
  })

  const channel = staffId ? userStaffChannel(staffId) : userParentChannel(parentId!)
  await triggerConversationUpdated([channel], { conversationId: id, reason: "removed" })

  return NextResponse.json({ ok: true })
}
