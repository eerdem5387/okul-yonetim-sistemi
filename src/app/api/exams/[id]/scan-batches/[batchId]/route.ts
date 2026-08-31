import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamView } from "@/lib/exams/auth"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; batchId: string }> }
) {
  const { id: examId, batchId } = await context.params
  const actor = await requireExamView(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const batch = await prisma.examScanBatch.findFirst({
    where: { examId, externalBatchId: batchId },
    include: {
      items: {
        orderBy: { itemIndex: "asc" },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, grade: true, tcNumber: true },
          },
        },
      },
      operator: { select: { firstName: true, lastName: true } },
    },
  })

  if (!batch) return NextResponse.json({ error: "Batch bulunamadı" }, { status: 404 })
  return NextResponse.json({ batch })
}
