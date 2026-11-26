import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canDeleteComms } from "@/lib/comms/access"
import { PARENT_DISPLAY_SELECT, parentDisplayName, resolveGroupAccess } from "@/lib/comms/groups"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/** Duyurunun okunma listesi (personel) */
export async function GET(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { id } = await context.params

  const row = await prisma.classAnnouncement.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      createdAt: true,
      classGroupId: true,
      acks: {
        select: { seenAt: true, parent: { select: PARENT_DISPLAY_SELECT } },
        orderBy: { seenAt: { sort: "desc", nulls: "last" } },
      },
    },
  })
  if (!row) return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 })
  const access = await resolveGroupAccess(row.classGroupId, { kind: "staff", ...actor })
  if (!access) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const readers = row.acks.map((a) => ({
    parentId: a.parent.id,
    displayName: parentDisplayName(a.parent),
    seenAt: a.seenAt,
  }))
  return NextResponse.json({
    announcement: { id: row.id, subject: row.subject, createdAt: row.createdAt },
    total: readers.length,
    seen: readers.filter((r) => r.seenAt).length,
    readers,
  })
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(_request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canDeleteComms(actor.department)) {
    return NextResponse.json({ error: "Silme yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
  const row = await prisma.classAnnouncement.findUnique({ where: { id }, select: { id: true } })
  if (!row) return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 })

  await prisma.classAnnouncement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
