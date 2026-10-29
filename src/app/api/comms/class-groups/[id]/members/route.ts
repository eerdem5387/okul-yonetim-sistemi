import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canCreateClassGroup } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params
  const group = await prisma.classGroup.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })

  const isCounselor = group.counselorStaffId === actor.staffId
  const isAdmin = canCreateClassGroup(actor.department)
  if (!isCounselor && !isAdmin) {
    return NextResponse.json({ error: "Öğretmen ekleme yetkiniz yok" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const staffIds: string[] = Array.isArray(body?.staffIds) ? body.staffIds.map(String) : []
  if (!staffIds.length) {
    return NextResponse.json({ error: "staffIds gerekli" }, { status: 400 })
  }

  for (const staffId of staffIds) {
    try {
      await prisma.classGroupMember.create({
        data: { classGroupId: id, staffId, role: "TEACHER" },
      })
    } catch {
      // already member
    }
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params
  const group = await prisma.classGroup.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
  if (group.counselorStaffId !== actor.staffId && !canCreateClassGroup(actor.department)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const staffId = request.nextUrl.searchParams.get("staffId")
  if (!staffId) return NextResponse.json({ error: "staffId gerekli" }, { status: 400 })

  await prisma.classGroupMember.deleteMany({
    where: { classGroupId: id, staffId, role: "TEACHER" },
  })
  return NextResponse.json({ ok: true })
}
