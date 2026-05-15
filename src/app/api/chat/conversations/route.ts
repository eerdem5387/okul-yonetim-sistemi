import { NextRequest, NextResponse } from "next/server"
import { resolveChatActor } from "@/lib/chat/identity"
import {
  canCreateAnnouncement,
  canCreateGroup,
  canStartPrivateWithParent,
  canStartPrivateWithStaff,
} from "@/lib/chat/access-control"
import {
  createGroupConversation,
  findOrCreatePrivateConversation,
  listConversationsForActor,
} from "@/lib/chat/repository"
import {
  triggerConversationUpdated,
  userParentChannel,
  userStaffChannel,
} from "@/lib/chat/pusher-server"

export const dynamic = "force-dynamic"

interface ParticipantPayload {
  staffId?: string
  parentId?: string
  role?: "ADMIN" | "MEMBER"
}

interface CreateBody {
  type: "PRIVATE" | "GROUP" | "ANNOUNCEMENT"
  title?: string
  target?: { staffId?: string; parentId?: string }
  participants?: ParticipantPayload[]
}

/** GET: Kullanıcının sohbetleri */
export async function GET(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const conversations = await listConversationsForActor(actor)
  return NextResponse.json({ conversations }, { headers: { "Cache-Control": "no-store" } })
}

/** POST: Yeni sohbet (PRIVATE / GROUP / ANNOUNCEMENT) */
export async function POST(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  if (body.type === "PRIVATE") {
    const target = body.target || {}
    if (!target.staffId && !target.parentId) {
      return NextResponse.json({ error: "Hedef belirtilmedi" }, { status: 400 })
    }
    if (target.staffId && target.parentId) {
      return NextResponse.json({ error: "Tek hedef seçilmeli" }, { status: 400 })
    }

    const allowed = target.staffId
      ? await canStartPrivateWithStaff(actor, target.staffId)
      : await canStartPrivateWithParent(actor, target.parentId!)
    if (!allowed) {
      return NextResponse.json(
        { error: "Bu kişiyle sohbet başlatma yetkiniz yok" },
        { status: 403 }
      )
    }

    const id = await findOrCreatePrivateConversation(actor, target)
    return NextResponse.json({ id, type: "PRIVATE" }, { status: 201 })
  }

  if (body.type === "GROUP" || body.type === "ANNOUNCEMENT") {
    if (body.type === "GROUP" && !canCreateGroup(actor)) {
      return NextResponse.json({ error: "Grup oluşturma yetkiniz yok" }, { status: 403 })
    }
    if (body.type === "ANNOUNCEMENT" && !canCreateAnnouncement(actor)) {
      return NextResponse.json({ error: "Duyuru oluşturma yetkiniz yok" }, { status: 403 })
    }
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Başlık zorunludur" }, { status: 400 })
    }
    if (!Array.isArray(body.participants) || body.participants.length === 0) {
      return NextResponse.json({ error: "En az bir katılımcı eklenmeli" }, { status: 400 })
    }

    const id = await createGroupConversation(actor, {
      title: body.title,
      participants: body.participants,
      type: body.type,
    })

    // Tüm katılımcıların user-* kanallarına haber ver
    const channels: string[] = []
    for (const p of body.participants) {
      if (p.staffId) channels.push(userStaffChannel(p.staffId))
      else if (p.parentId) channels.push(userParentChannel(p.parentId))
    }
    if (actor.kind === "staff") channels.push(userStaffChannel(actor.staffId))
    await triggerConversationUpdated(channels, { conversationId: id, reason: "created" })

    return NextResponse.json({ id, type: body.type }, { status: 201 })
  }

  return NextResponse.json({ error: "Geçersiz tür" }, { status: 400 })
}
