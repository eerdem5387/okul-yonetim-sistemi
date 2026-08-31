import { prisma } from "@/lib/prisma"

export type OutcomeWeakness = {
  outcomeId: string
  code: string | null
  subject: string
  topic: string
  learningOutcome: string
  totalQuestions: number
  correctCount: number
  rate: number
}

export type StudentWeakness = {
  studentId: string
  firstName: string
  lastName: string
  grade: string
  weakOutcomes: OutcomeWeakness[]
}

const WEAK_THRESHOLD = 0.5

export async function computeExamAnalytics(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      outcomes: { orderBy: { sortOrder: "asc" } },
      questions: { include: { outcome: true } },
      results: {
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, grade: true },
          },
          answers: true,
        },
      },
    },
  })

  if (!exam) return null

  const outcomeStats = new Map<
    string,
    { outcome: (typeof exam.outcomes)[0]; total: number; correct: number }
  >()

  for (const o of exam.outcomes) {
    outcomeStats.set(o.id, { outcome: o, total: 0, correct: 0 })
  }

  for (const q of exam.questions) {
    if (!q.outcomeId) continue
    const stat = outcomeStats.get(q.outcomeId)
    if (!stat) continue
    stat.total += exam.results.length
  }

  for (const result of exam.results) {
    for (const ans of result.answers) {
      const q = exam.questions.find((qq) => qq.questionNo === ans.questionNo)
      if (!q?.outcomeId) continue
      const stat = outcomeStats.get(q.outcomeId)
      if (!stat) continue
      if (ans.isCorrect) stat.correct++
    }
  }

  const outcomeSummary: OutcomeWeakness[] = [...outcomeStats.values()]
    .filter((s) => s.total > 0)
    .map((s) => ({
      outcomeId: s.outcome.id,
      code: s.outcome.code,
      subject: s.outcome.subject,
      topic: s.outcome.topic,
      learningOutcome: s.outcome.learningOutcome,
      totalQuestions: s.total,
      correctCount: s.correct,
      rate: s.correct / s.total,
    }))
    .sort((a, b) => a.rate - b.rate)

  const studentWeakness: StudentWeakness[] = exam.results.map((result) => {
    const byOutcome = new Map<string, { total: number; correct: number }>()

    for (const ans of result.answers) {
      const q = exam.questions.find((qq) => qq.questionNo === ans.questionNo)
      if (!q?.outcomeId) continue
      const cur = byOutcome.get(q.outcomeId) ?? { total: 0, correct: 0 }
      cur.total++
      if (ans.isCorrect) cur.correct++
      byOutcome.set(q.outcomeId, cur)
    }

    const weakOutcomes: OutcomeWeakness[] = []
    for (const [outcomeId, stat] of byOutcome) {
      const rate = stat.correct / stat.total
      if (rate >= WEAK_THRESHOLD) continue
      const o = exam.outcomes.find((oo) => oo.id === outcomeId)
      if (!o) continue
      weakOutcomes.push({
        outcomeId,
        code: o.code,
        subject: o.subject,
        topic: o.topic,
        learningOutcome: o.learningOutcome,
        totalQuestions: stat.total,
        correctCount: stat.correct,
        rate,
      })
    }

    return {
      studentId: result.student.id,
      firstName: result.student.firstName,
      lastName: result.student.lastName,
      grade: result.student.grade,
      weakOutcomes: weakOutcomes.sort((a, b) => a.rate - b.rate),
    }
  })

  const questionAnalysis = exam.questions.map((q) => {
    let correct = 0
    let total = 0
    for (const result of exam.results) {
      const ans = result.answers.find((a) => a.questionNo === q.questionNo)
      if (!ans || ans.isBlank || ans.isAmbiguous) continue
      total++
      if (ans.isCorrect) correct++
    }
    return {
      questionNo: q.questionNo,
      outcomeId: q.outcomeId,
      pValue: total > 0 ? correct / total : null,
      totalAnswered: total,
    }
  })

  return {
    examId: exam.id,
    examName: exam.name,
    status: exam.status,
    participantCount: exam.results.length,
    expectedParticipantCount: exam.expectedParticipantCount,
    outcomeSummary,
    studentWeakness,
    questionAnalysis,
    weakThreshold: WEAK_THRESHOLD,
  }
}

export function analyticsToCsv(analytics: NonNullable<Awaited<ReturnType<typeof computeExamAnalytics>>>) {
  const lines = [
    "Öğrenci,Sınıf,Kazanım Kodu,Ders,Konu,Kazanım,Doğru,Toplam,Oran",
  ]
  for (const s of analytics.studentWeakness) {
    for (const w of s.weakOutcomes) {
      lines.push(
        [
          `"${s.firstName} ${s.lastName}"`,
          `"${s.grade}"`,
          `"${w.code ?? ""}"`,
          `"${w.subject}"`,
          `"${w.topic}"`,
          `"${w.learningOutcome.replace(/"/g, '""')}"`,
          w.correctCount,
          w.totalQuestions,
          (w.rate * 100).toFixed(1) + "%",
        ].join(",")
      )
    }
  }
  return lines.join("\n")
}
