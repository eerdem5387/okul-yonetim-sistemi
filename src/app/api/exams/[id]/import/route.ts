import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireExamEdit, requireExamView } from "@/lib/exams/auth"
import {
  importExamAnswerKeys,
  importExamOutcomes,
  parseAnswerKeysFromRows,
  parseOutcomesFromRows,
  parseTabularFile,
} from "@/lib/exams/excel-import"

/**
 * GET ?template=outcomes|answer_key → örnek CSV indir
 * POST → Excel/CSV import
 *   { kind: "outcomes" | "answer_key", csvText? | contentBase64?, fileName? }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamView(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({ where: { id }, select: { id: true } })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  const template = new URL(request.url).searchParams.get("template")
  const dir = path.join(process.cwd(), "packages/exam-import-contract")

  if (template === "outcomes") {
    const csv = readFileSync(path.join(dir, "kazanim-import-template.csv"), "utf-8")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="kazanim-sablon.csv"',
      },
    })
  }

  if (template === "answer_key") {
    const csv = readFileSync(path.join(dir, "answer-key-import-template.csv"), "utf-8")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cevap-anahtari-sablon.csv"',
      },
    })
  }

  return NextResponse.json({
    templates: ["outcomes", "answer_key"],
    usage:
      "GET ?template=outcomes|answer_key — şablon indir. POST { kind, csvText|contentBase64 } — içe aktar.",
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  if (
    exam.status === "READY_FOR_SCAN" ||
    exam.status === "PUBLISHED" ||
    exam.status === "IN_REVIEW" ||
    exam.status === "ARCHIVED"
  ) {
    return NextResponse.json(
      { error: "Kilitli sınavda import yapılamaz" },
      { status: 409 }
    )
  }

  const body = await request.json()
  const kind = body.kind as string
  if (kind !== "outcomes" && kind !== "answer_key") {
    return NextResponse.json(
      { error: 'kind "outcomes" veya "answer_key" olmalı' },
      { status: 400 }
    )
  }

  let rows: Record<string, unknown>[]
  try {
    rows = parseTabularFile({
      csvText: body.csvText,
      contentBase64: body.contentBase64,
      fileName: body.fileName,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dosya okunamadı"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (kind === "outcomes") {
    const parsed = parseOutcomesFromRows(rows)
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "Geçerli kazanım satırı bulunamadı (subject, topic, learningOutcome gerekli)" },
        { status: 400 }
      )
    }
    const outcomes = await importExamOutcomes(examId, parsed)
    return NextResponse.json({ kind, imported: outcomes.length, outcomes })
  }

  const parsed = parseAnswerKeysFromRows(rows)
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "Geçerli cevap anahtarı satırı bulunamadı (questionNo, correctAnswer gerekli)" },
      { status: 400 }
    )
  }
  const result = await importExamAnswerKeys(examId, parsed)
  return NextResponse.json({ kind, ...result })
}
