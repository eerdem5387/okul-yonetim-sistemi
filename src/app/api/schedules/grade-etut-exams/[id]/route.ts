import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** DELETE /api/schedules/grade-etut-exams/[id] */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "id gerekli" }, { status: 400 })
    }

    const result = await prisma.gradeEtutExam.deleteMany({ where: { id } })
    if (result.count === 0) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[grade-etut-exams DELETE]", error)
    return NextResponse.json({ error: "Deneme silinemedi" }, { status: 500 })
  }
}
