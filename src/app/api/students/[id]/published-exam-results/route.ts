import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const WEAK_THRESHOLD = 0.5

/**
 * GET /api/students/[id]/published-exam-results
 * Veli/öğretmen için yayınlanmış sınav sonuçları + zayıf kazanımlar
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await context.params

    const results = await prisma.examResult.findMany({
      where: {
        studentId,
        exam: { status: "PUBLISHED" },
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
            examDate: true,
            grade: true,
            class: { select: { name: true } },
          },
        },
        answers: {
          include: {
            question: {
              include: { outcome: true },
            },
          },
        },
      },
      orderBy: { exam: { examDate: "desc" } },
    })

    const enriched = results.map((result) => {
      const byOutcome = new Map<
        string,
        { subject: string; topic: string; learningOutcome: string; total: number; correct: number }
      >()

      for (const ans of result.answers) {
        const o = ans.question?.outcome
        if (!o) continue
        const cur = byOutcome.get(o.id) ?? {
          subject: o.subject,
          topic: o.topic,
          learningOutcome: o.learningOutcome,
          total: 0,
          correct: 0,
        }
        cur.total++
        if (ans.isCorrect) cur.correct++
        byOutcome.set(o.id, cur)
      }

      const weakOutcomes = [...byOutcome.values()]
        .map((s) => ({ ...s, rate: s.correct / s.total }))
        .filter((s) => s.rate < WEAK_THRESHOLD)
        .sort((a, b) => a.rate - b.rate)

      return {
        id: result.id,
        totalScore: result.totalScore,
        netScore: result.netScore,
        correctCount: result.correctCount,
        wrongCount: result.wrongCount,
        blankCount: result.blankCount,
        ranking: result.ranking,
        percentile: result.percentile,
        notes: result.notes,
        exam: result.exam,
        weakOutcomes: weakOutcomes.map((w) => ({
          subject: w.subject,
          topic: w.topic,
          learningOutcome: w.learningOutcome,
          rate: w.rate,
        })),
      }
    })

    return NextResponse.json({ results: enriched })
  } catch (error) {
    console.error("Error fetching published exam results:", error)
    return NextResponse.json({ error: "Sonuçlar alınırken hata oluştu" }, { status: 500 })
  }
}
