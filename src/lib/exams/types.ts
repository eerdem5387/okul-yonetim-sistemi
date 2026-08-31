import type {
  ExamScanMatchStatus,
  ExamStatus,
} from "@prisma/client"

export type { ExamStatus, ExamScanMatchStatus }

export type QuestionAnswerInput = {
  questionNo: number
  givenAnswer?: string | null
  isBlank: boolean
  isAmbiguous: boolean
}

export type ScanBatchItemInput = {
  itemIndex: number
  tcNumber?: string | null
  studentNameRaw?: string | null
  studentId?: string | null
  bookletVariant?: string | null
  answers: QuestionAnswerInput[]
  matchStatus: ExamScanMatchStatus
  confidenceScore?: number | null
  errorCodes?: string[]
}

export type ScanBatchSubmitInput = {
  batchId: string
  definitionVersion: number
  templateId: string
  operatorNote?: string | null
  items: ScanBatchItemInput[]
}

export type ExamReadinessCheck = {
  ready: boolean
  issues: string[]
  sectionCount: number
  questionCount: number
  questionsWithOutcome: number
  questionsWithKey: number
  templateQuestionCount: number | null
}
