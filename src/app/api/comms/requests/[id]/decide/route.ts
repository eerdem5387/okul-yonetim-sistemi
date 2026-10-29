import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { isRequestApprover } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!isRequestApprover(actor.department)) {
    return NextResponse.json({ error: "Onay yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const decision = body?.decision === "reject" ? "REJECTED" : body?.decision === "approve" ? "APPROVED" : null
  if (!decision) {
    return NextResponse.json({ error: "decision: approve | reject" }, { status: 400 })
  }
  const rejectReason =
    decision === "REJECTED" && typeof body?.rejectReason === "string"
      ? body.rejectReason.trim() || null
      : null

  const existing = await prisma.staffCommsRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 })
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Talep zaten karara bağlanmış" }, { status: 400 })
  }

  const updated = await prisma.staffCommsRequest.update({
    where: { id },
    data: {
      status: decision,
      decidedByStaffId: actor.staffId,
      decidedAt: new Date(),
      rejectReason,
    },
    include: {
      requesterStaff: { select: { id: true, firstName: true, lastName: true } },
      decidedByStaff: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  return NextResponse.json({ request: updated })
}
