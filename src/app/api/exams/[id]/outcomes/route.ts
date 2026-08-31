import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamEdit, requireExamView } from "@/lib/exams/auth"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamView(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const outcomes = await prisma.examOutcome.findMany({
    where: { examId: id },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json({ outcomes })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })
  if (exam.status === "READY_FOR_SCAN" || exam.status === "PUBLISHED") {
    return NextResponse.json({ error: "Kilitli sınavda kazanım eklenemez" }, { status: 409 })
  }

  const body = await request.json()

  if (body.import && Array.isArray(body.rows)) {
    const created = []
    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i]
      if (!row.subject || !row.topic || !row.learningOutcome) continue
      const o = await prisma.examOutcome.create({
        data: {
          examId,
          code: row.code ?? null,
          subject: row.subject,
          topic: row.topic,
          learningOutcome: row.learningOutcome,
          sortOrder: i,
        },
      })
      created.push(o)
    }
    return NextResponse.json({ outcomes: created })
  }

  const { code, subject, topic, learningOutcome, sortOrder } = body
  if (!subject || !topic || !learningOutcome) {
    return NextResponse.json({ error: "subject, topic, learningOutcome gerekli" }, { status: 400 })
  }

  const outcome = await prisma.examOutcome.create({
    data: {
      examId,
      code: code ?? null,
      subject,
      topic,
      learningOutcome,
      sortOrder: sortOrder ?? 0,
    },
  })
  return NextResponse.json({ outcome })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })
  if (exam.status === "READY_FOR_SCAN" || exam.status === "PUBLISHED") {
    return NextResponse.json({ error: "Kilitli sınavda kazanım güncellenemez" }, { status: 409 })
  }

  const body = await request.json()
  const { outcomeId, ...data } = body
  if (!outcomeId) return NextResponse.json({ error: "outcomeId gerekli" }, { status: 400 })

  const outcome = await prisma.examOutcome.update({
    where: { id: outcomeId },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.subject && { subject: data.subject }),
      ...(data.topic && { topic: data.topic }),
      ...(data.learningOutcome && { learningOutcome: data.learningOutcome }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  })
  return NextResponse.json({ outcome })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })
  if (exam.status === "READY_FOR_SCAN" || exam.status === "PUBLISHED") {
    return NextResponse.json({ error: "Kilitli sınavda kazanım silinemez" }, { status: 409 })
  }

  const { searchParams } = new URL(request.url)
  const outcomeId = searchParams.get("outcomeId")
  if (!outcomeId) return NextResponse.json({ error: "outcomeId gerekli" }, { status: 400 })

  await prisma.examQuestion.updateMany({
    where: { examId, outcomeId },
    data: { outcomeId: null },
  })
  await prisma.examOutcome.delete({ where: { id: outcomeId } })
  return NextResponse.json({ success: true })
}
