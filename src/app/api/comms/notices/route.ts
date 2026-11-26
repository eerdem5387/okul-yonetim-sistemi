import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import type { OfficialNoticeType, StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import {
  canSendOfficialNotice,
  clampText,
  COMMS_LIMITS,
  filterOfficialNoticeRecipientIds,
  listOfficialNoticeRecipients,
} from "@/lib/comms/access"
import { applyNoticePlaceholders } from "@/lib/comms/placeholders"
import { NOTICE_TYPE_LABEL } from "@/lib/comms/labels"
import { notifyStaffComms } from "@/lib/comms/notify"

export const dynamic = "force-dynamic"

const TYPES: OfficialNoticeType[] = ["IHTAR", "TALIMAT", "PERSONEL_DUYURU"]

const STAFF_SELECT = { id: true, firstName: true, lastName: true, department: true } as const

/** Gelen kutusu (box=inbox) veya kişinin gönderdiği satırlar (box=sent, eski istemciler için). */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const box = request.nextUrl.searchParams.get("box") || "inbox"
  const where =
    box === "sent"
      ? { senderStaffId: actor.staffId, deletedAt: null }
      : { recipientStaffId: actor.staffId, deletedAt: null }

  const notices = await prisma.officialNotice.findMany({
    where,
    include: {
      senderStaff: { select: STAFF_SELECT },
      recipientStaff: { select: STAFF_SELECT },
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
  const subject = clampText(body?.subject, COMMS_LIMITS.subject)
  const text = clampText(body?.body, COMMS_LIMITS.body)
  const templateId = body?.templateId ? String(body.templateId) : null
  const allStaff = Boolean(body?.allStaff)
  const departments: StaffDepartment[] = Array.isArray(body?.departments)
    ? body.departments.map(String)
    : []
  const recipientIds: string[] = Array.isArray(body?.recipientStaffIds)
    ? body.recipientStaffIds.map(String)
    : []

  if (!TYPES.includes(type) || !subject || !text) {
    return NextResponse.json({ error: "Tür, konu ve metin zorunlu" }, { status: 400 })
  }

  let targets: string[]
  if (allStaff || departments.length) {
    const rows = await listOfficialNoticeRecipients(actor.staffId)
    const deptSet = new Set(departments)
    const fromDepts = rows.filter((r) => allStaff || deptSet.has(r.department)).map((r) => r.id)
    const extra = recipientIds.length ? await filterOfficialNoticeRecipientIds(recipientIds, actor.staffId) : []
    targets = [...new Set([...fromDepts, ...extra])]
  } else {
    targets = await filterOfficialNoticeRecipientIds(recipientIds, actor.staffId)
  }
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "En az bir alıcı seçin (gönderim yetkilileri alıcı olamaz)" },
      { status: 400 }
    )
  }

  if (templateId) {
    const tpl = await prisma.commsTemplate.findFirst({ where: { id: templateId, isActive: true } })
    if (!tpl) return NextResponse.json({ error: "Şablon bulunamadı" }, { status: 400 })
  }

  const recipientRows = await prisma.staff.findMany({
    where: { id: { in: targets } },
    select: { id: true, firstName: true, lastName: true },
  })
  const nameById = new Map(recipientRows.map((r) => [r.id, `${r.firstName} ${r.lastName}`.trim()] as const))

  const batchId = randomUUID()
  await prisma.officialNotice.createMany({
    data: targets.map((recipientStaffId) => {
      const recipientFullName = nameById.get(recipientStaffId) || ""
      return {
        type,
        templateId,
        subject: applyNoticePlaceholders(subject, { recipientFullName }),
        body: applyNoticePlaceholders(text, { recipientFullName }),
        senderStaffId: actor.staffId,
        recipientStaffId,
        batchId,
      }
    }),
  })

  const label = NOTICE_TYPE_LABEL[type]
  notifyStaffComms({
    staffIds: targets,
    title: `Yeni ${label.toLocaleLowerCase("tr-TR")} · ${actor.firstName} ${actor.lastName}`.trim(),
    body: applyNoticePlaceholders(subject, { recipientFullName: "" }),
    data: { kind: "comms_notice", tab: "inbox" },
    priority: type === "IHTAR" ? "HIGH" : "NORMAL",
    official: true,
  })

  return NextResponse.json({ ok: true, batchId, count: targets.length }, { status: 201 })
}
