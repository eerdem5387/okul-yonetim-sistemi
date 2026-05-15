import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor, requireAdmin } from "@/lib/hr/actor"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/hr/staff/[id]/admin-notes (admin-only) */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!requireAdmin(actor)) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
  const staff = await prisma.staff.findUnique({
    where: { id },
    select: {
      id: true,
      adminNotes: true,
      adminNotesUpdatedAt: true,
      adminNotesUpdatedBy: true,
    },
  })
  if (!staff) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })

  let updatedByLabel: string | null = null
  if (staff.adminNotesUpdatedBy) {
    const editor = await prisma.staff.findUnique({
      where: { id: staff.adminNotesUpdatedBy },
      select: { firstName: true, lastName: true },
    })
    if (editor) updatedByLabel = `${editor.firstName} ${editor.lastName}`
  }

  return NextResponse.json({
    adminNotes: staff.adminNotes,
    adminNotesUpdatedAt: staff.adminNotesUpdatedAt,
    adminNotesUpdatedBy: staff.adminNotesUpdatedBy,
    updatedByLabel,
  })
}

/** PUT /api/hr/staff/[id]/admin-notes - notları kaydet (admin-only) */
export async function PUT(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!requireAdmin(actor)) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })

  const adminNotes = body.adminNotes
  // Kabul edilenler: TipTap JSON ({ type:"doc", content: [...] }) veya null

  const updated = await prisma.staff.update({
    where: { id },
    data: {
      adminNotes: adminNotes === null ? Prisma.JsonNull : (adminNotes as Prisma.InputJsonValue),
      adminNotesUpdatedAt: new Date(),
      adminNotesUpdatedBy: actor.staffId,
    },
    select: {
      id: true,
      adminNotes: true,
      adminNotesUpdatedAt: true,
      adminNotesUpdatedBy: true,
    },
  })
  return NextResponse.json(updated)
}
