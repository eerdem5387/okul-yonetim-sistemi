import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/student-comments/[id]
 * Belirli bir görüşü getirir
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const comment = await prisma.studentComment.findUnique({
      where: { id },
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
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            subject: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Görüş bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ comment })
  } catch (error) {
    console.error("Error fetching comment:", error)
    return NextResponse.json(
      { error: "Görüş alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/student-comments/[id]
 * Görüşü günceller
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { commentType, category, content, isPositive } = body

    const updateData: {
      commentType?: "ACADEMIC" | "BEHAVIORAL" | "GENERAL"
      category?: string | null
      content?: string
      isPositive?: boolean
    } = {}

    if (commentType) updateData.commentType = commentType as "ACADEMIC" | "BEHAVIORAL" | "GENERAL"
    if (category !== undefined) updateData.category = category || null
    if (content) updateData.content = content
    if (isPositive !== undefined) updateData.isPositive = isPositive

    const comment = await prisma.studentComment.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      comment,
    })
  } catch (error) {
    console.error("Error updating comment:", error)
    return NextResponse.json(
      { error: "Görüş güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/student-comments/[id]
 * Görüşü siler
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.studentComment.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Görüş başarıyla silindi",
    })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Görüş silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

