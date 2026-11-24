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

  const sections = await prisma.examSection.findMany({
    where: { examId: id },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json({ sections })
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
  if (exam.status !== "DRAFT" && exam.status !== "CONFIGURED") {
    return NextResponse.json({ error: "Okutmaya açılmış sınavda bölüm eklenemez" }, { status: 409 })
  }

  const body = await request.json()
  const { name, questionStart, questionEnd, sortOrder } = body
  if (!name || questionStart == null || questionEnd == null) {
    return NextResponse.json({ error: "name, questionStart, questionEnd gerekli" }, { status: 400 })
  }

  const section = await prisma.examSection.create({
    data: {
      examId,
      name,
      questionStart: Number(questionStart),
      questionEnd: Number(questionEnd),
      sortOrder: sortOrder ?? 0,
    },
  })

  // Aralıktaki eksik soruları oluştur (önceden yalnız ilk bölümde soru üretiliyordu)
  const start = Number(questionStart)
  const end = Number(questionEnd)
  const existingNos = new Set(
    (
      await prisma.examQuestion.findMany({
        where: { examId, questionNo: { gte: start, lte: end }, OR: [{ bookletVariant: null }, { bookletVariant: "A" }] },
        select: { questionNo: true },
      })
    ).map((q) => q.questionNo)
  )
  const questions = []
  for (let n = start; n <= end; n++) {
    if (!existingNos.has(n)) questions.push({ examId, sectionId: section.id, questionNo: n, sortOrder: n })
  }
  if (questions.length) await prisma.examQuestion.createMany({ data: questions })
  await prisma.examQuestion.updateMany({
    where: { examId, questionNo: { gte: start, lte: end } },
    data: { sectionId: section.id },
  })

  return NextResponse.json({ section })
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
  if (exam.status !== "DRAFT" && exam.status !== "CONFIGURED") {
    return NextResponse.json({ error: "Okutmaya açılmış sınavda bölüm silinemez" }, { status: 409 })
  }

  const { searchParams } = new URL(request.url)
  const sectionId = searchParams.get("sectionId")
  if (!sectionId) return NextResponse.json({ error: "sectionId gerekli" }, { status: 400 })

  const section = await prisma.examSection.findFirst({ where: { id: sectionId, examId } })
  if (!section) return NextResponse.json({ error: "Bölüm bulunamadı" }, { status: 404 })
  await prisma.examQuestion.deleteMany({ where: { sectionId, examId } })
  await prisma.examSection.delete({ where: { id: sectionId } })
  return NextResponse.json({ success: true })
}
