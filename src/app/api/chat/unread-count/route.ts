import { NextRequest, NextResponse } from "next/server"
import { resolveChatActor } from "@/lib/chat/identity"
import { unreadCountForActor } from "@/lib/chat/repository"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const count = await unreadCountForActor(actor)
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } })
}
