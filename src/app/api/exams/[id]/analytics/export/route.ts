import { NextRequest, NextResponse } from "next/server"
import { requireExamExport } from "@/lib/exams/auth"
import { analyticsToCsv, computeExamAnalytics } from "@/lib/exams/analytics"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamExport(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const analytics = await computeExamAnalytics(id)
  if (!analytics) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  const csv = analyticsToCsv(analytics)
  const filename = `sinav-${id}-kazanim-analizi.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
