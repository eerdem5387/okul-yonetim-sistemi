import type { QuestionAnswerInput } from "./types"

export type QuestionKey = {
  questionNo: number
  correctAnswer: string | null
  bookletVariant?: string | null
}

export type ScoredAnswer = QuestionAnswerInput & {
  isCorrect: boolean | null
}

export type ScoreSummary = {
  correctCount: number
  wrongCount: number
  blankCount: number
  ambiguousCount: number
  netScore: number
  answers: ScoredAnswer[]
}

/** 4 yanlış 1 doğruyu götürür (standart LGS/YKS deneme). */
export function computeNet(correct: number, wrong: number, wrongPenalty = 0.25): number {
  return Math.max(0, correct - wrong * wrongPenalty)
}

export function scoreAnswers(
  answers: QuestionAnswerInput[],
  keys: QuestionKey[],
  bookletVariant?: string | null
): ScoreSummary {
  const keyMap = new Map<number, string | null>()
  for (const k of keys) {
    if (bookletVariant && k.bookletVariant && k.bookletVariant !== bookletVariant) continue
    if (!keyMap.has(k.questionNo)) {
      keyMap.set(k.questionNo, k.correctAnswer)
    }
  }

  let correctCount = 0
  let wrongCount = 0
  let blankCount = 0
  let ambiguousCount = 0

  const scored: ScoredAnswer[] = answers.map((a) => {
    if (a.isAmbiguous) {
      ambiguousCount++
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

  return {
    correctCount,
    wrongCount,
    blankCount,
    ambiguousCount,
    netScore: computeNet(correctCount, wrongCount),
    answers: scored,
  }
}
