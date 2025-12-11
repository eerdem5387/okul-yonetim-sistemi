import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProgressStatus } from "@prisma/client"

// GET - Tek ilerleme kaydı getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const progress = await prisma.progress.findUnique({
      where: { id: params.id },
      include: {
        topic: {
          include: {
            unit: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "İlerleme kaydı bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json(
      { error: "İlerleme kaydı getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - İlerleme kaydı güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const {
      status,
      plannedDate,
      actualStartDate,
      actualEndDate,
      notes,
      markedBy,
    } = body

    if (!status) {
      return NextResponse.json(
        { error: "Durum zorunludur" },
        { status: 400 }
      )
    }

    const progress = await prisma.progress.update({
      where: { id: params.id },
      data: {
        status: status as ProgressStatus,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
        notes: notes || null,
        markedBy: markedBy || null,
        markedAt: markedBy ? new Date() : null,
      },
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error updating progress:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "İlerleme kaydı bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "İlerleme kaydı güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - İlerleme kaydı sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.progress.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "İlerleme kaydı başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting progress:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "İlerleme kaydı bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "İlerleme kaydı silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

