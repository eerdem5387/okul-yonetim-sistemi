import type { Exam, ExamQuestion, ExamScanTemplate, ExamSection } from "@prisma/client"
import type { ExamReadinessCheck } from "./types"

type ExamWithRelations = Exam & {
  sections: ExamSection[]
  questions: ExamQuestion[]
  scanTemplate: ExamScanTemplate | null
}

export function evaluateExamReadiness(exam: ExamWithRelations): ExamReadinessCheck {
  const issues: string[] = []
  const sectionCount = exam.sections.length
  const questionCount = exam.questions.length
  const questionsWithOutcome = exam.questions.filter((q) => q.outcomeId).length
  const questionsWithKey = exam.questions.filter((q) => q.correctAnswer).length
  const templateQuestionCount = exam.scanTemplate?.questionCount ?? null

  if (sectionCount === 0) issues.push("En az bir bölüm tanımlanmalı.")
  if (questionCount === 0) issues.push("En az bir soru tanımlanmalı.")
  if (questionsWithOutcome < questionCount) {
    issues.push(`${questionCount - questionsWithOutcome} soruda kazanım eksik.`)
  }
  if (questionsWithKey < questionCount) {
    issues.push(`${questionCount - questionsWithKey} soruda cevap anahtarı eksik.`)
  }
  if (!exam.scanTemplateId && !exam.templateId) {
    issues.push("Optik şablon seçilmeli.")
  }
  if (templateQuestionCount != null && templateQuestionCount !== questionCount) {
    issues.push(
      `Şablon soru sayısı (${templateQuestionCount}) ile tanımlı soru sayısı (${questionCount}) uyuşmuyor.`
    )
  }

  return {
    ready: issues.length === 0,
    issues,
    sectionCount,
    questionCount,
    questionsWithOutcome,
    questionsWithKey,
    templateQuestionCount,
  }
}

export function normalizeTc(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  return digits.length === 11 ? digits : null
}

export function nameSimilarity(a: string, b: string): number {
  const na = a.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim()
  const nb = b.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim()
  if (!na || !nb) return 0
  if (na === nb) return 1
  const longer = na.length > nb.length ? na : nb
  const shorter = na.length > nb.length ? nb : na
  if (longer.includes(shorter)) return shorter.length / longer.length
  return 0.5
}
