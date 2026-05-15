import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor, requireAdmin } from "@/lib/hr/actor"
import { decideLeave, deleteLeave, getLeaveById } from "@/lib/hr/leaves"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/hr/leaves/[id] - admin onay/red */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!requireAdmin(actor)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })

  const decision = body.decision as "APPROVE" | "REJECT" | undefined
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ error: "decision APPROVE | REJECT olmalı" }, { status: 400 })
  }

  const existing = await getLeaveById(id)
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })

  const updated = await decideLeave({
    leaveId: id,
    approverId: actor.staffId,
    decision,
    decisionNote: typeof body.decisionNote === "string" ? body.decisionNote : null,
  })
  return NextResponse.json(updated)
}

/** DELETE /api/hr/leaves/[id] - sahibi PENDING ise iptal edebilir, admin her zaman silebilir */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const existing = await getLeaveById(id)
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })

  const isOwner = existing.staffId === actor.staffId
  if (!actor.isAdmin && !(isOwner && existing.status === "PENDING")) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  await deleteLeave(id)
  return NextResponse.json({ ok: true })
}
