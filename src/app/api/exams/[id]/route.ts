import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/exams/[id]
 * Sınav detayını getirir
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
        results: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                tcNumber: true,
              },
            },
            enteredBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            ranking: "asc",
          },
        },
      },
    })

    if (!exam) {
      return NextResponse.json(
        { error: "Sınav bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ exam })
  } catch (error) {
    console.error("Error fetching exam:", error)
    return NextResponse.json(
      { error: "Sınav alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/exams/[id]
 * Sınavı günceller
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { name, examType, examDate, grade, description, subjects, isActive } = body

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(examType && { examType }),
        ...(examDate && { examDate: new Date(examDate) }),
        ...(grade !== undefined && { grade: parseInt(grade) }),
        ...(description !== undefined && { description }),
        ...(subjects !== undefined && { subjects }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      exam,
    })
  } catch (error) {
    console.error("Error updating exam:", error)
    return NextResponse.json(
      { error: "Sınav güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/exams/[id]
 * Sınavı siler
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    await prisma.exam.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Sınav başarıyla silindi",
    })
  } catch (error) {
    console.error("Error deleting exam:", error)
    return NextResponse.json(
      { error: "Sınav silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

