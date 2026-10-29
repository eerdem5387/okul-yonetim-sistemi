import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/** Görüldü — dijital iz */
export async function POST(_request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(_request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params

  const notice = await prisma.officialNotice.findUnique({ where: { id } })
  if (!notice) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
  if (notice.recipientStaffId !== actor.staffId) {
    return NextResponse.json({ error: "Bu ileti size ait değil" }, { status: 403 })
  }
  if (notice.seenAt) {
    return NextResponse.json({ notice })
  }

  const updated = await prisma.officialNotice.update({
    where: { id },
    data: { seenAt: new Date() },
    include: {
      senderStaff: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  return NextResponse.json({ notice: updated })
}
