import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { isRequestApprover } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/** Onay mercii talebi açtı: talep sahibine "incelendi" bilgisi verir */
export async function POST(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!isRequestApprover(actor.department)) return NextResponse.json({ ok: true })
  const { id } = await context.params
  await prisma.staffCommsRequest.updateMany({
    where: { id, viewedAt: null },
    data: { viewedAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
