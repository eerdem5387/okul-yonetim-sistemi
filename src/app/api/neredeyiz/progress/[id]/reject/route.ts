import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/neredeyiz/access"
import { decideProgress } from "@/lib/neredeyiz/progress-service"

// POST - Onay bekleyen konuyu gerekçeyle geri çevir; konu "devam ediyor"a döner ve öğretmene bildirilir.
// Gövde: { reason: string }
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { reason?: unknown }
    const result = await decideProgress(guard.actor, id, "reject", typeof body.reason === "string" ? body.reason : null)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ success: true, progress: result.data })
  } catch (error) {
    console.error("Error rejecting progress:", error)
    return NextResponse.json({ error: "Reddetme sırasında hata oluştu" }, { status: 500 })
  }
}
