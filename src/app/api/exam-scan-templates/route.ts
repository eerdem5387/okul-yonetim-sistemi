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
      { file: "generic-v1.json", questionCount: 20 },
      { file: "publisher-b-v1.json", questionCount: 40 },
    ]
    const created = []
    for (const def of defs) {
      const raw = readFileSync(path.join(templatesDir, def.file), "utf-8")
      const layout = JSON.parse(raw)
      const t = await prisma.examScanTemplate.upsert({
        where: { templateKey: layout.id },
        create: {
          templateKey: layout.id,
          publisher: layout.publisher,
          version: layout.version,
          label: layout.label,
          questionCount: def.questionCount,
          layoutJson: layout,
        },
        update: {
          publisher: layout.publisher,
          version: layout.version,
          label: layout.label,
          questionCount: def.questionCount,
          layoutJson: layout,
        },
      })
      created.push(t)
    }
    return NextResponse.json({ templates: created })
  }

  return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
}
