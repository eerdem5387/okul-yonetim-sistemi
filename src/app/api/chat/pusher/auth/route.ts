import { NextRequest, NextResponse } from "next/server"
import { resolveChatActor } from "@/lib/chat/identity"
import { isActorParticipant } from "@/lib/chat/repository"
import {
  authorizeChannel,
  conversationChannel,
  userParentChannel,
  userStaffChannel,
} from "@/lib/chat/pusher-server"

export const dynamic = "force-dynamic"

/**
 * POST /api/chat/pusher/auth
 *
 * Pusher private/presence channel auth endpoint.
 * Body (form-urlencoded): socket_id, channel_name
 */
export async function POST(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  let socketId: string | null = null
  let channelName: string | null = null

  const ct = request.headers.get("content-type") || ""
  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => ({}))
    socketId = body.socket_id ?? null
    channelName = body.channel_name ?? null
  } else {
    const fd = await request.formData()
    socketId = (fd.get("socket_id") as string) || null
    channelName = (fd.get("channel_name") as string) || null
  }

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "socket_id ve channel_name zorunlu" }, { status: 400 })
  }

  // Sadece kendisinin yetkili olduğu kanallara izin ver.
  if (channelName.startsWith("private-conversation-")) {
    const conversationId = channelName.replace("private-conversation-", "")
    const { isMember } = await isActorParticipant(actor, conversationId)
    if (!isMember) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    if (conversationChannel(conversationId) !== channelName) {
      return NextResponse.json({ error: "Geçersiz kanal" }, { status: 400 })
    }
  } else if (channelName.startsWith("private-user-staff-")) {
    if (actor.kind !== "staff") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    if (userStaffChannel(actor.staffId) !== channelName) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }
  } else if (channelName.startsWith("private-user-parent-")) {
    if (actor.kind !== "parent") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    if (userParentChannel(actor.parentId) !== channelName) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }
  } else {
    return NextResponse.json({ error: "Bilinmeyen kanal" }, { status: 400 })
  }

  const auth = authorizeChannel({ socketId, channel: channelName })
  if (!auth) {
    return NextResponse.json(
      { error: "Pusher yapılandırması eksik" },
      { status: 503 }
    )
  }
  return NextResponse.json(auth)
}
