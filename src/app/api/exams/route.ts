import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireExamCreate, requireExamView } from "@/lib/exams/auth"

const STATUS_MAP: Record<string, string> = {
  ready_for_scan: "READY_FOR_SCAN",
  scanning: "SCANNING",
  in_review: "IN_REVIEW",
  published: "PUBLISHED",
  draft: "DRAFT",
  configured: "CONFIGURED",
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireExamView(request)
    if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const grade = searchParams.get("grade")
    const classId = searchParams.get("classId")
    const examType = searchParams.get("examType")
    const isActive = searchParams.get("isActive")
    const statusParam = searchParams.get("status")

    const whereConditions: Prisma.ExamWhereInput = {}

    if (grade) whereConditions.grade = parseInt(grade)
    if (classId) whereConditions.classId = classId
    if (examType) {
      whereConditions.examType = examType as "YKS" | "LGS" | "KPSS" | "DENEME" | "DIGER"
    }
    if (isActive !== null && isActive !== "") {
      whereConditions.isActive = isActive === "true"
    }
    if (statusParam) {
      const mapped = STATUS_MAP[statusParam.toLowerCase()]
      if (mapped) {
        whereConditions.status = mapped as Prisma.EnumExamStatusFilter["equals"]
      }
    }

    const exams = await prisma.exam.findMany({
      where: whereConditions,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, department: true },
        },
        class: { select: { id: true, name: true, grade: true, section: true } },
        scanTemplate: { select: { id: true, templateKey: true, label: true, questionCount: true } },
        _count: { select: { results: true, questions: true, scanBatches: true } },
      },
      orderBy: { examDate: "desc" },
    })

    return NextResponse.json({ exams })
  } catch (error) {
    console.error("Error fetching exams:", error)
    return NextResponse.json({ error: "Sınavlar alınırken bir hata oluştu" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireExamCreate(request)
    if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

    const body = await request.json()
    const {
      name,
      examType,
      examDate,
      scope,
      grade,
      classId,
      description,
      scanTemplateId,
      expectedParticipantCount,
    } = body

    if (!name || !examType || !examDate || !scope) {
      return NextResponse.json(
        { error: "Sınav adı, tipi, tarihi ve kapsam gereklidir" },
        { status: 400 }
      )
    }

    if (scope === "GRADE" && !grade) {
      return NextResponse.json({ error: "Sınıf seviyesi bazlı sınavlar için grade gereklidir" }, { status: 400 })
    }
    if (scope === "CLASS" && !classId) {
      return NextResponse.json({ error: "Sınıf bazlı sınavlar için classId gereklidir" }, { status: 400 })
    }

    const exam = await prisma.exam.create({
      data: {
        name,
        examType,
        examDate: new Date(examDate),
        grade: scope === "WHOLE_SCHOOL" ? null : grade ? parseInt(String(grade)) : null,
        classId: scope === "CLASS" ? classId : null,
        description,
        scanTemplateId: scanTemplateId ?? null,
        expectedParticipantCount: expectedParticipantCount ? Number(expectedParticipantCount) : null,
        createdById: actor.staffId,
        status: "DRAFT",
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, department: true } },
        class: { select: { id: true, name: true, grade: true, section: true } },
        scanTemplate: true,
      },
    })

    return NextResponse.json({ success: true, exam })
  } catch (error) {
    console.error("Error creating exam:", error)
    return NextResponse.json({ error: "Sınav oluşturulurken bir hata oluştu" }, { status: 500 })
  }
}
