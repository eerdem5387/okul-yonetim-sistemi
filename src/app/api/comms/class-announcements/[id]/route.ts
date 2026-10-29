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
  const row = await prisma.classAnnouncement.findUnique({ where: { id }, select: { id: true } })
  if (!row) return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 })

  await prisma.classAnnouncement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
