import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamEdit } from "@/lib/exams/auth"
import { assertTransition } from "@/lib/exams/state-machine"
import { evaluateExamReadiness } from "@/lib/exams/validation"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamEdit(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      sections: true,
      questions: true,
      scanTemplate: true,
    },
  })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  const readiness = evaluateExamReadiness(exam)
  if (!readiness.ready) {
    return NextResponse.json({ error: "Checklist tamamlanmadı", readiness }, { status: 400 })
  }

  try {
    assertTransition(exam.status, "READY_FOR_SCAN")
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Geçersiz geçiş"
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: {
      status: "READY_FOR_SCAN",
      lockedAt: new Date(),
      templateId: exam.scanTemplate?.templateKey ?? exam.templateId,
    },
  })

  return NextResponse.json({ exam: updated, readiness })
}
