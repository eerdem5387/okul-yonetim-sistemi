import type { QuestionAnswerInput } from "./types"

export type QuestionKey = {
  questionNo: number
  correctAnswer: string | null
  bookletVariant?: string | null
}

export type SectionRange = {
  name: string
  questionStart: number
  questionEnd: number
}

export type ScoredAnswer = QuestionAnswerInput & {
  isCorrect: boolean | null
}

export type SectionScore = {
  name: string
  correct: number
  wrong: number
  blank: number
  net: number
}

export type ScoreSummary = {
  correctCount: number
  wrongCount: number
  blankCount: number
  ambiguousCount: number
  netScore: number
  sections: SectionScore[]
  answers: ScoredAnswer[]
}

/**
 * Net kuralı.
 * - LGS ve ortaokul (5–8) denemeleri: 3 yanlış 1 doğruyu götürür.
 * - YKS/TYT/AYT ve diğerleri: 4 yanlış 1 doğruyu götürür.
 * - Birden fazla işaretli (çift işaret) soru yanlış sayılır (ÖSYM/MEB uygulaması).
 */
export type ScoringRule = {
  wrongsPerCorrect: number
  ambiguousCountsAsWrong: boolean
}

export function scoringRuleFor(exam: { examType?: string | null; grade?: number | null }): ScoringRule {
  const isMiddleSchool = exam.grade != null && exam.grade >= 5 && exam.grade <= 8
  const isLgs = exam.examType === "LGS" || (isMiddleSchool && exam.examType !== "YKS")
  return { wrongsPerCorrect: isLgs ? 3 : 4, ambiguousCountsAsWrong: true }
}

export function describeScoringRule(rule: ScoringRule): string {
  return `${rule.wrongsPerCorrect} yanlış 1 doğruyu götürür${rule.ambiguousCountsAsWrong ? "; çift işaret yanlış sayılır" : ""}`
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Net = doğru − yanlış ÷ k. Deneme raporlarındaki gibi eksiye düşebilir (ör. 2 doğru 12 yanlış). */
export function computeNet(correct: number, wrong: number, wrongsPerCorrect = 4): number {
  return round2(correct - wrong / wrongsPerCorrect)
}

/** Kitapçık harfini normalize eder ("2B" → "B"); boşsa null. */
export function normalizeBookletVariant(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = raw.trim().toUpperCase()
  if (!t) return null
  const m = t.match(/[A-E](?!.*[A-E])/)
  return m ? m[0] : t
}

/** Ana (A / kitapçıksız) anahtar mı? */
export function isBaseVariant(variant: string | null | undefined): boolean {
  const v = normalizeBookletVariant(variant)
  return v == null || v === "A"
}

/** Sınavda A dışında ayrı anahtarı olan kitapçıklar (ör. ["B"]). */
export function alternateVariants(keys: QuestionKey[]): string[] {
  const set = new Set<string>()
  for (const k of keys) {
    const v = normalizeBookletVariant(k.bookletVariant)
    if (v && v !== "A") set.add(v)
  }
  return [...set].sort()
}

/**
 * Öğrencinin kitapçığına göre soru → doğru cevap haritası.
 * A / kitapçıksız anahtar temel alınır; öğrencinin kitapçığına ait ayrı anahtar varsa onun üzerine yazılır.
 */
export function resolveKeyMap(keys: QuestionKey[], bookletVariant?: string | null): Map<number, string | null> {
  const map = new Map<number, string | null>()
  for (const k of keys) {
    if (isBaseVariant(k.bookletVariant) && !map.has(k.questionNo)) map.set(k.questionNo, k.correctAnswer)
  }
  const variant = normalizeBookletVariant(bookletVariant)
  if (variant && variant !== "A") {
    for (const k of keys) {
      if (normalizeBookletVariant(k.bookletVariant) === variant) map.set(k.questionNo, k.correctAnswer)
    }
  }
  return map
}

export function scoreAnswers(
  answers: QuestionAnswerInput[],
  keys: QuestionKey[],
  bookletVariant?: string | null,
  rule: ScoringRule = { wrongsPerCorrect: 4, ambiguousCountsAsWrong: true },
  sections: SectionRange[] = []
): ScoreSummary {
  const keyMap = resolveKeyMap(keys, bookletVariant)

  let correctCount = 0
  let wrongCount = 0
  let blankCount = 0
  let ambiguousCount = 0

  const scored: ScoredAnswer[] = answers.map((a) => {
    if (a.isAmbiguous) {
      ambiguousCount++
      if (rule.ambiguousCountsAsWrong) {
        wrongCount++
        return { ...a, isCorrect: false }
      }
      return { ...a, isCorrect: null }
    }
    if (a.isBlank || !a.givenAnswer) {
      blankCount++
      return { ...a, isCorrect: null, isBlank: true }
    }
    const expected = keyMap.get(a.questionNo)
    const isCorrect = expected != null && a.givenAnswer.toUpperCase() === expected.toUpperCase()
    if (isCorrect) correctCount++
    else wrongCount++
    return { ...a, isCorrect }
  })

  const sectionScores: SectionScore[] = sections.map((s) => {
    let correct = 0
    let wrong = 0
    let blank = 0
    for (const a of scored) {
      if (a.questionNo < s.questionStart || a.questionNo > s.questionEnd) continue
      if (a.isCorrect === true) correct++
      else if (a.isCorrect === false) wrong++
      else blank++
    }
    return { name: s.name, correct, wrong, blank, net: computeNet(correct, wrong, rule.wrongsPerCorrect) }
  })

  return {
    correctCount,
    wrongCount,
    blankCount,
    ambiguousCount,
    // Toplam net = ders netlerinin toplamı (ekranda görülen ders netleriyle her zaman tutarlı)
    netScore: sectionScores.length
      ? round2(sectionScores.reduce((sum, s) => sum + s.net, 0))
      : computeNet(correctCount, wrongCount, rule.wrongsPerCorrect),
    sections: sectionScores,
    answers: scored,
  }
}

/** ExamResult.scores JSON'u (veli/öğretmen ekranları `summary` ve `sections` okur). */
export function scoresJson(score: ScoreSummary, rule: ScoringRule) {
  return {
    summary: {
      correct: score.correctCount,
      wrong: score.wrongCount,
      blank: score.blankCount,
      ambiguous: score.ambiguousCount,
      net: score.netScore,
    },
    sections: score.sections,
    rule: describeScoringRule(rule),
  }
}
