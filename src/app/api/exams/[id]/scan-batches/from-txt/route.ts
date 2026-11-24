import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireExamScan } from "@/lib/exams/auth"
import { isScanAccepting, matchScanItems, processScanBatch } from "@/lib/exams/import-batch"
import {
  deviceTxtRowsToBatchItems,
  formatMismatchRatio,
  parseDeviceTxtContent,
  resolveTxtLayout,
} from "@/lib/exams/device-txt-parser"

export const maxDuration = 60

/**
 * Optik okuyucunun ürettiği TXT dosyasını yükler.
 *
 * Body (JSON):
 * - text?: string
 * - contentBase64?: string  (ham baytlar; önerilen)
 * - encoding?: "cp1254" | "windows-1254" | "utf-8" | "latin1"
 * - batchId?: string
 * - operatorNote?: string
 * - dryRun?: boolean  → yalnızca okur ve eşleştirir, kaydetmez (önizleme)
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

  if (!isScanAccepting(exam.status)) {
    return NextResponse.json(
      { error: "Sınav okutmaya açık değil. Önce cevap anahtarını tamamlayıp 'Okutmaya aç' deyin." },
      { status: 409 }
    )
  }

  let body: {
    text?: string
    contentBase64?: string
    encoding?: string
    batchId?: string
    operatorNote?: string
    dryRun?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  if (!body.text && !body.contentBase64) {
    return NextResponse.json({ error: "Dosya içeriği gönderilmedi" }, { status: 400 })
  }

  const layout = resolveTxtLayout(exam.scanTemplate?.layoutJson)
  if (!layout) {
    return NextResponse.json(
      { error: "Sınava optik form şablonu seçilmemiş ya da şablon okunamıyor. Genel sekmesinden şablon seçin." },
      { status: 400 }
    )
  }

  let parsed
  try {
    parsed = parseDeviceTxtContent(
      {
        text: body.text,
        bytes: body.contentBase64 ? new Uint8Array(Buffer.from(body.contentBase64, "base64")) : undefined,
        encoding: body.encoding === "cp1254" ? "windows-1254" : body.encoding,
      },
      layout
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dosya okunamadı"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: "Dosyada okunabilir satır yok" }, { status: 400 })
  }

  // Yanlış şablon: satırların yarısından fazlası şablonla uyuşmuyorsa cevaplar kayık okunur → durdur
  const mismatch = formatMismatchRatio(parsed.rows)
  if (mismatch > 0.5) {
    return NextResponse.json(
      {
        error:
          `Dosya seçili optik form şablonuyla uyuşmuyor (${Math.round(mismatch * 100)}% satırda alan sayısı farklı). ` +
          "Yanlış yayınevi / form şablonu seçilmiş olabilir. Sonuçlar yanlış okunacağı için yükleme durduruldu.",
      },
      { status: 400 }
    )
  }

  const items = deviceTxtRowsToBatchItems(parsed.rows)
  const parseInfo = {
    rowCount: parsed.rows.length,
    skippedEmptyLines: parsed.skippedEmptyLines,
    encodingUsed: parsed.encodingUsed,
    layoutId: parsed.layoutId,
    formatMismatchRows: Math.round(mismatch * parsed.rows.length),
  }

  if (body.dryRun) {
    try {
      const { matched, summary } = await matchScanItems(examId, items)
      return NextResponse.json({
        status: "preview",
        parse: parseInfo,
        summary,
        rows: matched.map((m, i) => ({
          index: i,
          nameOnForm: m.item.studentNameRaw,
          tcNumber: m.item.tcNumber ? `${m.item.tcNumber.slice(0, 3)}••••••${m.item.tcNumber.slice(-2)}` : null,
          bookletVariant: m.item.bookletVariant,
          matchedStudent: m.studentName,
          errorCodes: m.errorCodes,
          firstAnswers: m.item.answers
            .slice(0, 10)
            .map((a) => (a.isBlank ? "·" : a.isAmbiguous ? "*" : a.givenAnswer ?? "·"))
            .join(""),
          marked: m.item.answers.filter((a) => !a.isBlank).length,
        })),
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Önizleme hazırlanamadı"
      return NextResponse.json({ error: message }, { status: 409 })
    }
  }

  const batchId = body.batchId?.trim() || randomUUID()
  const templateId = exam.scanTemplate?.templateKey ?? exam.templateId ?? layout.id

  try {
    const result = await processScanBatch(examId, actor.staffId, {
      batchId,
      definitionVersion: exam.definitionVersion,
      templateId,
      operatorNote:
        body.operatorNote ??
        `Cihaz TXT (${parsed.encodingUsed}, ${parsed.layoutId}, ${parsed.rows.length} satır)`,
      items,
    })

    return NextResponse.json({
      batchId,
      status: result.duplicate ? "duplicate" : "accepted",
      examStatus: "IN_REVIEW",
      parse: parseInfo,
      summary: result.duplicate ? result.batch.summaryJson : result.summary,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okutma işlenemedi"
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
