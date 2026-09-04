import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireExamScan } from "@/lib/exams/auth"
import { processScanBatch } from "@/lib/exams/import-batch"
import {
  DEVICE_TXT_V1_LAYOUT,
  deviceTxtRowsToBatchItems,
  layoutFromJson,
  parseDeviceTxtContent,
} from "@/lib/exams/device-txt-parser"

/**
 * Cihazın ürettiği TXT dosyasını yükler, parse eder ve scan batch olarak işler.
 * Web paneli ve masaüstü uygulama aynı endpoint'i kullanır.
 *
 * Body (JSON):
 * - text?: string
 * - contentBase64?: string  (ham baytlar; CP1254 için önerilir)
 * - encoding?: "cp1254" | "windows-1254" | "utf-8" | "latin1"
 * - batchId?: string
 * - operatorNote?: string
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamScan(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { scanTemplate: true },
  })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  if (exam.status !== "READY_FOR_SCAN" && exam.status !== "SCANNING") {
    return NextResponse.json(
      { error: "Sınav okutmaya uygun durumda değil (READY_FOR_SCAN gerekli)" },
      { status: 409 }
    )
  }

  let body: {
    text?: string
    contentBase64?: string
    encoding?: string
    batchId?: string
    operatorNote?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  if (!body.text && !body.contentBase64) {
    return NextResponse.json(
      { error: "text veya contentBase64 gerekli" },
      { status: 400 }
    )
  }

  const layoutJson = exam.scanTemplate?.layoutJson
  const layout = layoutFromJson(layoutJson ?? DEVICE_TXT_V1_LAYOUT)

  let bytes: Uint8Array | undefined
  if (body.contentBase64) {
    bytes = new Uint8Array(Buffer.from(body.contentBase64, "base64"))
  }

  let parsed
  try {
    parsed = parseDeviceTxtContent(
      {
        text: body.text,
        bytes,
        encoding: body.encoding === "cp1254" ? "windows-1254" : body.encoding,
      },
      layout
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "TXT parse edilemedi"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: "TXT içinde okunabilir satır yok" }, { status: 400 })
  }

  const items = deviceTxtRowsToBatchItems(parsed.rows)
  const batchId = body.batchId?.trim() || randomUUID()
  const templateId =
    exam.scanTemplate?.templateKey ??
    exam.templateId ??
    layout.id

  try {
    const result = await processScanBatch(examId, actor.staffId, {
      batchId,
      definitionVersion: exam.definitionVersion,
      templateId,
      operatorNote:
        body.operatorNote ??
        `Cihaz TXT import (${parsed.encodingUsed}, ${parsed.layoutId}, ${parsed.rows.length} satır)`,
      items,
    })

    if (result.duplicate) {
      return NextResponse.json({
        batchId,
        status: "duplicate",
        examStatus: "IN_REVIEW",
        parse: {
          rowCount: parsed.rows.length,
          skippedEmptyLines: parsed.skippedEmptyLines,
          encodingUsed: parsed.encodingUsed,
          layoutId: parsed.layoutId,
        },
        summary: result.batch.summaryJson,
      })
    }

    return NextResponse.json({
      batchId,
      status: "accepted",
      examStatus: "IN_REVIEW",
      parse: {
        rowCount: parsed.rows.length,
        skippedEmptyLines: parsed.skippedEmptyLines,
        encodingUsed: parsed.encodingUsed,
        layoutId: parsed.layoutId,
      },
      summary: result.summary,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Batch işlenemedi"
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
