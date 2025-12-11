import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek konu getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        unit: {
          include: {
            subject: true,
          },
        },
        progress: true,
        subTopics: {
          orderBy: {
            order: "asc",
          },
        },
      },
    })

    if (!topic) {
      return NextResponse.json(
        { error: "Konu bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(topic)
  } catch (error) {
    console.error("Error fetching topic:", error)
    return NextResponse.json(
      { error: "Konu getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Konu güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const {
      name,
      order,
      plannedStartWeek,
      plannedEndWeek,
      plannedStartDate,
      plannedEndDate,
      estimatedDuration,
      description,
    } = body

    if (!name || order === undefined) {
      return NextResponse.json(
        { error: "Konu adı ve sıra zorunludur" },
        { status: 400 }
      )
    }

    const topic = await prisma.topic.update({
      where: { id: params.id },
      data: {
        name,
        order: parseInt(order.toString()),
        plannedStartWeek: plannedStartWeek ? parseInt(plannedStartWeek.toString()) : null,
        plannedEndWeek: plannedEndWeek ? parseInt(plannedEndWeek.toString()) : null,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration.toString()) : null,
        description: description || null,
      },
    })

    return NextResponse.json(topic)
  } catch (error) {
    console.error("Error updating topic:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Konu bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Konu güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Konu sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.topic.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Konu başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting topic:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Konu bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Konu silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

