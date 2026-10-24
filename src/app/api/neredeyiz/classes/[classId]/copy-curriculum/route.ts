import { NextRequest, NextResponse } from "next/server"
import { copyClassCurriculum } from "@/lib/neredeyiz/sync"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params
    const body = await request.json()
    const sourceClassId = String(body.sourceClassId || "").trim()
    const subjectIds = Array.isArray(body.subjectIds)
      ? body.subjectIds.map(String).filter(Boolean)
      : undefined
    const includeDates = body.includeDates === true

    if (!sourceClassId) {
      return NextResponse.json({ error: "Kaynak sınıf zorunludur" }, { status: 400 })
    }

    const result = await copyClassCurriculum({
      sourceClassId,
      targetClassId: classId,
      subjectIds,
      includeDates,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kopyalama başarısız"
    const status = message.includes("bulunamadı") || message.includes("aynı") ? 400 : 500
    console.error("copy-curriculum", error)
    return NextResponse.json({ error: message }, { status })
  }
}
