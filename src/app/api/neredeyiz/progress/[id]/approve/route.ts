import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/neredeyiz/access"
import { decideProgress } from "@/lib/neredeyiz/progress-service"

// POST - Onay bekleyen konuyu onayla. Onaylayan oturumdaki kullanıcıdır (gövdedeki approvedBy yok sayılır).
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const result = await decideProgress(guard.actor, id, "approve")
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ success: true, progress: result.data, ...result.data })
  } catch (error) {
    console.error("Error approving progress:", error)
    return NextResponse.json({ error: "Onay işlemi sırasında hata oluştu" }, { status: 500 })
  }
}
