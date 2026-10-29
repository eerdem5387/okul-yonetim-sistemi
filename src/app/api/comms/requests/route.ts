import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canSendOfficialNotice, isRequestApprover } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const box = request.nextUrl.searchParams.get("box") || "mine"
  const where =
    box === "inbox" && isRequestApprover(actor.department)
      ? { status: "PENDING" as const }
      : box === "all" && isRequestApprover(actor.department)
        ? {}
        : { requesterStaffId: actor.staffId }

  const requests = await prisma.staffCommsRequest.findMany({
    where,
    include: {
      requesterStaff: { select: { id: true, firstName: true, lastName: true, department: true } },
      decidedByStaff: { select: { id: true, firstName: true, lastName: true } },
      template: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  return NextResponse.json({ requests })
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (isRequestApprover(actor.department)) {
    return NextResponse.json(
      { error: "Onay mercileri talep oluşturmaz; gelen talepleri onaylar" },
      { status: 403 }
    )
  }
  if (await canSendOfficialNotice(actor.staffId, actor.department)) {
    return NextResponse.json(
      { error: "Resmi gönderim yetkilileri talep oluşturmaz" },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const subject = String(body?.subject || "").trim()
  const text = String(body?.body || "").trim()
  const templateId = body?.templateId ? String(body.templateId) : null
  if (!subject || !text) {
    return NextResponse.json({ error: "subject ve body zorunlu" }, { status: 400 })
  }
  if (templateId) {
    const tpl = await prisma.commsTemplate.findFirst({
      where: { id: templateId, kind: "PERSONEL_TALEP", isActive: true },
    })
    if (!tpl) return NextResponse.json({ error: "Talep şablonu bulunamadı" }, { status: 400 })
  }

  const row = await prisma.staffCommsRequest.create({
    data: {
      templateId,
      subject,
      body: text,
      requesterStaffId: actor.staffId,
    },
  })
  return NextResponse.json({ request: row }, { status: 201 })
}
