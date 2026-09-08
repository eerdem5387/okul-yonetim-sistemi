/**
 * Sekonic MarkView .fmt şablon parser’ı.
 * FMT → dahili `sekonic_fmt` layout (TXT alan sırası + cevap blokları).
 */
import { createHash } from "crypto"

export type SekonicFmtFieldKind = "identity" | "separator" | "answers" | "meta"

export type SekonicFmtField = {
  label: string
  kind: SekonicFmtFieldKind
  /** TXT’deki alan indeksi (separator’lar hariç; separator’larda null) */
  txtIndex: number | null
  startCol: number
  endCol: number
  startRow: number
  endRow: number
  mode: string
  direction: string
  charset: string
  gridWidth: number
  gridHeight: number
}

export type SekonicIdentityMap = {
  formFlag?: number
  studentNumber?: number
  firstName?: number
  lastName?: number
  tcNumber?: number
  classCode?: number
  schoolCode?: number
  grade?: number
  section?: number
  bookletVariant?: number
}

export type SekonicAnswerSection = {
  name: string
  txtIndex: number
  optionChars: string
  blockLength: number
  activeLength: number
  startQuestion: number
  endQuestion: number
}

export type SekonicFmtLayout = {
  id: string
  type: "sekonic_fmt"
  publisher: string
  version: string
  label: string
  sourceFmtFileName: string
  sourceFmtHash: string
  formCols: number | null
  formRows: number | null
  encoding: string[]
  delimiter: string
  questionCount: number
  options: string[]
  fields: SekonicFmtField[]
  identityMap: SekonicIdentityMap
  answerSections: SekonicAnswerSection[]
  /** device-txt-parser uyumu için */
  txt: {
    delimiter: string
    encoding: string
    fieldOrder: string[]
  }
  /** device-txt-parser.fields uyumu */
  deviceFields: {
    formFlag?: { index: number }
    studentNumber?: { index: number }
    firstName?: { index: number }
    lastName?: { index: number }
    tcNumber?: { index: number }
    bookletVariant?: { index: number }
    answerBlocks: Array<{
      index: number
      startQuestion: number
      blockLength: number
      activeLength: number
    }>
  }
}

function normalizeLabel(label: string): string {
  return label
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim()
}

function classifyKind(label: string, charset: string, mode: string): SekonicFmtFieldKind {
  if (charset === "\\") return "separator"
  const L = normalizeLabel(label)
  if (!L) return "meta"
  // Cevap blokları: ABCDE / ABCD tarzı
  const opts = charset.replace(/\s+/g, "").toUpperCase()
  if (mode === "K" && /^[A-E]+$/.test(opts) && opts.length >= 4) {
    // Kitapçık A B ayrı
    if (L.includes("KİTAPÇIK") || L.includes("KITAPCIK") || L.includes("BOOKLET")) {
      return "identity"
    }
    return "answers"
  }
  return "identity"
}

function mapIdentityKey(label: string): keyof SekonicIdentityMap | null {
  const L = normalizeLabel(label)
  if (!L) return null
  if (L.includes("TC") && (L.includes("KİMLİK") || L.includes("KIMLIK") || L.includes("NO"))) {
    return "tcNumber"
  }
  if (L.includes("ÖĞRENCİ NO") || L.includes("OGRENCI NO") || L === "ÖĞRENCİNO" || L.includes("OGRENCI NO")) {
    return "studentNumber"
  }
  if (L === "ADI" || L === "AD" || L.includes("AD SOYAD") === false && L.startsWith("ADI")) {
    return "firstName"
  }
  if (L.includes("SOYAD")) return "lastName"
  if (L.includes("KİTAPÇIK") || L.includes("KITAPCIK")) return "bookletVariant"
  if (L.includes("SINAV TÜR") || L.includes("SINAV TUR")) return "formFlag"
  if (L.includes("SINIF KOD")) return "classCode"
  if (L.includes("KURUM") || L.includes("CEPTEL")) return "schoolCode"
  if (L === "SINIF") return "grade"
  if (L.includes("ŞUBE") || L.includes("SUBE")) return "section"
  return null
}

