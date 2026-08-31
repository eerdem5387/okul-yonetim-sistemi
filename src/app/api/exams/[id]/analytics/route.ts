import { NextRequest, NextResponse } from "next/server"
import { requireExamView } from "@/lib/exams/auth"
import { computeExamAnalytics } from "@/lib/exams/analytics"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamView(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const analytics = await computeExamAnalytics(id)
  if (!analytics) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  return NextResponse.json({ analytics })
}
