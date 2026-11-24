import { prisma } from "@/lib/prisma"
import { isBaseVariant } from "./scoring"

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

  // Cevap → soru: kayıtlı questionId (kitapçığa göre doğru soru), yoksa A/kitapçıksız soru numarası
  const questionById = new Map(exam.questions.map((q) => [q.id, q]))
  const baseByNo = new Map(
    exam.questions.filter((q) => isBaseVariant(q.bookletVariant)).map((q) => [q.questionNo, q])
  )
  const questionOf = (ans: { questionId: string | null; questionNo: number }) =>
    (ans.questionId ? questionById.get(ans.questionId) : undefined) ?? baseByNo.get(ans.questionNo)

  for (const result of exam.results) {
    for (const ans of result.answers) {
      const q = questionOf(ans)
      if (!q?.outcomeId) continue
      const stat = outcomeStats.get(q.outcomeId)
      if (!stat) continue
      stat.total++
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
      const q = questionOf(ans)
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
      for (const ans of result.answers) {
        if (questionOf(ans)?.id !== q.id) continue
        if (ans.isBlank) continue
        total++
        if (ans.isCorrect) correct++
      }
    }
    return {
      questionNo: q.questionNo,
      bookletVariant: q.bookletVariant,
      outcomeId: q.outcomeId,
      pValue: total > 0 ? correct / total : null,
      totalAnswered: total,
    }
  })

  // Ders bazlı ve genel ortalamalar (sonuçlardaki scores.sections)
  const sectionTotals = new Map<string, { net: number; count: number }>()
  let netSum = 0
  for (const result of exam.results) {
    netSum += result.netScore ?? 0
    const sections = ((result.scores as { sections?: Array<{ name: string; net: number }> } | null)?.sections ?? [])
    for (const sec of sections) {
      const cur = sectionTotals.get(sec.name) ?? { net: 0, count: 0 }
      cur.net += sec.net
      cur.count++
      sectionTotals.set(sec.name, cur)
    }
  }
  const averageNet = exam.results.length ? Math.round((netSum / exam.results.length) * 100) / 100 : null
  const sectionAverages = [...sectionTotals.entries()].map(([name, t]) => ({
    name,
    averageNet: Math.round((t.net / t.count) * 100) / 100,
  }))

  return {
    examId: exam.id,
    examName: exam.name,
    status: exam.status,
    participantCount: exam.results.length,
    expectedParticipantCount: exam.expectedParticipantCount,
    outcomeSummary,
    studentWeakness,
    questionAnalysis,
    averageNet,
    sectionAverages,
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
