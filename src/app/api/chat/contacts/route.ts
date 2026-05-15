import { NextRequest, NextResponse } from "next/server"
import { resolveChatActor } from "@/lib/chat/identity"
import {
  getReachableParentsForActor,
  getReachableStaffForActor,
} from "@/lib/chat/access-control"

export const dynamic = "force-dynamic"

/**
 * GET /api/chat/contacts
 * Aktif kullanıcının başlatabileceği DM hedeflerini döner.
 */
export async function GET(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const [staff, parents] = await Promise.all([
    getReachableStaffForActor(actor),
    getReachableParentsForActor(actor),
  ])

  return NextResponse.json(
    {
      actor: { kind: actor.kind },
      staff,
      parents,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
