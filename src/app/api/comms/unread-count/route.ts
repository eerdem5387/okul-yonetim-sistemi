import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveCommsActor } from "@/lib/comms/identity"
import { isRequestApprover } from "@/lib/comms/access"
import { parentBadges, staffBadges } from "@/lib/comms/unread"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const actor = await resolveCommsActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (actor.kind === "parent") {
    const b = await parentBadges(actor.parentId)
    return NextResponse.json({ count: b.unreadAnnouncements + b.unreadMessages, ...b })
  }

  const b = await staffBadges(actor.staffId, isRequestApprover(actor.department))
  return NextResponse.json({
    count: b.unreadNotices + b.pendingRequests + b.decidedRequests + b.unreadMessages,
    ...b,
  })
}