/** TYT benzeri 50’lik pad’li bloklarda aktif soru sayısı tahmini. */
export function estimateActiveLength(sectionName: string, blockLength: number): number {
  const n = normalizeLabel(sectionName)
  if (blockLength === 50) {
    if (n.includes("TR") || n.includes("TÜRK") || n.includes("TURK")) return 40
    if (n.includes("SOSYAL") || n.includes("SOS")) return 20
    if (n.includes("MATEMAT") || n.includes("MAT")) return 40
    if (n.includes("FEN") || n.includes("FİZ") || n.includes("KİMY") || n.includes("BİYO")) return 20
  }
  return blockLength
}

function parseFmtLine(line: string): {
  startCol: number
  endCol: number
  startRow: number
  endRow: number
  mode: string
  direction: string
  charset: string
  label: string
} | null {
  const trimmed = line.replace(/\r$/, "").trimEnd()
  if (!trimmed) return null
  const parts = trimmed.split("=")
  if (parts.length < 7) return null

  const startCol = Number(parts[0])
  const endCol = Number(parts[1])
  const startRow = Number(parts[2])
  const endRow = Number(parts[3])
  if (![startCol, endCol, startRow, endRow].every((n) => Number.isFinite(n))) {
    return null
  }

  const mode = parts[4] ?? ""
  const direction = parts[5] ?? ""
  const charset = parts[6] ?? ""

  let label = ""
  for (const p of parts) {
    const m = p.match(/^X2=\[(.*)\]$/) || p.match(/^\[(.*)\]$/)
    if (m) {
      label = m[1]
      break
    }
  }

  return { startCol, endCol, startRow, endRow, mode, direction, charset, label }
}

export function parseSekonicFmt(params: {
  text?: string
  bytes?: Uint8Array
  fileName?: string
  publisher?: string
  templateKey?: string
}): SekonicFmtLayout {
  let text: string
  if (params.bytes) {
    text = new TextDecoder("windows-1254").decode(params.bytes)
  } else if (params.text != null) {
    text = params.text
  } else {
    throw new Error("FMT text veya bytes gerekli")
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const lines = text.split(/\r?\n/)
  let formCols: number | null = null
  let formRows: number | null = null

  // İlk satır bazen form boyutu: 64=46=04=D=*= =
  const first = lines[0]?.split("=") ?? []
  if (first.length >= 2 && Number.isFinite(Number(first[0])) && Number.isFinite(Number(first[1]))) {
    const maybeMode = first[4]
    if (maybeMode === "D" || maybeMode === "*") {
      formCols = Number(first[0])
      formRows = Number(first[1])
    }
  }

  const fields: SekonicFmtField[] = []
  let txtIndex = 0
  for (const line of lines) {
    const parsed = parseFmtLine(line)
    if (!parsed) continue
    // Form header satırını atla (label yok + mode D)
    if (!parsed.label && parsed.mode === "D" && formCols === parsed.startCol) continue

    const kind = classifyKind(parsed.label, parsed.charset, parsed.mode)
    const gridWidth = parsed.endCol - parsed.startCol + 1
    const gridHeight = parsed.endRow - parsed.startRow + 1
    const field: SekonicFmtField = {
      label: parsed.label,
      kind,
      txtIndex: kind === "separator" ? null : txtIndex,
      startCol: parsed.startCol,
      endCol: parsed.endCol,
      startRow: parsed.startRow,
      endRow: parsed.endRow,
      mode: parsed.mode,
      direction: parsed.direction,
      charset: parsed.charset,
      gridWidth,
      gridHeight,
    }
    if (kind !== "separator") txtIndex++
    fields.push(field)
  }

  const identityMap: SekonicIdentityMap = {}
  for (const f of fields) {
    if (f.kind !== "identity" || f.txtIndex == null) continue
    const key = mapIdentityKey(f.label)
    if (key && identityMap[key] == null) identityMap[key] = f.txtIndex
  }

  const answerSections: SekonicAnswerSection[] = []
  let nextQ = 1
  for (const f of fields) {
    if (f.kind !== "answers" || f.txtIndex == null) continue
    const optionChars = f.charset.replace(/\s+/g, "").toUpperCase()
    const blockLength = Math.max(1, f.gridWidth)
    const activeLength = estimateActiveLength(f.label || `BOLUM${answerSections.length + 1}`, blockLength)
    const startQuestion = nextQ
    const endQuestion = nextQ + activeLength - 1
    answerSections.push({
      name: f.label || `Bölüm ${answerSections.length + 1}`,
      txtIndex: f.txtIndex,
      optionChars,
      blockLength,
      activeLength,
      startQuestion,
      endQuestion,
    })
    nextQ = endQuestion + 1
  }

  const questionCount = answerSections.reduce((s, a) => s + a.activeLength, 0)
  const fileName = params.fileName ?? "template.fmt"
  const hash = createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16)
  const baseKey =
    params.templateKey ??
    `sekonic-${fileName.replace(/\.fmt$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${hash.slice(0, 8)}`

  const fieldOrder = fields
    .filter((f) => f.kind !== "separator")
    .map((f) => f.label || `field_${f.txtIndex}`)

  const deviceFields: SekonicFmtLayout["deviceFields"] = {
    answerBlocks: answerSections.map((a) => ({
      index: a.txtIndex,
      startQuestion: a.startQuestion,
      blockLength: a.blockLength,
      activeLength: a.activeLength,
    })),
  }
  if (identityMap.formFlag != null) deviceFields.formFlag = { index: identityMap.formFlag }
  if (identityMap.studentNumber != null) {
    deviceFields.studentNumber = { index: identityMap.studentNumber }
  }
  if (identityMap.firstName != null) deviceFields.firstName = { index: identityMap.firstName }
  if (identityMap.lastName != null) deviceFields.lastName = { index: identityMap.lastName }
  if (identityMap.tcNumber != null) deviceFields.tcNumber = { index: identityMap.tcNumber }
  if (identityMap.bookletVariant != null) {
    deviceFields.bookletVariant = { index: identityMap.bookletVariant }
  }

  return {
    id: baseKey,
    type: "sekonic_fmt",
    publisher: params.publisher ?? "Sekonic / Yayınevi",
    version: "1.0.0",
    label: fileName.replace(/\.fmt$/i, ""),
    sourceFmtFileName: fileName,
    sourceFmtHash: hash,
    formCols,
    formRows,
    encoding: ["cp1254", "windows-1254", "utf-8"],
    delimiter: "\\",
    questionCount,
    options: ["A", "B", "C", "D", "E"],
    fields,
    identityMap,
    answerSections,
    txt: {
      delimiter: "\\",
      encoding: "cp1254",
      fieldOrder,
    },
    deviceFields,
  }
}

