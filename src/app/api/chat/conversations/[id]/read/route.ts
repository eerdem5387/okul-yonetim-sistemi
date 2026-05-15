import { NextRequest, NextResponse } from "next/server"
import { resolveChatActor } from "@/lib/chat/identity"
import { isActorParticipant, markReadUpTo } from "@/lib/chat/repository"
import { triggerReadReceipt } from "@/lib/chat/pusher-server"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** POST: Bu sohbette belirtilen mesaja kadar okundu olarak işaretle */
export async function POST(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const { isMember } = await isActorParticipant(actor, id)
  if (!isMember) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  let payload: { uptoMessageId?: string } = {}
  try {
    payload = (await request.json().catch(() => ({}))) as { uptoMessageId?: string }
  } catch {
    payload = {}
  }

  const result = await markReadUpTo(actor, id, payload.uptoMessageId)
  if (result.marked > 0) {
    await triggerReadReceipt(id, {
      reader:
        actor.kind === "staff"
          ? { kind: "staff", id: actor.staffId }
          : { kind: "parent", id: actor.parentId },
      readAt: new Date().toISOString(),
      markedCount: result.marked,
    })
  }
  return NextResponse.json(result)
}
