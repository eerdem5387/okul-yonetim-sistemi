import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/homework/[id]
 * Ödev detayını getirir
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const homework = await prisma.homework.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
              },
            },
          },
          orderBy: {
            student: {
              lastName: "asc",
            },
          },
        },
      },
    })

    if (!homework) {
      return NextResponse.json(
        { error: "Ödev bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ homework })
  } catch (error) {
    console.error("Error fetching homework:", error)
    return NextResponse.json(
      { error: "Ödev alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/homework/[id]
 * Ödevi günceller
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { title, description, dueDate, subject, attachmentUrl, isActive } = body

    const homework = await prisma.homework.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(subject !== undefined && { subject }),
        ...(attachmentUrl !== undefined && { attachmentUrl }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      homework,
    })
  } catch (error) {
    console.error("Error updating homework:", error)
    return NextResponse.json(
      { error: "Ödev güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/homework/[id]
 * Ödevi siler
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Önce ödev atamalarını sil (cascade delete çalışmazsa)
    await prisma.homeworkAssignment.deleteMany({
      where: { homeworkId: id },
    })

    // Sonra ödevi sil
    await prisma.homework.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Ödev başarıyla silindi",
    })
  } catch (error) {
    console.error("Error deleting homework:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Ödev bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Ödev silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

