import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import type { OfficialNoticeType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canSendOfficialNotice } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

const TYPES: OfficialNoticeType[] = ["IHTAR", "TALIMAT", "PERSONEL_DUYURU"]

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const box = request.nextUrl.searchParams.get("box") || "inbox"
  const where =
    box === "sent"
      ? { senderStaffId: actor.staffId }
      : { recipientStaffId: actor.staffId }

  const notices = await prisma.officialNotice.findMany({
    where,
    include: {
      senderStaff: { select: { id: true, firstName: true, lastName: true, department: true } },
      recipientStaff: { select: { id: true, firstName: true, lastName: true, department: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  return NextResponse.json({ notices })
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!(await canSendOfficialNotice(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Resmi ileti gönderme yetkiniz yok" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const type = body?.type as OfficialNoticeType
  const subject = String(body?.subject || "").trim()
  const text = String(body?.body || "").trim()
  const templateId = body?.templateId ? String(body.templateId) : null
  const allStaff = Boolean(body?.allStaff)
  const recipientIds: string[] = Array.isArray(body?.recipientStaffIds)
    ? body.recipientStaffIds.map(String)
    : []

  if (!TYPES.includes(type) || !subject || !text) {
    return NextResponse.json({ error: "type, subject ve body zorunlu" }, { status: 400 })
  }

  let targets = recipientIds
  if (allStaff) {
    const rows = await prisma.staff.findMany({
      where: { isActive: true, id: { not: actor.staffId } },
      select: { id: true },
    })
    targets = rows.map((r) => r.id)
  }
  targets = [...new Set(targets)].filter((id) => id && id !== actor.staffId)
  if (targets.length === 0) {
    return NextResponse.json({ error: "En az bir alıcı seçin" }, { status: 400 })
  }

  if (templateId) {
    const tpl = await prisma.commsTemplate.findFirst({
      where: { id: templateId, isActive: true },
    })
    if (!tpl) return NextResponse.json({ error: "Şablon bulunamadı" }, { status: 400 })
  }

  const batchId = randomUUID()
  await prisma.officialNotice.createMany({
    data: targets.map((recipientStaffId) => ({
      type,
      templateId,
      subject,
      body: text,
      senderStaffId: actor.staffId,
      recipientStaffId,
      batchId,
    })),
  })

  return NextResponse.json({ ok: true, batchId, count: targets.length }, { status: 201 })
}
