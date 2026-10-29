import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canManageTemplates } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canManageTemplates(actor.department)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const data: { title?: string; body?: string; isActive?: boolean } = {}
  if (typeof body?.title === "string") data.title = body.title.trim()
  if (typeof body?.body === "string") data.body = body.body.trim()
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 })
  }
  const template = await prisma.commsTemplate.update({ where: { id }, data })
  return NextResponse.json({ template })
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(_request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canManageTemplates(actor.department)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }
  const { id } = await context.params
  await prisma.commsTemplate.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
