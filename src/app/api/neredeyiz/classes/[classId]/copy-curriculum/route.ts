import { NextRequest, NextResponse } from "next/server"
import { copyClassCurriculum } from "@/lib/neredeyiz/sync"
import { requireNeredeyizManager } from "@/lib/neredeyiz/access"

// POST - Kaynak sınıfın müfredatını bu sınıfa kopyala. İlerlemesi olan dersler atlanır (ilerleme silinmez).
export async function POST(request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  const guard = await requireNeredeyizManager(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { classId } = await context.params
    const body = (await request.json()) as { sourceClassId?: string; subjectIds?: string[]; includeDates?: boolean }
    if (!body.sourceClassId) return NextResponse.json({ error: "Kaynak sınıf zorunludur" }, { status: 400 })
    const result = await copyClassCurriculum({
      sourceClassId: body.sourceClassId,
      targetClassId: classId,
      subjectIds: Array.isArray(body.subjectIds) ? body.subjectIds.map(String) : undefined,
      includeDates: Boolean(body.includeDates),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("copy-curriculum", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Kopyalanamadı" }, { status: 400 })
  }
}
