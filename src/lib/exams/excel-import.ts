/**
 * Cihaz TXT / Excel satırlarından sınav kazanım ve cevap anahtarı içe aktarma.
 */
import * as XLSX from "xlsx"
import { prisma } from "@/lib/prisma"

export type OutcomeImportRow = {
  code?: string | null
  subject: string
  topic: string
  learningOutcome: string
}

export type AnswerKeyImportRow = {
  questionNo: number
  correctAnswer: string
  outcomeCode?: string | null
  bookletVariant?: string | null
}

function sheetToObjects(workbook: XLSX.WorkBook, sheetName?: string): Record<string, unknown>[] {
  const name = sheetName ?? workbook.SheetNames[0]
  const sheet = workbook.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
}

function normalizeHeaderKey(key: string): string {
  return key
    .toString()
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "")
    .replace(/_/g, "")
}

function pick(row: Record<string, unknown>, aliases: string[]): string {
  const map = new Map<string, unknown>()
  for (const [k, v] of Object.entries(row)) {
    map.set(normalizeHeaderKey(k), v)
  }
  for (const a of aliases) {
    const v = map.get(normalizeHeaderKey(a))
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

export function parseOutcomesFromRows(rows: Record<string, unknown>[]): OutcomeImportRow[] {
  const out: OutcomeImportRow[] = []
  for (const row of rows) {
    const subject = pick(row, ["subject", "ders", "branş", "brans"])
    const topic = pick(row, ["topic", "konu"])
    const learningOutcome = pick(row, [
      "learningOutcome",
      "learningoutcome",
      "kazanım",
      "kazanim",
      "kazanımmetni",
      "kazanimmetni",
    ])
    if (!subject || !topic || !learningOutcome) continue
    const code = pick(row, ["code", "kod", "kazanımkodu", "kazanimkodu"]) || null
    out.push({ code, subject, topic, learningOutcome })
  }
  return out
}

export function parseAnswerKeysFromRows(rows: Record<string, unknown>[]): AnswerKeyImportRow[] {
  const out: AnswerKeyImportRow[] = []
  for (const row of rows) {
    const qRaw = pick(row, ["questionNo", "questionno", "soruno", "no", "soru"])
    const questionNo = Number(qRaw)
    if (!Number.isFinite(questionNo) || questionNo < 1) continue
    const correctAnswer = pick(row, [
      "correctAnswer",
      "correctanswer",
      "cevap",
      "doğrucevap",
      "dogrucevap",
      "anahtar",
    ])
      .toUpperCase()
      .slice(0, 1)
    if (!correctAnswer || !/^[A-E]$/.test(correctAnswer)) continue
    const outcomeCode =
      pick(row, ["outcomeCode", "outcomecode", "kazanımkodu", "kazanimkodu", "kod"]) || null
    const bookletVariant =
      pick(row, ["bookletVariant", "bookletvariant", "kitapçık", "kitapcik"]) || null
    out.push({
      questionNo,
      correctAnswer,
      outcomeCode,
      bookletVariant: bookletVariant ? bookletVariant.toUpperCase().slice(0, 1) : null,
    })
  }
  return out
}

export function parseTabularFile(params: {
  csvText?: string
  contentBase64?: string
  fileName?: string
}): Record<string, unknown>[] {
  if (params.csvText != null && params.csvText.trim()) {
    const wb = XLSX.read(params.csvText, { type: "string" })
    return sheetToObjects(wb)
  }
  if (params.contentBase64) {
    const buf = Buffer.from(params.contentBase64, "base64")
    const name = (params.fileName ?? "").toLowerCase()
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      const text = buf.toString("utf-8")
      const wb = XLSX.read(text, { type: "string" })
      return sheetToObjects(wb)
    }
    const wb = XLSX.read(buf, { type: "buffer" })
    return sheetToObjects(wb)
  }
  throw new Error("csvText veya contentBase64 gerekli")
}

export async function importExamOutcomes(examId: string, rows: OutcomeImportRow[]) {
  const created = []
  const existingCount = await prisma.examOutcome.count({ where: { examId } })
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const o = await prisma.examOutcome.create({
      data: {
        examId,
        code: row.code ?? null,
        subject: row.subject,
        topic: row.topic,
        learningOutcome: row.learningOutcome,
        sortOrder: existingCount + i,
      },
    })
    created.push(o)
  }
  return created
}

export async function importExamAnswerKeys(examId: string, rows: AnswerKeyImportRow[]) {
  const outcomes = await prisma.examOutcome.findMany({ where: { examId } })
  const byCode = new Map(
    outcomes
      .filter((o) => o.code)
      .map((o) => [o.code!.trim().toLocaleUpperCase("tr-TR"), o.id])
  )

  const questions = await prisma.examQuestion.findMany({ where: { examId } })
  const byNo = new Map(questions.map((q) => [q.questionNo, q]))

  let updated = 0
  let skipped = 0
  const missingQuestions: number[] = []
  const missingOutcomeCodes: string[] = []

  for (const row of rows) {
    const q = byNo.get(row.questionNo)
    if (!q) {
      missingQuestions.push(row.questionNo)
      skipped++
      continue
    }
    let outcomeId: string | null | undefined = undefined
    if (row.outcomeCode) {
      const id = byCode.get(row.outcomeCode.trim().toLocaleUpperCase("tr-TR"))
      if (!id) {
        missingOutcomeCodes.push(row.outcomeCode)
      } else {
        outcomeId = id
      }
    }
    await prisma.examQuestion.update({
      where: { id: q.id },
      data: {
        correctAnswer: row.correctAnswer,
        ...(outcomeId !== undefined && { outcomeId }),
        ...(row.bookletVariant != null && { bookletVariant: row.bookletVariant }),
      },
    })
    updated++
  }

  return {
    updated,
    skipped,
    missingQuestions: [...new Set(missingQuestions)],
    missingOutcomeCodes: [...new Set(missingOutcomeCodes)],
  }
}
