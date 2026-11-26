import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/** Talep sahibi bekleyen talebini geri çeker */
export async function POST(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params
  const res = await prisma.staffCommsRequest.updateMany({
    where: { id, requesterStaffId: actor.staffId, status: "PENDING" },
    data: { status: "CANCELLED", decidedAt: new Date(), decisionSeenAt: new Date() },
  })
  if (!res.count) {
    return NextResponse.json({ error: "Yalnızca bekleyen kendi talebinizi geri çekebilirsiniz" }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
