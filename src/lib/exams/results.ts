import type { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { QuestionAnswerInput } from "./types"
import {
  isBaseVariant,
  normalizeBookletVariant,
  scoreAnswers,
  scoresJson,
  scoringRuleFor,
  type QuestionKey,
  type ScoringRule,
  type SectionRange,
} from "./scoring"

type Db = PrismaClient | Prisma.TransactionClient

/** Okutma işlemleri için uzun işlem süresi (varsayılan 5 sn büyük sınıflarda yetmez). */
export const SCAN_TX_OPTIONS = { maxWait: 10_000, timeout: 120_000 } as const

export type ScoringContext = {
  examId: string
  definitionVersion: number
  rule: ScoringRule
  keys: QuestionKey[]
  sections: SectionRange[]
  questionIdFor: (questionNo: number, bookletVariant: string | null) => string | null
}

export async function loadScoringContext(db: Db, examId: string): Promise<ScoringContext | null> {
  const exam = await db.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      examType: true,
      grade: true,
      definitionVersion: true,
      questions: { select: { id: true, questionNo: true, correctAnswer: true, bookletVariant: true } },
      sections: { select: { name: true, questionStart: true, questionEnd: true }, orderBy: { sortOrder: "asc" } },
    },
  })
  if (!exam) return null

  const base = new Map<number, string>()
  const byVariant = new Map<string, string>()
  for (const q of exam.questions) {
    if (isBaseVariant(q.bookletVariant)) {
      if (!base.has(q.questionNo)) base.set(q.questionNo, q.id)
    } else {
      byVariant.set(`${normalizeBookletVariant(q.bookletVariant)}:${q.questionNo}`, q.id)
    }
  }

  return {
    examId: exam.id,
    definitionVersion: exam.definitionVersion,
    rule: scoringRuleFor(exam),
    keys: exam.questions.map((q) => ({
      questionNo: q.questionNo,
      correctAnswer: q.correctAnswer,
      bookletVariant: q.bookletVariant,
    })),
    sections: [...exam.sections].sort((a, b) => a.questionStart - b.questionStart),
    questionIdFor: (questionNo, bookletVariant) => {
      const v = normalizeBookletVariant(bookletVariant)
      if (v && v !== "A") {
        const alt = byVariant.get(`${v}:${questionNo}`)
        if (alt) return alt
      }
      return base.get(questionNo) ?? null
    },
  }
}

export type ResultInput = {
  studentId: string
  bookletVariant: string | null
  answers: QuestionAnswerInput[]
}

/**
 * Öğrenci sonuçlarını toplu yazar: sonuç başına bir upsert, tüm cevaplar tek `createMany`.
 * Dönen harita: studentId → examResultId.
 */
export async function writeExamResults(
  db: Db,
  ctx: ScoringContext,
  rows: ResultInput[],
  operatorId: string
): Promise<Map<string, string>> {
  const resultIds = new Map<string, string>()
  const answerRows: Prisma.ExamResultAnswerCreateManyInput[] = []

  for (const row of rows) {
    const score = scoreAnswers(row.answers, ctx.keys, row.bookletVariant, ctx.rule, ctx.sections)
    const data = {
      definitionVersion: ctx.definitionVersion,
      bookletVariant: row.bookletVariant,
      scores: scoresJson(score, ctx.rule) as Prisma.InputJsonValue,
      totalScore: score.netScore,
      correctCount: score.correctCount,
      wrongCount: score.wrongCount,
      blankCount: score.blankCount,
      netScore: score.netScore,
      enteredById: operatorId,
    }
    const result = await db.examResult.upsert({
      where: { examId_studentId: { examId: ctx.examId, studentId: row.studentId } },
      create: { examId: ctx.examId, studentId: row.studentId, ...data },
      update: data,
      select: { id: true },
    })
    resultIds.set(row.studentId, result.id)
    for (const ans of score.answers) {
      answerRows.push({
        examResultId: result.id,
        questionId: ctx.questionIdFor(ans.questionNo, row.bookletVariant),
        questionNo: ans.questionNo,
        givenAnswer: ans.givenAnswer ?? null,
        isCorrect: ans.isCorrect,
        isBlank: ans.isBlank,
        isAmbiguous: ans.isAmbiguous,
      })
    }
  }

  const ids = [...resultIds.values()]
  if (ids.length > 0) {
    await db.examResultAnswer.deleteMany({ where: { examResultId: { in: ids } } })
    // Önceki okutmanın kağıdı aynı sonuca bağlıysa bağlantıyı bırak (tek kağıt ↔ tek sonuç)
    await db.examScanBatchItem.updateMany({
      where: { examResultId: { in: ids } },
      data: { examResultId: null },
    })
  }
  for (let i = 0; i < answerRows.length; i += 5000) {
    await db.examResultAnswer.createMany({ data: answerRows.slice(i, i + 5000) })
  }
  return resultIds
}

/** Sınav içi sıralama (aynı net = aynı sıra) ve yüzdelik dilim (ilk %X). */
export async function recomputeRankings(db: Db, examId: string): Promise<void> {
  await db.$executeRaw`
    UPDATE "exam_results" AS r
    SET "ranking" = s.rk, "percentile" = s.pct
    FROM (
      SELECT "id",
             RANK() OVER (ORDER BY "netScore" DESC NULLS LAST) AS rk,
             ROUND((100.0 * RANK() OVER (ORDER BY "netScore" DESC NULLS LAST) / COUNT(*) OVER ())::numeric, 1)::float AS pct
      FROM "exam_results"
      WHERE "examId" = ${examId}
    ) AS s
    WHERE r."id" = s."id"
  `
}

/**
 * Cevap anahtarı / kitapçık anahtarı değişince mevcut sonuçları kayıtlı cevaplardan yeniden hesaplar.
 * Dönen sayı: yeniden puanlanan öğrenci.
 */
export async function rescoreExam(examId: string, operatorId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const ctx = await loadScoringContext(tx, examId)
    if (!ctx) return 0
    const results = await tx.examResult.findMany({
      where: { examId },
      select: {
        studentId: true,
        bookletVariant: true,
        answers: { select: { questionNo: true, givenAnswer: true, isBlank: true, isAmbiguous: true } },
      },
    })
    const rows: ResultInput[] = results
      .filter((r) => r.answers.length > 0)
      .map((r) => ({
        studentId: r.studentId,
        bookletVariant: r.bookletVariant,
        answers: r.answers
          .map((a) => ({ questionNo: a.questionNo, givenAnswer: a.givenAnswer, isBlank: a.isBlank, isAmbiguous: a.isAmbiguous }))
          .sort((a, b) => a.questionNo - b.questionNo),
      }))
    const kept = await tx.examScanBatchItem.findMany({
      where: { examResult: { examId } },
      select: { id: true, examResult: { select: { studentId: true } } },
    })
    const ids = await writeExamResults(tx, ctx, rows, operatorId)
    // Kağıt ↔ sonuç bağlantılarını geri kur
    for (const item of kept) {
      const sid = item.examResult?.studentId
      const resultId = sid ? ids.get(sid) : undefined
      if (resultId) await tx.examScanBatchItem.update({ where: { id: item.id }, data: { examResultId: resultId } })
    }
    await recomputeRankings(tx, examId)
    return rows.length
  }, SCAN_TX_OPTIONS)
}
