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

  const questions = await prisma.examQuestion.findMany({
    where: { examId: id },
    include: {
      outcome: true,
      section: true,
    },
    orderBy: { questionNo: "asc" },
  })
  return NextResponse.json({ questions })
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

  const body = await request.json()
  const locked = exam.status === "READY_FOR_SCAN" || exam.status === "PUBLISHED"

  if (body.bulk && Array.isArray(body.questions)) {
    if (locked) {
      return NextResponse.json({ error: "Kilitli sınavda soru güncellenemez" }, { status: 409 })
    }
    for (const q of body.questions) {
      await prisma.examQuestion.update({
        where: { id: q.id },
        data: {
          ...(q.correctAnswer !== undefined && { correctAnswer: q.correctAnswer }),
          ...(q.outcomeId !== undefined && { outcomeId: q.outcomeId }),
          ...(q.bookletVariant !== undefined && { bookletVariant: q.bookletVariant }),
        },
      })
    }
    return NextResponse.json({ success: true })
  }

  const { questionId, correctAnswer, outcomeId, bookletVariant } = body
  if (!questionId) return NextResponse.json({ error: "questionId gerekli" }, { status: 400 })

  if (locked && (correctAnswer !== undefined || outcomeId !== undefined)) {
    return NextResponse.json({ error: "Kilitli sınavda anahtar/kazanım değiştirilemez" }, { status: 409 })
  }

  const question = await prisma.examQuestion.update({
    where: { id: questionId },
    data: {
      ...(correctAnswer !== undefined && { correctAnswer }),
      ...(outcomeId !== undefined && { outcomeId }),
      ...(bookletVariant !== undefined && { bookletVariant }),
    },
  })
  return NextResponse.json({ question })
}
