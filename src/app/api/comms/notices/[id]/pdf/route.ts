import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canSendOfficialNotice } from "@/lib/comms/access"
import { generatePDF } from "@/lib/pdf-generator"
import { buildOfficialNoticePdfHtml } from "@/lib/comms/notice-pdf"
import { NOTICE_TYPE_LABEL } from "@/lib/comms/labels"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

export async function GET(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const notice = await prisma.officialNotice.findUnique({
    where: { id },
    include: {
      senderStaff: { select: { id: true, firstName: true, lastName: true } },
      recipientStaff: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  if (!notice) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

  const isSender = notice.senderStaffId === actor.staffId
  const isRecipient = notice.recipientStaffId === actor.staffId
  const canSend = await canSendOfficialNotice(actor.staffId, actor.department)
  if (!isSender && !isRecipient && !canSend) {
    return NextResponse.json({ error: "Bu iletiyi indirme yetkiniz yok" }, { status: 403 })
  }

  const senderName = `${notice.senderStaff.firstName} ${notice.senderStaff.lastName}`.trim()
  const recipientName = `${notice.recipientStaff.firstName} ${notice.recipientStaff.lastName}`.trim()

  try {
    const html = buildOfficialNoticePdfHtml({
      type: notice.type,
      subject: notice.subject,
      body: notice.body,
      createdAt: notice.createdAt,
      seenAt: notice.seenAt,
      senderName,
      recipientName,
    })
    const pdf = await generatePDF(html, {
      margin: { top: "12mm", right: "14mm", bottom: "14mm", left: "14mm" },
    })
    const pdfBuffer = Buffer.from(pdf)
    const typeSlug = sanitizeFileName(NOTICE_TYPE_LABEL[notice.type] || notice.type)
    const subjectSlug = sanitizeFileName(notice.subject) || "ileti"
    const fileName = `${typeSlug}-${subjectSlug}-${id.slice(0, 8)}.pdf`
    const encoded = encodeURIComponent(fileName)

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("GET /api/comms/notices/[id]/pdf error:", error)
    return NextResponse.json(
      {
        error: "PDF oluşturulamadı",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
