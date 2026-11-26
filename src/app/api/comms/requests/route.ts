import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Prisma, StaffCommsRequestStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { clampText, COMMS_LIMITS, isRequestApprover } from "@/lib/comms/access"
import { listRequestApproverIds, notifyStaffComms } from "@/lib/comms/notify"
import { REQUEST_INCLUDE } from "@/lib/comms/requests"

export const dynamic = "force-dynamic"

const STATUSES: StaffCommsRequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]

/**
 * box=all|inbox (onay mercii) veya mine (talep sahibi).
 * mine: yanıt döndükten sonra yeni kararlar "görüldü" sayılır; istemci `newDecision` ile vurgular.
 */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const approver = isRequestApprover(actor.department)
  const box = sp.get("box") || (approver ? "all" : "mine")
  const status = sp.get("status") as StaffCommsRequestStatus | null

  const base: Prisma.StaffCommsRequestWhereInput =
    box === "inbox" && approver
      ? { status: "PENDING" }
      : box === "all" && approver
        ? {}
        : { requesterStaffId: actor.staffId }
  const where: Prisma.StaffCommsRequestWhereInput = {
    ...base,
    ...(status && STATUSES.includes(status) ? { status } : {}),
  }

  const rows = await prisma.staffCommsRequest.findMany({
    where,
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 300,
  })

  const mine = !(approver && (box === "all" || box === "inbox"))
  const requests = rows.map((r) => ({
    ...r,
    newDecision: mine && r.requesterStaffId === actor.staffId && !!r.decidedAt && !r.decisionSeenAt,
  }))

  if (mine) {
    const ids = requests.filter((r) => r.newDecision).map((r) => r.id)
    if (ids.length) {
      await prisma.staffCommsRequest.updateMany({
        where: { id: { in: ids } },
        data: { decisionSeenAt: new Date() },
      })
    }
  }

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

  const body = await request.json().catch(() => null)
  const subject = clampText(body?.subject, COMMS_LIMITS.subject)
  const text = clampText(body?.body, COMMS_LIMITS.body)
  const templateId = body?.templateId ? String(body.templateId) : null
  if (!subject || !text) {
    return NextResponse.json({ error: "Konu ve açıklama zorunlu" }, { status: 400 })
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

  const approvers = await listRequestApproverIds()
  notifyStaffComms({
    staffIds: approvers,
    title: `Yeni talep · ${actor.firstName} ${actor.lastName}`.trim(),
    body: subject,
    data: { kind: "comms_request_new", tab: "requests", id: row.id },
    priority: "HIGH",
    official: true,
  })

  return NextResponse.json({ request: row }, { status: 201 })
}
