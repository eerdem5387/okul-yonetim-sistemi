import type { QuestionAnswerInput, ScanBatchItemInput } from "./types"
import { normalizeTc } from "./validation"

export type DeviceTxtAnswerBlock = {
  index: number
  startQuestion: number
  blockLength: number
  activeLength: number
}

export type DeviceTxtLayout = {
  id: string
  type?: string
  delimiter?: string
  expectedLineLength?: number
  encoding?: string[]
  questionCount?: number
  options?: string[]
  fields: {
    formFlag?: { index: number }
    studentNumber?: { index: number }
    firstName?: { index: number }
    lastName?: { index: number }
    tcNumber?: { index: number }
    bookletCode?: { index: number }
    bookletVariant?: { index: number }
    answerBlocks: DeviceTxtAnswerBlock[]
  }
}

export type ParsedDeviceTxtRow = {
  lineNumber: number
  studentNumber: string | null
  firstName: string
  lastName: string
  studentNameRaw: string
  tcNumber: string | null
  bookletVariant: string | null
  bookletCode: string | null
  answers: QuestionAnswerInput[]
  rawLine: string
  parseWarnings: string[]
}

export type ParseDeviceTxtResult = {
  rows: ParsedDeviceTxtRow[]
  skippedEmptyLines: number
  encodingUsed: string
  layoutId: string
}

const DEFAULT_LAYOUT: DeviceTxtLayout = {
  id: "device-txt-v1",
  type: "device_txt",
  delimiter: "\\",
  expectedLineLength: 269,
  questionCount: 120,
  options: ["A", "B", "C", "D", "E"],
  fields: {
    formFlag: { index: 0 },
    studentNumber: { index: 1 },
    firstName: { index: 2 },
    lastName: { index: 3 },
    tcNumber: { index: 5 },
    bookletCode: { index: 7 },
    bookletVariant: { index: 8 },
    answerBlocks: [
      { index: 9, startQuestion: 1, blockLength: 50, activeLength: 40 },
      { index: 10, startQuestion: 41, blockLength: 50, activeLength: 20 },
      { index: 11, startQuestion: 61, blockLength: 50, activeLength: 40 },
      { index: 12, startQuestion: 101, blockLength: 50, activeLength: 20 },
    ],
  },
}

const VALID_OPTIONS = new Set(["A", "B", "C", "D", "E"])

function fieldAt(parts: string[], index: number | undefined): string {
  if (index == null || index < 0 || index >= parts.length) return ""
  return parts[index] ?? ""
}

