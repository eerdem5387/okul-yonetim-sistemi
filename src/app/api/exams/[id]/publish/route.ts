import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamEdit } from "@/lib/exams/auth"
import { assertTransition } from "@/lib/exams/state-machine"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({ where: { id } })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  try {
    assertTransition(exam.status, "PUBLISHED")
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Geçersiz geçiş"
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  const resultCount = await prisma.examResult.count({ where: { examId: id } })
  if (resultCount === 0) {
    return NextResponse.json({ error: "Yayınlamak için en az bir sonuç gerekli" }, { status: 400 })
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  })

  return NextResponse.json({ exam: updated })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({ where: { id } })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  if (exam.status !== "IN_REVIEW") {
    return NextResponse.json({ error: "Yalnızca incelemedeki sınav reddedilebilir" }, { status: 409 })
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: { status: "READY_FOR_SCAN" },
  })

  return NextResponse.json({ exam: updated })
}
