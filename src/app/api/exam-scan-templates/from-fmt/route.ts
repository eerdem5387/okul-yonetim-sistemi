import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamEdit } from "@/lib/exams/auth"
import {
  applyAnswerSectionOverrides,
  parseSekonicFmt,
} from "@/lib/exams/sekonic-fmt-parser"
import type { Prisma } from "@prisma/client"

/**
 * Sekonic .fmt yükle → ExamScanTemplate oluştur/güncelle.
 *
 * Body:
 * - contentBase64?: string  (önerilir, CP1254 ham bayt)
 * - text?: string
 * - fileName?: string
 * - publisher?: string
 * - label?: string
 * - sectionOverrides?: Array<{ activeLength: number; name?: string; startQuestion?: number }>
 * - createSectionsForExamId?: string  (opsiyonel: sınava bölüm+soru üret)
 */
export async function POST(request: NextRequest) {
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  let body: {
    contentBase64?: string
    text?: string
    fileName?: string
    publisher?: string
    label?: string
    sectionOverrides?: Array<{ activeLength: number; name?: string; startQuestion?: number }>
    createSectionsForExamId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  if (!body.contentBase64 && !body.text) {
    return NextResponse.json({ error: "contentBase64 veya text gerekli" }, { status: 400 })
  }

  const fileName = body.fileName?.trim() || "template.fmt"
  let bytes: Uint8Array | undefined
  if (body.contentBase64) {
    bytes = new Uint8Array(Buffer.from(body.contentBase64, "base64"))
  }

  let layout
  try {
    layout = parseSekonicFmt({
      bytes,
      text: body.text,
      fileName,
      publisher: body.publisher,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "FMT parse edilemedi"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (body.sectionOverrides?.length) {
    layout = applyAnswerSectionOverrides(layout, body.sectionOverrides)
  }
  if (body.label?.trim()) {
    layout = { ...layout, label: body.label.trim() }
  }

  const fmtRaw = bytes
    ? Buffer.from(bytes).toString("latin1")
    : body.text ?? null

  const template = await prisma.examScanTemplate.upsert({
    where: { templateKey: layout.id },
    create: {
      templateKey: layout.id,
      publisher: layout.publisher,
      version: layout.version,
      label: layout.label,
      questionCount: layout.questionCount,
      layoutJson: layout as unknown as Prisma.InputJsonValue,
      fmtRaw,
      fmtFileName: fileName,
    },
    update: {
      publisher: layout.publisher,
      version: layout.version,
      label: layout.label,
      questionCount: layout.questionCount,
      layoutJson: layout as unknown as Prisma.InputJsonValue,
      fmtRaw,
      fmtFileName: fileName,
      isActive: true,
    },
  })

  let sectionsCreated: unknown[] | undefined
  if (body.createSectionsForExamId) {
    const examId = body.createSectionsForExamId
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { sections: true, questions: true },
    })
    if (!exam) {
      return NextResponse.json(
        { error: "Sınav bulunamadı", template, layout },
        { status: 404 }
      )
    }
    if (exam.status === "READY_FOR_SCAN" || exam.status === "PUBLISHED" || exam.status === "IN_REVIEW") {
      return NextResponse.json(
        { error: "Kilitli sınavda bölüm oluşturulamaz", template, layout },
        { status: 409 }
      )
    }

    // Mevcut bölüm/soruları temizle ve FMT’den yeniden kur
    await prisma.examQuestion.deleteMany({ where: { examId } })
    await prisma.examSection.deleteMany({ where: { examId } })

    const created = []
    for (let i = 0; i < layout.answerSections.length; i++) {
      const sec = layout.answerSections[i]!
      const section = await prisma.examSection.create({
        data: {
          examId,
          name: sec.name,
          questionStart: sec.startQuestion,
          questionEnd: sec.endQuestion,
          sortOrder: i,
        },
      })
      const questions = []
      for (let q = sec.startQuestion; q <= sec.endQuestion; q++) {
        questions.push({
          examId,
          sectionId: section.id,
          questionNo: q,
          sortOrder: q,
        })
      }
      await prisma.examQuestion.createMany({ data: questions })
      created.push(section)
    }

    await prisma.exam.update({
      where: { id: examId },
      data: {
        scanTemplateId: template.id,
        templateId: template.templateKey,
        status: exam.status === "DRAFT" ? "CONFIGURED" : exam.status,
      },
    })
    sectionsCreated = created
  }

  return NextResponse.json({
    template,
    layout: {
      id: layout.id,
      label: layout.label,
      questionCount: layout.questionCount,
      identityMap: layout.identityMap,
      answerSections: layout.answerSections,
      fieldOrder: layout.txt.fieldOrder,
    },
    sectionsCreated,
  })
}
