import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamView } from "@/lib/exams/auth"
import { readFileSync } from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  const actor = await requireExamView(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const templates = await prisma.examScanTemplate.findMany({
    where: { isActive: true },
    orderBy: { label: "asc" },
  })
  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const actor = await requireExamView(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const body = await request.json()
  if (body.seed === true) {
    const templatesDir = path.join(process.cwd(), "packages/exam-import-contract/templates")
    const defs = [
      { file: "sekonic-eyotek-yks-2022-1.json", questionCount: 120 },
      { file: "device-txt-v1.json", questionCount: 120 },
      { file: "generic-v1.json", questionCount: 20 },
      { file: "publisher-b-v1.json", questionCount: 40 },
    ]
    const created = []
    for (const def of defs) {
      const raw = readFileSync(path.join(templatesDir, def.file), "utf-8")
      const layout = JSON.parse(raw)
      const questionCount = Number(layout.questionCount) || def.questionCount
      const t = await prisma.examScanTemplate.upsert({
        where: { templateKey: layout.id },
        create: {
          templateKey: layout.id,
          publisher: layout.publisher ?? "Generic",
          version: layout.version ?? "1.0.0",
          label: layout.label ?? layout.id,
          questionCount,
          layoutJson: layout,
          fmtFileName: layout.sourceFmtFileName ?? null,
        },
        update: {
          publisher: layout.publisher ?? "Generic",
          version: layout.version ?? "1.0.0",
          label: layout.label ?? layout.id,
          questionCount,
          layoutJson: layout,
          fmtFileName: layout.sourceFmtFileName ?? null,
        },
      })
      created.push(t)
    }
    return NextResponse.json({ templates: created })
  }

  // Manuel şablon kaydı (JSON layout)
  if (body.layout && body.templateKey) {
    const layout = body.layout
    const t = await prisma.examScanTemplate.upsert({
      where: { templateKey: body.templateKey },
      create: {
        templateKey: body.templateKey,
        publisher: body.publisher ?? layout.publisher ?? "Custom",
        version: body.version ?? layout.version ?? "1.0.0",
        label: body.label ?? layout.label ?? body.templateKey,
        questionCount: Number(body.questionCount ?? layout.questionCount) || 0,
        layoutJson: layout,
        fmtRaw: body.fmtRaw ?? null,
        fmtFileName: body.fmtFileName ?? null,
      },
      update: {
        publisher: body.publisher ?? layout.publisher ?? "Custom",
        version: body.version ?? layout.version ?? "1.0.0",
        label: body.label ?? layout.label ?? body.templateKey,
        questionCount: Number(body.questionCount ?? layout.questionCount) || 0,
        layoutJson: layout,
        fmtRaw: body.fmtRaw ?? undefined,
        fmtFileName: body.fmtFileName ?? undefined,
        isActive: true,
      },
    })
    return NextResponse.json({ template: t })
  }

  return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
}
