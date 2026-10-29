import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveChatActor } from "@/lib/comms/identity"
import { canCreateClassGroup } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (chat.kind === "parent") {
    const groups = await prisma.classGroup.findMany({
      where: { members: { some: { parentId: chat.parentId } } },
      include: {
        class: { select: { id: true, name: true } },
        counselorStaff: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json({ groups })
  }

  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const groups = await prisma.classGroup.findMany({
    where: {
      OR: [
        { createdByStaffId: actor.staffId },
        { counselorStaffId: actor.staffId },
        { members: { some: { staffId: actor.staffId } } },
        ...(canCreateClassGroup(actor.department) ? [{}] : []),
      ],
    },
    include: {
      class: { select: { id: true, name: true } },
      counselorStaff: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json({ groups })
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canCreateClassGroup(actor.department)) {
    return NextResponse.json({ error: "Sınıf grubu oluşturma yetkiniz yok" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const classId = String(body?.classId || "")
  const title = String(body?.title || "").trim()
  const counselorStaffId = body?.counselorStaffId ? String(body.counselorStaffId) : null
  if (!classId || !title) {
    return NextResponse.json({ error: "classId ve title zorunlu" }, { status: 400 })
  }

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true } })
  if (!cls) return NextResponse.json({ error: "Sınıf bulunamadı" }, { status: 404 })

  if (counselorStaffId) {
    const guide = await prisma.staff.findFirst({
      where: {
        id: counselorStaffId,
        isActive: true,
        department: { in: ["REHBERLIK", "BAS_REHBERLIK"] },
      },
    })
    if (!guide) return NextResponse.json({ error: "Geçerli rehberlik personeli seçin" }, { status: 400 })
  }

  // Sınıftaki velileri otomatik üye yap
  const parentLinks = await prisma.parentStudent.findMany({
    where: { student: { classAssignments: { some: { classId } } }, parent: { isActive: true } },
    select: { parentId: true },
  })
  const parentIds = [...new Set(parentLinks.map((p) => p.parentId))]

  const group = await prisma.classGroup.create({
    data: {
      classId,
      title: title || `${cls.name} sınıf grubu`,
      counselorStaffId,
      createdByStaffId: actor.staffId,
      members: {
        create: [
          ...(counselorStaffId
            ? [{ staffId: counselorStaffId, role: "COUNSELOR" as const }]
            : []),
          ...parentIds.map((parentId) => ({ parentId, role: "PARENT" as const })),
        ],
      },
    },
    include: {
      class: { select: { id: true, name: true } },
      counselorStaff: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { members: true } },
    },
  })
  return NextResponse.json({ group }, { status: 201 })
}
