import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { GROUP_STAFF_DEPARTMENTS } from "@/lib/comms/access"
import { resolveGroupAccess } from "@/lib/comms/groups"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/** Gruba eklenebilecek personel adayları (öğretmen + rehberlik) */
export async function GET(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params
  const access = await resolveGroupAccess(id, { kind: "staff", ...actor })
  if (!access?.canManage) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const existing = await prisma.classGroupMember.findMany({
    where: { classGroupId: id, staffId: { not: null } },
    select: { staffId: true },
  })
  const taken = new Set(existing.map((e) => e.staffId))
  const staff = await prisma.staff.findMany({
    where: { isActive: true, department: { in: GROUP_STAFF_DEPARTMENTS } },
    select: { id: true, firstName: true, lastName: true, department: true, subject: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
  return NextResponse.json({ staff: staff.filter((s) => !taken.has(s.id)) })
}

export async function POST(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params
  const access = await resolveGroupAccess(id, { kind: "staff", ...actor })
  if (!access) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
  if (!access.canManage) {
    return NextResponse.json({ error: "Öğretmen ekleme yetkiniz yok" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const staffIds: string[] = Array.isArray(body?.staffIds) ? [...new Set<string>(body.staffIds.map(String))] : []
  if (!staffIds.length) {
    return NextResponse.json({ error: "Eklenecek personeli seçin" }, { status: 400 })
  }

  const valid = await prisma.staff.findMany({
    where: { id: { in: staffIds }, isActive: true, department: { in: GROUP_STAFF_DEPARTMENTS } },
    select: { id: true },
  })
  if (!valid.length) {
    return NextResponse.json({ error: "Yalnızca öğretmen ve rehberlik personeli eklenebilir" }, { status: 400 })
  }
  const res = await prisma.classGroupMember.createMany({
    data: valid.map((s) => ({ classGroupId: id, staffId: s.id, role: "TEACHER" as const })),
    skipDuplicates: true,
  })
  return NextResponse.json({ ok: true, added: res.count })
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params
  const access = await resolveGroupAccess(id, { kind: "staff", ...actor })
  if (!access) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
  if (!access.canManage) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const staffId = request.nextUrl.searchParams.get("staffId")
  if (!staffId) return NextResponse.json({ error: "staffId gerekli" }, { status: 400 })

  await prisma.classGroupMember.deleteMany({
    where: { classGroupId: id, staffId, role: "TEACHER" },
  })
  return NextResponse.json({ ok: true })
}
