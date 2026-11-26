import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { clampText, COMMS_LIMITS, isRequestApprover } from "@/lib/comms/access"
import { decideRequests, REQUEST_INCLUDE } from "@/lib/comms/requests"

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
  // Eski istemciler `rejectReason`, yeniler `note` gönderir
  const note = clampText(body?.note ?? body?.rejectReason, COMMS_LIMITS.note) || null

  const existing = await prisma.staffCommsRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 })
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Talep zaten karara bağlanmış" }, { status: 400 })
  }

  const { updated } = await decideRequests({ ids: [id], decision, note, decider: actor })
  if (!updated) return NextResponse.json({ error: "Talep zaten karara bağlanmış" }, { status: 409 })

  const row = await prisma.staffCommsRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE })
  return NextResponse.json({ request: row })
}
