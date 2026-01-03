import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * PUT /api/homework/[id]/complete
 * Ödev tamamlama durumunu günceller
 * 
 * Body:
 * - studentId: string
 * - isCompleted: boolean
 * - completedBy?: string (öğretmen veya öğrenci ID)
 * - note?: string
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: homeworkId } = await context.params
    const body = await request.json()
    const { studentId, isCompleted, completedBy, note } = body

    // Validasyon
    if (!studentId || isCompleted === undefined) {
      return NextResponse.json(
        { error: "Öğrenci ID ve tamamlanma durumu gereklidir" },
        { status: 400 }
      )
    }

    // Ödev atamasını bul
    const assignment = await prisma.homeworkAssignment.findUnique({
      where: {
        homeworkId_studentId: {
          homeworkId,
          studentId,
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Ödev ataması bulunamadı" },
        { status: 404 }
      )
    }

    // Güncelle
    // Eğer öğretmen bir işlem yapıyorsa (tamamlandı veya tamamlanmadı), completedBy set edilir
    // Bu sayede "işlem yapılmamış" (completedBy null) ile "tamamlanmadı" (completedBy var ama isCompleted false) ayırt edilebilir
    const updatedAssignment = await prisma.homeworkAssignment.update({
      where: {
        homeworkId_studentId: {
          homeworkId,
          studentId,
        },
      },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : (completedBy ? new Date() : null), // Tamamlanmadı durumunda da tarih set edilir
        completedBy: completedBy || null, // Öğretmen işlem yaptıysa completedBy set edilir
        note,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
          },
        },
        homework: {
          select: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
    })
  } catch (error) {
    console.error("Error updating homework completion:", error)
    return NextResponse.json(
      { error: "Ödev tamamlama durumu güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

