import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamScan } from "@/lib/exams/auth"
import { processScanBatch } from "@/lib/exams/import-batch"
import type { ScanBatchSubmitInput } from "@/lib/exams/types"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamScan(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const body = (await request.json()) as ScanBatchSubmitInput
  if (!body.batchId || !body.items?.length) {
    return NextResponse.json({ error: "batchId ve items gerekli" }, { status: 400 })
  }

  try {
    const result = await processScanBatch(examId, actor.staffId, body)
    if (result.duplicate) {
      return NextResponse.json({
        batchId: body.batchId,
        status: "duplicate",
        examStatus: "IN_REVIEW",
        summary: result.batch.summaryJson,
      })
    }
    return NextResponse.json({
      batchId: body.batchId,
      status: "accepted",
      examStatus: "IN_REVIEW",
      summary: result.summary,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Batch işlenemedi"
    return NextResponse.json({ error: message }, { status: 409 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamScan(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const batches = await prisma.examScanBatch.findMany({
    where: { examId },
    orderBy: { createdAt: "desc" },
    include: {
      operator: { select: { firstName: true, lastName: true } },
      _count: { select: { items: true } },
    },
  })

  return NextResponse.json({ batches })
}
