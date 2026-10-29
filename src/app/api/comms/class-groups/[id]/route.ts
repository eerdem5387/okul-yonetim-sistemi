import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveChatActor } from "@/lib/comms/identity"
import { canCreateClassGroup } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

async function canAccessGroup(
  groupId: string,
  actor: { kind: "staff"; staffId: string; department: string } | { kind: "parent"; parentId: string }
) {
  const group = await prisma.classGroup.findUnique({
    where: { id: groupId },
    include: {
      class: { select: { id: true, name: true } },
      counselorStaff: { select: { id: true, firstName: true, lastName: true } },
      members: {
        include: {
          staff: { select: { id: true, firstName: true, lastName: true, department: true } },
          parent: {
            select: {
              id: true,
              studentTcNumber: true,
              students: { select: { parentName: true }, take: 1 },
            },
          },
        },
      },
    },
  })
  if (!group) return null

  if (actor.kind === "parent") {
    if (!group.members.some((m) => m.parentId === actor.parentId)) return null
    return group
  }
  if (canCreateClassGroup(actor.department as never)) return group
  if (group.counselorStaffId === actor.staffId) return group
  if (group.createdByStaffId === actor.staffId) return group
  if (group.members.some((m) => m.staffId === actor.staffId)) return group
  return null
}

export async function GET(request: NextRequest, context: Ctx) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params

  const actor =
    chat.kind === "parent"
      ? ({ kind: "parent" as const, parentId: chat.parentId })
      : ({ kind: "staff" as const, staffId: chat.staffId, department: chat.department })

  const group = await canAccessGroup(id, actor)
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })

  return NextResponse.json({
    group: {
      ...group,
      members: group.members.map((m) => ({
        id: m.id,
        role: m.role,
        staff: m.staff,
        parent: m.parent
          ? {
              id: m.parent.id,
              displayName:
                m.parent.students[0]?.parentName?.trim() ||
                `Veli (${m.parent.studentTcNumber.slice(0, 4)}...)`,
            }
          : null,
      })),
    },
  })
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params
  const group = await prisma.classGroup.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const data: {
    title?: string
    counselorStaffId?: string | null
    parentsCanPost?: boolean
  } = {}

  const isCounselor = group.counselorStaffId === actor.staffId
  const isAdmin = canCreateClassGroup(actor.department)

  if (typeof body?.title === "string" && (isAdmin || isCounselor)) {
    data.title = body.title.trim()
  }
  if (body?.counselorStaffId !== undefined && isAdmin) {
    data.counselorStaffId = body.counselorStaffId ? String(body.counselorStaffId) : null
  }
  if (typeof body?.parentsCanPost === "boolean") {
    if (!isCounselor) {
      return NextResponse.json(
        { error: "Veli yazma iznini yalnızca grubun rehberliği değiştirebilir" },
        { status: 403 }
      )
    }
    data.parentsCanPost = body.parentsCanPost
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 })
  }

  if (data.counselorStaffId) {
    await prisma.classGroupMember.deleteMany({
      where: { classGroupId: id, role: "COUNSELOR" },
    })
    await prisma.classGroupMember.create({
      data: { classGroupId: id, staffId: data.counselorStaffId, role: "COUNSELOR" },
    })
  }

  const updated = await prisma.classGroup.update({ where: { id }, data })
  return NextResponse.json({ group: updated })
}
