import { NextRequest, NextResponse } from "next/server"
import { resolveChatActor } from "@/lib/chat/identity"
import {
  appendMessage,
  canActorSendMessage,
  isActorParticipant,
  listMessages,
} from "@/lib/chat/repository"
import { prisma } from "@/lib/prisma"
import {
  triggerNewMessage,
  userParentChannel,
  userStaffChannel,
} from "@/lib/chat/pusher-server"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const MAX_BODY_LEN = 4000

/** GET: Mesaj listesi (cursor) */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const { isMember } = await isActorParticipant(actor, id)
  if (!isMember) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get("cursor") || undefined
  const limit = Number(searchParams.get("limit") ?? "30")
  const data = await listMessages(id, { cursor, limit: Number.isFinite(limit) ? limit : 30 })
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
}

interface SendBody {
  body: string
  type?: "TEXT" | "IMAGE" | "DOCUMENT"
  attachmentUrl?: string | null
}

/** POST: Mesaj gönder */
export async function POST(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const guard = await canActorSendMessage(actor, id)
  if (!guard.ok) {
    if (guard.reason === "not_found") {
      return NextResponse.json({ error: "Sohbet bulunamadı" }, { status: 404 })
    }
    if (guard.reason === "announcement_only_admin") {
      return NextResponse.json(
        { error: "Bu duyuru kanalında yalnızca yöneticiler mesaj gönderebilir" },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  let body: SendBody
  try {
    body = (await request.json()) as SendBody
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }
  const text = (body.body || "").trim()
  const messageType = body.type ?? "TEXT"
  const attachmentUrl = body.attachmentUrl || null

  if (messageType === "TEXT" && !text) {
    return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 })
  }
  if (text.length > MAX_BODY_LEN) {
    return NextResponse.json(
      { error: `Mesaj uzunluğu en fazla ${MAX_BODY_LEN} karakter olabilir` },
      { status: 400 }
    )
  }
  if ((messageType === "IMAGE" || messageType === "DOCUMENT") && !attachmentUrl) {
    return NextResponse.json({ error: "Ek (attachment) zorunludur" }, { status: 400 })
  }

  const msg = await appendMessage(actor, {
    conversationId: id,
    body: text,
    type: messageType,
    attachmentUrl,
  })

  // Tüm katılımcıların user-* kanallarına bildirim için kanal listesini topla
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: id },
    select: { staffId: true, parentId: true },
  })
  const recipientChannels: string[] = []
  for (const p of participants) {
    if (p.staffId) recipientChannels.push(userStaffChannel(p.staffId))
    if (p.parentId) recipientChannels.push(userParentChannel(p.parentId))
  }

  const senderDisplay =
    actor.kind === "staff"
      ? `${actor.firstName} ${actor.lastName}`.trim()
      : actor.displayName

  await triggerNewMessage(
    id,
    {
      id: msg.id,
      conversationId: msg.conversationId,
      body: msg.body,
      type: msg.type,
      attachmentUrl: msg.attachmentUrl,
      createdAt: msg.createdAt.toISOString(),
      sender:
        actor.kind === "staff"
          ? { kind: "staff", id: actor.staffId, displayName: senderDisplay }
          : { kind: "parent", id: actor.parentId, displayName: senderDisplay },
    },
    recipientChannels
  )

  return NextResponse.json({ message: msg }, { status: 201 })
}