/** Layout’u device-txt-parser’ın beklediği forma çevir. */
export function sekonicLayoutToDeviceTxtLayout(layout: SekonicFmtLayout) {
  return {
    id: layout.id,
    type: "sekonic_fmt" as const,
    delimiter: layout.delimiter,
    questionCount: layout.questionCount,
    options: layout.options,
    encoding: layout.encoding,
    fields: {
      formFlag: layout.deviceFields.formFlag,
      studentNumber: layout.deviceFields.studentNumber,
      firstName: layout.deviceFields.firstName,
      lastName: layout.deviceFields.lastName,
      tcNumber: layout.deviceFields.tcNumber,
      bookletVariant: layout.deviceFields.bookletVariant,
      answerBlocks: layout.deviceFields.answerBlocks,
    },
  }
}

export function applyAnswerSectionOverrides(
  layout: SekonicFmtLayout,
  overrides: Array<{ name?: string; activeLength: number; startQuestion?: number }>
): SekonicFmtLayout {
  const sections = layout.answerSections.map((s, i) => {
    const o = overrides[i]
    if (!o) return s
    const activeLength = Math.max(1, o.activeLength)
    const startQuestion = o.startQuestion ?? s.startQuestion
    return {
      ...s,
      name: o.name?.trim() || s.name,
      activeLength,
      startQuestion,
      endQuestion: startQuestion + activeLength - 1,
    }
  })
  // Zincirleme startQuestion düzelt
  let q = sections[0]?.startQuestion ?? 1
  for (const s of sections) {
    s.startQuestion = q
    s.endQuestion = q + s.activeLength - 1
    q = s.endQuestion + 1
  }
  const questionCount = sections.reduce((sum, s) => sum + s.activeLength, 0)
  const deviceFields = {
    ...layout.deviceFields,
    answerBlocks: sections.map((a) => ({
      index: a.txtIndex,
      startQuestion: a.startQuestion,
      blockLength: a.blockLength,
      activeLength: a.activeLength,
    })),
  }
  return { ...layout, answerSections: sections, questionCount, deviceFields }
}