function cleanName(raw: string): string {
  return raw
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeBooklet(raw: string): string | null {
  const t = raw.trim().toUpperCase()
  if (!t) return null
  // "2A" / "2B" / "A" → son harf kitapçık
  const letter = t.replace(/[^A-E]/g, "")
  if (letter.length === 1) return letter
  if (/^[A-E]$/.test(t.slice(-1))) return t.slice(-1)
  return t
}

function decodeBytes(bytes: Uint8Array, preferred?: string): { text: string; encodingUsed: string } {
  const order = [
    preferred,
    "windows-1254",
    "utf-8",
    "latin1",
  ].filter(Boolean) as string[]

  for (const enc of order) {
    try {
      const text = new TextDecoder(enc, { fatal: enc === "utf-8" }).decode(bytes)
      // CP1254 / Turkish: common mojibake check — if utf-8 fatal fails we try others
      if (enc === "utf-8" && text.includes("\uFFFD")) continue
      return { text, encodingUsed: enc }
    } catch {
      // try next
    }
  }
  return { text: new TextDecoder("latin1").decode(bytes), encodingUsed: "latin1" }
}

export function layoutFromJson(raw: unknown): DeviceTxtLayout {
  if (!raw || typeof raw !== "object") return DEFAULT_LAYOUT
  const obj = raw as Partial<DeviceTxtLayout>
  if (obj.type && obj.type !== "device_txt") {
    // Görüntü OMR şablonu — cihaz TXT varsayılanına düş
    return DEFAULT_LAYOUT
  }
  if (!obj.fields?.answerBlocks?.length) return DEFAULT_LAYOUT
  return {
    ...DEFAULT_LAYOUT,
    ...obj,
    fields: {
      ...DEFAULT_LAYOUT.fields,
      ...obj.fields,
      answerBlocks: obj.fields.answerBlocks,
    },
  }
}

function parseAnswerBlocks(
  parts: string[],
  blocks: DeviceTxtAnswerBlock[],
  options: Set<string>
): { answers: QuestionAnswerInput[]; warnings: string[] } {
  const answers: QuestionAnswerInput[] = []
  const warnings: string[] = []

  for (const block of blocks) {
    const raw = fieldAt(parts, block.index)
    const slice = raw.slice(0, block.activeLength)
    for (let i = 0; i < block.activeLength; i++) {
      const ch = (slice[i] ?? " ").toUpperCase()
      const questionNo = block.startQuestion + i
      if (!ch.trim()) {
        answers.push({
          questionNo,
          givenAnswer: null,
          isBlank: true,
          isAmbiguous: false,
        })
        continue
      }
      if (!options.has(ch)) {
        warnings.push(`Soru ${questionNo}: geçersiz işaret '${ch}'`)
        answers.push({
          questionNo,
          givenAnswer: ch,
          isBlank: false,
          isAmbiguous: true,
        })
        continue
      }
      answers.push({
        questionNo,
        givenAnswer: ch,
        isBlank: false,
        isAmbiguous: false,
      })
    }
  }

  answers.sort((a, b) => a.questionNo - b.questionNo)
  return { answers, warnings }
}

export function parseDeviceTxtLine(
  line: string,
  lineNumber: number,
  layout: DeviceTxtLayout = DEFAULT_LAYOUT
): ParsedDeviceTxtRow | null {
  const trimmed = line.replace(/\r$/, "")
  if (!trimmed.trim()) return null

  const delimiter = layout.delimiter ?? "\\"
  const parts = trimmed.split(delimiter)
  const warnings: string[] = []

  if (layout.expectedLineLength && trimmed.length !== layout.expectedLineLength) {
    warnings.push(
      `Satır uzunluğu ${trimmed.length} (beklenen ${layout.expectedLineLength})`
    )
  }

  const firstName = cleanName(fieldAt(parts, layout.fields.firstName?.index))
  const lastName = cleanName(fieldAt(parts, layout.fields.lastName?.index))
  const studentNumber = fieldAt(parts, layout.fields.studentNumber?.index).trim() || null
  const tcRaw = fieldAt(parts, layout.fields.tcNumber?.index)
  const tcNumber = normalizeTc(tcRaw)
  if (tcRaw.trim() && !tcNumber) {
    warnings.push("TC alanı dolu ama 11 haneli değil")
  }

  const bookletVariant = normalizeBooklet(
    fieldAt(parts, layout.fields.bookletVariant?.index)
  )
  const bookletCode = fieldAt(parts, layout.fields.bookletCode?.index).trim() || null

  const optionSet = new Set(
    (layout.options ?? ["A", "B", "C", "D", "E"]).map((o) => o.toUpperCase())
  )
  for (const o of VALID_OPTIONS) optionSet.add(o)

  const { answers, warnings: ansWarnings } = parseAnswerBlocks(
    parts,
    layout.fields.answerBlocks,
    optionSet
  )
  warnings.push(...ansWarnings)

  const nameParts = [firstName, lastName].filter(Boolean)
  const studentNameRaw = nameParts.join(" ").trim()

  return {
    lineNumber,
    studentNumber,
    firstName,
    lastName,
    studentNameRaw,
    tcNumber,
    bookletVariant,
    bookletCode,
    answers,
    rawLine: trimmed,
    parseWarnings: warnings,
  }
}

export function parseDeviceTxtContent(
  input: { text?: string; bytes?: Uint8Array; encoding?: string },
  layout: DeviceTxtLayout = DEFAULT_LAYOUT
): ParseDeviceTxtResult {
  let text: string
  let encodingUsed: string

  if (input.bytes) {
    const decoded = decodeBytes(input.bytes, input.encoding)
    text = decoded.text
    encodingUsed = decoded.encodingUsed
  } else if (input.text != null) {
    text = input.text
    encodingUsed = input.encoding ?? "utf-8"
  } else {
    throw new Error("text veya bytes gerekli")
  }

  // BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const lines = text.split(/\r?\n/)
  const rows: ParsedDeviceTxtRow[] = []
  let skippedEmptyLines = 0

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseDeviceTxtLine(lines[i], i + 1, layout)
    if (!parsed) {
      skippedEmptyLines++
      continue
    }
    // Kimlik ve cevap tamamen boş satırları atla
    const hasIdentity = Boolean(parsed.studentNameRaw || parsed.tcNumber || parsed.studentNumber)
    const hasAnyMark = parsed.answers.some((a) => !a.isBlank)
    if (!hasIdentity && !hasAnyMark) {
      skippedEmptyLines++
      continue
    }
    rows.push(parsed)
  }

  return {
    rows,
    skippedEmptyLines,
    encodingUsed,
    layoutId: layout.id,
  }
}

/** Parse sonucunu scan-batch item girdilerine çevirir. */
export function deviceTxtRowsToBatchItems(
  rows: ParsedDeviceTxtRow[]
): ScanBatchItemInput[] {
  return rows.map((row, idx) => {
    const errorCodes: string[] = []
    if (!row.tcNumber) errorCodes.push("TC_MISSING")
    if (row.parseWarnings.some((w) => w.includes("geçersiz işaret"))) {
      errorCodes.push("AMBIGUOUS_ANSWER")
    }
    for (const w of row.parseWarnings) {
      if (w.includes("TC alanı")) errorCodes.push("TC_INVALID")
    }

    const nameLabel = row.studentNumber
      ? `[${row.studentNumber}] ${row.studentNameRaw}`.trim()
      : row.studentNameRaw

    return {
      itemIndex: idx,
      tcNumber: row.tcNumber,
      studentNameRaw: nameLabel || null,
      bookletVariant: row.bookletVariant,
      answers: row.answers,
      matchStatus: row.tcNumber ? "MATCHED" : "UNMATCHED",
      confidenceScore: 1,
      errorCodes,
    }
  })
}

export { DEFAULT_LAYOUT as DEVICE_TXT_V1_LAYOUT }
