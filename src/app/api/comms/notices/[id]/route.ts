import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canDeleteComms } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(_request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canDeleteComms(actor.department)) {
    return NextResponse.json({ error: "Silme yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
  const notice = await prisma.officialNotice.findUnique({ where: { id }, select: { id: true } })
  if (!notice) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

  await prisma.officialNotice.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
