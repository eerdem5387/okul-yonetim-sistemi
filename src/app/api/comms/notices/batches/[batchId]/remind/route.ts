import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { NOTICE_TYPE_LABEL } from "@/lib/comms/labels"
import { notifyStaffComms } from "@/lib/comms/notify"
import { loadBatchForActor } from "@/lib/comms/batches"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ batchId: string }> }

/** Aynı kişiye tekrar hatırlatma için en az bekleme süresi */
const MIN_INTERVAL_MS = 30 * 60 * 1000

/** Görmeyen alıcılara hatırlatma (push + zil). İsteğe bağlı: noticeIds ile tek kişiye. */
export async function POST(request: NextRequest, context: Ctx) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { batchId } = await context.params

  const { rows, allowed } = await loadBatchForActor(batchId, actor)
  if (!rows.length) return NextResponse.json({ error: "Gönderim bulunamadı" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Hatırlatma yetkiniz yok" }, { status: 403 })

  const body = await request.json().catch(() => null)
  const only: string[] | null = Array.isArray(body?.noticeIds) ? body.noticeIds.map(String) : null
  const now = Date.now()

  const candidates = rows.filter((r) => !r.seenAt && (!only || only.includes(r.id)))
  const due = candidates.filter((r) => !r.remindedAt || now - r.remindedAt.getTime() >= MIN_INTERVAL_MS)

  if (!candidates.length) {
    return NextResponse.json({ error: "Hatırlatılacak kişi yok; herkes gördü" }, { status: 400 })
  }
  if (!due.length) {
    return NextResponse.json(
      { error: "Bu kişilere son 30 dakika içinde zaten hatırlatma gönderildi" },
      { status: 429 }
    )
  }

  await prisma.officialNotice.updateMany({
    where: { id: { in: due.map((r) => r.id) } },
    data: { remindedAt: new Date(now), remindCount: { increment: 1 } },
  })

  const first = rows[0]
  notifyStaffComms({
    staffIds: due.map((r) => r.recipientStaffId),
    title: `Hatırlatma: ${NOTICE_TYPE_LABEL[first.type]} bekliyor`,
    body: `${first.subject} — Lütfen açıp "Görüldü" olarak işaretleyin.`,
    data: { kind: "comms_notice_reminder", tab: "inbox" },
    priority: "HIGH",
    official: true,
  })

  return NextResponse.json({ ok: true, reminded: due.length, skipped: candidates.length - due.length })
}
