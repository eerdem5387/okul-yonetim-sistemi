import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/neredeyiz/access"
import { completeTopic, undoTopicCompletion } from "@/lib/neredeyiz/completion-service"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST — Konuyu tamamlandı işaretle.
 * Gövde: { completedAt?: "YYYY-MM-DD" (varsayılan bugün), lateReason?: IZIN|RAPOR|ETKINLIK|PROGRAM_DEGISIKLIGI|DIGER, note? }
 * Planlanan aralıktan sonra tamamlanıyorsa lateReason zorunludur (400 ve requiresLateReason: true).
 */
export async function POST(request: NextRequest, context: Ctx) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const result = await completeTopic(guard.actor, id, body)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, requiresLateReason: result.error.includes("gecikme sebebini") },
        { status: result.status },
      )
    }
    return NextResponse.json(result.data)
  } catch (error) {
    console.error("complete topic", error)
    return NextResponse.json({ error: "Konu işaretlenemedi" }, { status: 500 })
  }
}

// DELETE — Tamamlandı işaretini geri al
export async function DELETE(request: NextRequest, context: Ctx) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const result = await undoTopicCompletion(guard.actor, id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("undo completion", error)
    return NextResponse.json({ error: "İşlem geri alınamadı" }, { status: 500 })
  }
}
