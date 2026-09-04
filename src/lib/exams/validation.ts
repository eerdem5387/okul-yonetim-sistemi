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

function normalizePersonName(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/^\[[^\]]*\]\s*/, "") // TXT'deki [ogrenciNo] öneki
    .replace(/[^a-zçğıöşü0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Ad-soyad benzerliği (0–1). Token Jaccard + alt dize. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizePersonName(a)
  const nb = normalizePersonName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.replace(/\s/g, "") === nb.replace(/\s/g, "")) return 1

  const ta = new Set(na.split(" ").filter(Boolean))
  const tb = new Set(nb.split(" ").filter(Boolean))
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  const union = new Set([...ta, ...tb]).size
  const jaccard = union > 0 ? inter / union : 0

  const longer = na.length > nb.length ? na : nb
  const shorter = na.length > nb.length ? nb : na
  const contains = longer.includes(shorter) ? shorter.length / longer.length : 0

  return Math.max(jaccard, contains)
}
