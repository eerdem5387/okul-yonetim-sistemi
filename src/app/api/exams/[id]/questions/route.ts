import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamEdit, requireExamView } from "@/lib/exams/auth"
import { isBaseVariant, normalizeBookletVariant } from "@/lib/exams/scoring"
import { rescoreExam } from "@/lib/exams/results"

export const maxDuration = 60

const VALID = new Set(["A", "B", "C", "D", "E"])
/** Okutmaya açıldıktan sonra anahtar değişirse tanım sürümü artar ve sonuçlar yeniden hesaplanır. */
const SCAN_STAGE = new Set(["READY_FOR_SCAN", "SCANNING", "IN_REVIEW"])

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamView(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const questions = await prisma.examQuestion.findMany({
    where: { examId: id },
    include: { outcome: true, section: true },
    orderBy: [{ questionNo: "asc" }, { bookletVariant: "asc" }],
  })

  return NextResponse.json({ questions })
}

function cleanAnswer(raw: unknown): string | null {
  if (raw == null) return null
  const t = String(raw).trim().toUpperCase()
  if (!t) return null
  return VALID.has(t) ? t : null
}

/**
 * PUT
 * - { bulk: true, questions: [{ id, correctAnswer?, outcomeId? }] } — tablo kaydı
 * - { keyPaste: { sectionId, variant?: "A"|"B", answers: "ABCD…" } } — bir dersin anahtarını tek satırda gir
 * - { removeVariant: "B" } — ayrı kitapçık anahtarını kaldır
 * - { questionId, correctAnswer?, outcomeId? } — tek soru
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })
  if (exam.status === "PUBLISHED" || exam.status === "ARCHIVED") {
    return NextResponse.json({ error: "Yayınlanmış sınavın anahtarı değiştirilemez" }, { status: 409 })
  }
  const inScanStage = SCAN_STAGE.has(exam.status)
  const body = await request.json()

  let changedKey = false

  if (body.keyPaste) {
    const { sectionId, answers } = body.keyPaste as { sectionId?: string; answers?: string; variant?: string }
    const variant = normalizeBookletVariant(body.keyPaste.variant)
    const section = sectionId
      ? await prisma.examSection.findFirst({ where: { id: sectionId, examId } })
      : null
    if (!section) return NextResponse.json({ error: "Ders/bölüm bulunamadı" }, { status: 400 })
    const letters = String(answers ?? "").toUpperCase().replace(/[^A-E]/g, "")
    const count = section.questionEnd - section.questionStart + 1
    if (letters.length !== count) {
      return NextResponse.json(
        { error: `${section.name} için ${count} cevap gerekli, ${letters.length} harf girildi.` },
        { status: 400 }
      )
    }
    if (isBaseVariant(variant)) {
      for (let i = 0; i < count; i++) {
        await prisma.examQuestion.updateMany({
          where: { examId, questionNo: section.questionStart + i, OR: [{ bookletVariant: null }, { bookletVariant: "A" }] },
          data: { correctAnswer: letters[i] },
        })
      }
    } else {
      for (let i = 0; i < count; i++) {
        const questionNo = section.questionStart + i
        await prisma.examQuestion.upsert({
          where: { examId_questionNo_bookletVariant: { examId, questionNo, bookletVariant: variant! } },
          create: { examId, questionNo, bookletVariant: variant!, sectionId: section.id, sortOrder: questionNo, correctAnswer: letters[i] },
          update: { correctAnswer: letters[i], sectionId: section.id },
        })
      }
    }
    changedKey = true
  } else if (body.removeVariant) {
    const variant = normalizeBookletVariant(body.removeVariant)
    if (!variant || variant === "A") return NextResponse.json({ error: "Geçersiz kitapçık" }, { status: 400 })
    await prisma.examQuestion.deleteMany({ where: { examId, bookletVariant: variant } })
    changedKey = true
  } else if (body.bulk && Array.isArray(body.questions)) {
    const ids = body.questions.map((q: { id: string }) => q.id)
    const owned = await prisma.examQuestion.findMany({ where: { id: { in: ids }, examId }, select: { id: true, correctAnswer: true } })
    const ownedById = new Map(owned.map((q) => [q.id, q]))
    for (const q of body.questions as Array<{ id: string; correctAnswer?: string | null; outcomeId?: string | null }>) {
      const current = ownedById.get(q.id)
      if (!current) continue
      const answer = q.correctAnswer !== undefined ? cleanAnswer(q.correctAnswer) : undefined
      if (inScanStage && answer === null) continue // okutma aşamasında anahtar boşaltılamaz
      if (answer !== undefined && answer !== current.correctAnswer) changedKey = true
      await prisma.examQuestion.update({
        where: { id: q.id },
        data: {
          ...(answer !== undefined && { correctAnswer: answer }),
          ...(q.outcomeId !== undefined && { outcomeId: q.outcomeId || null }),
        },
      })
    }
  } else {
    const { questionId, correctAnswer, outcomeId } = body
    if (!questionId) return NextResponse.json({ error: "questionId gerekli" }, { status: 400 })
    const current = await prisma.examQuestion.findFirst({ where: { id: questionId, examId } })
    if (!current) return NextResponse.json({ error: "Soru bulunamadı" }, { status: 404 })
    const answer = correctAnswer !== undefined ? cleanAnswer(correctAnswer) : undefined
    if (inScanStage && answer === null) {
      return NextResponse.json({ error: "Okutma aşamasında anahtar boşaltılamaz" }, { status: 409 })
    }
    if (answer !== undefined && answer !== current.correctAnswer) changedKey = true
    await prisma.examQuestion.update({
      where: { id: questionId },
      data: {
        ...(answer !== undefined && { correctAnswer: answer }),
        ...(outcomeId !== undefined && { outcomeId: outcomeId || null }),
      },
    })
  }

  let rescored = 0
  if (changedKey && inScanStage) {
    await prisma.exam.update({ where: { id: examId }, data: { definitionVersion: { increment: 1 } } })
    rescored = await rescoreExam(examId, actor.staffId)
  }

  return NextResponse.json({ success: true, rescored })
}
