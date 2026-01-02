import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/attendance/[id]
 * Yoklama detayını getirir
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
          },
        },
        schedule: {
          select: {
            id: true,
            subjectName: true,
            dayOfWeek: true,
          },
        },
      },
    })

    if (!attendance) {
      return NextResponse.json(
        { error: "Yoklama bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json(
      { error: "Yoklama alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/attendance/[id]
 * Yoklamayı günceller
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { status, note } = body

    if (!status) {
      return NextResponse.json(
        { error: "Yoklama durumu gereklidir" },
        { status: 400 }
      )
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        status: status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
        note: note || null,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      attendance,
    })
  } catch (error) {
    console.error("Error updating attendance:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Yoklama bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Yoklama güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/attendance/[id]
 * Yoklamayı siler
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    await prisma.attendance.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Yoklama başarıyla silindi",
    })
  } catch (error) {
    console.error("Error deleting attendance:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Yoklama bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Yoklama silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

