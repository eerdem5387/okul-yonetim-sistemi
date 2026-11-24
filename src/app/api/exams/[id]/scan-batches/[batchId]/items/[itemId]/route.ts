import { NextRequest, NextResponse } from "next/server"
import { requireExamScan } from "@/lib/exams/auth"
import { assignScanItem } from "@/lib/exams/import-batch"

export const maxDuration = 60

/** PATCH { studentId } — eşleşmeyen / yanlış eşleşen kağıdı elle bir öğrenciye bağlar ve puanlar. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; batchId: string; itemId: string }> }
) {
  const { id: examId, itemId } = await context.params
  const actor = await requireExamScan(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  const body = (await request.json().catch(() => ({}))) as { studentId?: string }
  if (!body.studentId) return NextResponse.json({ error: "Öğrenci seçilmedi" }, { status: 400 })
  try {
    await assignScanItem(examId, itemId, body.studentId, actor.staffId)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Eşleştirme yapılamadı" }, { status: 409 })
  }
}
