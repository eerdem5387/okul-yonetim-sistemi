import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveChatActor } from "@/lib/comms/identity"
import { canDeleteComms, clampText, COMMS_LIMITS, isCommsManager } from "@/lib/comms/access"
import { PARENT_DISPLAY_SELECT, parentDisplayName, resolveGroupAccess } from "@/lib/comms/groups"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Ctx) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params

  const access = await resolveGroupAccess(id, chat)
  if (!access) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })

  const group = await prisma.classGroup.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true } },
      counselorStaff: { select: { id: true, firstName: true, lastName: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          staff: { select: { id: true, firstName: true, lastName: true, department: true } },
          parent: { select: PARENT_DISPLAY_SELECT },
        },
      },
    },
  })
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })

  // Veliler diğer velilerin listesini görmez; yalnızca okul personelini görür
  const members = group.members
    .filter((m) => chat.kind === "staff" || m.role !== "PARENT")
    .map((m) => ({
      id: m.id,
      role: m.role,
      staff: m.staff,
      parent: m.parent ? { id: m.parent.id, displayName: parentDisplayName(m.parent) } : null,
    }))

  return NextResponse.json({
    group: {
      id: group.id,
      title: group.title,
      classId: group.classId,
      class: group.class,
      parentsCanPost: group.parentsCanPost,
      counselorStaffId: group.counselorStaffId,
      counselorStaff: group.counselorStaff,
      createdAt: group.createdAt,
      parentCount: group.members.filter((m) => m.role === "PARENT").length,
      members,
    },
    permissions: {
      canManage: access.canManage,
      canPost: access.canPost,
      canChangeCounselor: chat.kind === "staff" && isCommsManager(chat.department),
      canDelete: chat.kind === "staff" && canDeleteComms(chat.department),
    },
  })
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params

  const access = await resolveGroupAccess(id, { kind: "staff", ...actor })
  if (!access) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
  if (!access.canManage) {
    return NextResponse.json({ error: "Grup ayarlarını yalnızca yönetim veya grubun rehberi değiştirebilir" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const data: { title?: string; counselorStaffId?: string | null; parentsCanPost?: boolean } = {}

  if (typeof body?.title === "string") {
    const title = clampText(body.title, COMMS_LIMITS.subject)
    if (!title) return NextResponse.json({ error: "Grup adı boş olamaz" }, { status: 400 })
    data.title = title
  }
  if (typeof body?.parentsCanPost === "boolean") data.parentsCanPost = body.parentsCanPost
  if (body?.counselorStaffId !== undefined) {
    if (!isCommsManager(actor.department)) {
      return NextResponse.json({ error: "Rehberi yalnızca yönetim değiştirebilir" }, { status: 403 })
    }
    const next = body.counselorStaffId ? String(body.counselorStaffId) : null
    if (next) {
      const guide = await prisma.staff.findFirst({
        where: { id: next, isActive: true, department: { in: ["REHBERLIK", "BAS_REHBERLIK"] } },
        select: { id: true },
      })
      if (!guide) return NextResponse.json({ error: "Geçerli rehberlik personeli seçin" }, { status: 400 })
    }
    data.counselorStaffId = next
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 })
  }

  if (data.counselorStaffId !== undefined) {
    await prisma.classGroupMember.deleteMany({ where: { classGroupId: id, role: "COUNSELOR" } })
    if (data.counselorStaffId) {
      // Daha önce öğretmen olarak eklendiyse rolü rehbere dönüşür
      await prisma.classGroupMember.deleteMany({ where: { classGroupId: id, staffId: data.counselorStaffId } })
      await prisma.classGroupMember.create({
        data: { classGroupId: id, staffId: data.counselorStaffId, role: "COUNSELOR" },
      })
    }
  }

  const updated = await prisma.classGroup.update({ where: { id }, data })
  return NextResponse.json({ group: updated })
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(_request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canDeleteComms(actor.department)) {
    return NextResponse.json({ error: "Silme yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
  const group = await prisma.classGroup.findUnique({ where: { id }, select: { id: true } })
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })

  await prisma.classGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
