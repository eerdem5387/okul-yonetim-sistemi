import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canDeleteComms } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; messageId: string }> }

export async function DELETE(_request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(_request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canDeleteComms(actor.department)) {
    return NextResponse.json({ error: "Silme yetkiniz yok" }, { status: 403 })
  }

  const { id, messageId } = await context.params
  const msg = await prisma.classGroupMessage.findFirst({
    where: { id: messageId, classGroupId: id },
    select: { id: true },
  })
  if (!msg) return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })

  await prisma.classGroupMessage.delete({ where: { id: messageId } })
  return NextResponse.json({ ok: true })
}
