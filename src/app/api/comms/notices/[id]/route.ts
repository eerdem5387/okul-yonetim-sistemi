import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { isCommsManager } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/** Tek alıcının kaydını geri çek (yumuşak silme). Gönderen veya yönetim. */
export async function DELETE(_request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(_request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const notice = await prisma.officialNotice.findUnique({
    where: { id },
    select: { id: true, senderStaffId: true, deletedAt: true },
  })
  if (!notice || notice.deletedAt) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
  if (notice.senderStaffId !== actor.staffId && !isCommsManager(actor.department)) {
    return NextResponse.json({ error: "Geri çekme yetkiniz yok" }, { status: 403 })
  }

  await prisma.officialNotice.update({
    where: { id },
    data: { deletedAt: new Date(), deletedByStaffId: actor.staffId },
  })
  return NextResponse.json({ ok: true })
}
