import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamScan } from "@/lib/exams/auth"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await requireExamScan(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      questions: { orderBy: { questionNo: "asc" } },
      scanTemplate: true,
    },
  })

  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  return NextResponse.json({
    examId: exam.id,
    name: exam.name,
    status: exam.status,
    templateId: exam.templateId ?? exam.scanTemplate?.templateKey ?? null,
    definitionVersion: exam.definitionVersion,
    questionCount: exam.questions.length,
    bookletVariants: [...new Set(exam.questions.map((q) => q.bookletVariant).filter(Boolean))],
    sections: exam.sections.map((s) => ({
      id: s.id,
      name: s.name,
      questionStart: s.questionStart,
      questionEnd: s.questionEnd,
    })),
  })
}
