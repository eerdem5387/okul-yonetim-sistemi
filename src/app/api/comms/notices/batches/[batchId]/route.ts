import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { loadBatchForActor } from "@/lib/comms/batches"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ batchId: string }> }

/** Gönderim detayı: alıcılar + görme durumları */
export async function GET(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { batchId } = await context.params

  const { rows, allowed } = await loadBatchForActor(batchId, actor)
  if (!rows.length) return NextResponse.json({ error: "Gönderim bulunamadı" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const first = rows[0]
  return NextResponse.json({
    batch: {
      batchId,
      type: first.type,
      subject: first.subject,
      body: first.body,
      createdAt: first.createdAt,
      sender: first.senderStaff,
      total: rows.length,
      seen: rows.filter((r) => r.seenAt).length,
    },
    recipients: rows.map((r) => ({
      noticeId: r.id,
      staff: r.recipientStaff,
      seenAt: r.seenAt,
      remindedAt: r.remindedAt,
      remindCount: r.remindCount,
    })),
  })
}

/** Gönderimi geri çek (yumuşak silme: kayıt izi korunur). Gönderen veya yönetim. */
export async function DELETE(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { batchId } = await context.params

  const { rows, allowed } = await loadBatchForActor(batchId, actor)
  if (!rows.length) return NextResponse.json({ error: "Gönderim bulunamadı" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Geri çekme yetkiniz yok" }, { status: 403 })

  const res = await prisma.officialNotice.updateMany({
    where: { batchId, deletedAt: null },
    data: { deletedAt: new Date(), deletedByStaffId: actor.staffId },
  })
  return NextResponse.json({ ok: true, count: res.count })
}
