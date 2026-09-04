import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamEdit, requireExamView } from "@/lib/exams/auth"
import { evaluateExamReadiness } from "@/lib/exams/validation"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const actor = await requireExamView(request)
    if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, department: true },
        },
        class: { select: { id: true, name: true, grade: true, section: true } },
        scanTemplate: true,
        sections: { orderBy: { sortOrder: "asc" } },
        outcomes: { orderBy: { sortOrder: "asc" } },
        questions: {
          include: { outcome: true, section: true },
          orderBy: { questionNo: "asc" },
        },
        scanBatches: {
          orderBy: { createdAt: "desc" },
          include: {
            operator: { select: { firstName: true, lastName: true } },
            _count: { select: { items: true } },
          },
        },
        results: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, grade: true, tcNumber: true },
            },
          },
          orderBy: { netScore: "desc" },
        },
      },
    })

    if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

    const readiness = evaluateExamReadiness(exam)

    return NextResponse.json({ exam, readiness })
  } catch (error) {
    console.error("Error fetching exam:", error)
    return NextResponse.json({ error: "Sınav alınırken bir hata oluştu" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const actor = await requireExamEdit(request)
    if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

    const existing = await prisma.exam.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

    const body = await request.json()
    const {
      name,
      examType,
      examDate,
      grade,
      description,
      isActive,
      scanTemplateId,
      expectedParticipantCount,
      status,
    } = body

    const locked = existing.status === "READY_FOR_SCAN" || existing.status === "PUBLISHED"

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(examType && { examType }),
        ...(examDate && { examDate: new Date(examDate) }),
        ...(grade !== undefined && !locked && { grade: grade ? parseInt(String(grade)) : null }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(scanTemplateId !== undefined && !locked && { scanTemplateId }),
        ...(expectedParticipantCount !== undefined && {
          expectedParticipantCount: expectedParticipantCount ? Number(expectedParticipantCount) : null,
        }),
        ...(status === "CONFIGURED" && existing.status === "DRAFT" && { status: "CONFIGURED" }),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        scanTemplate: true,
        sections: true,
        questions: true,
      },
    })

    return NextResponse.json({ success: true, exam })
  } catch (error) {
    console.error("Error updating exam:", error)
    return NextResponse.json({ error: "Sınav güncellenirken bir hata oluştu" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const actor = await requireExamEdit(request)
    if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { _count: { select: { results: true, scanBatches: true } } },
    })
    if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })
    if (exam.status === "PUBLISHED") {
      return NextResponse.json(
        { error: "Yayınlanmış sınav silinemez. Önce arşivleyin veya yayını geri alın." },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Batch item → result bağıntısını çöz (FK çakışmasını önle)
      const batches = await tx.examScanBatch.findMany({
        where: { examId: id },
        select: { id: true },
      })
      if (batches.length > 0) {
        await tx.examScanBatchItem.updateMany({
          where: { batchId: { in: batches.map((b) => b.id) } },
          data: { examResultId: null },
        })
      }
      await tx.exam.delete({ where: { id } })
    })

    return NextResponse.json({
      success: true,
      message: "Sınav başarıyla silindi",
      deleted: {
        results: exam._count.results,
        scanBatches: exam._count.scanBatches,
      },
    })
  } catch (error) {
    console.error("Error deleting exam:", error)
    return NextResponse.json({ error: "Sınav silinirken bir hata oluştu" }, { status: 500 })
  }
}
