import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek bir konuyu getir
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
            subject: {
              include: {
                academicYear: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        progress: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
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

// PUT - Konuyu güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const {
      name,
      description,
      plannedStartDate,
      plannedEndDate,
      estimatedDuration,
      order,
      hasTimeRange,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Konu adı zorunludur" },
        { status: 400 }
      )
    }

    // Konu var mı kontrol et
    const existingTopic = await prisma.topic.findUnique({
      where: { id: params.id },
    })

    if (!existingTopic) {
      return NextResponse.json(
        { error: "Konu bulunamadı" },
        { status: 404 }
      )
    }

    // Güncelleme datası hazırla
    const updateData: {
      name: string
      description?: string | null
      plannedStartDate?: Date | null
      plannedEndDate?: Date | null
      estimatedDuration?: number | null
      order?: number
      hasTimeRange?: boolean
    } = {
      name: name.trim(),
    }

    if (description !== undefined) {
      updateData.description = description && description.trim() ? description.trim() : null
    }

    if (hasTimeRange !== undefined) {
      updateData.hasTimeRange = hasTimeRange
    }

    // Zaman aralığı varsa tarihleri kaydet
    if (hasTimeRange) {
      if (plannedStartDate) {
        updateData.plannedStartDate = new Date(plannedStartDate)
      }
      if (plannedEndDate) {
        updateData.plannedEndDate = new Date(plannedEndDate)
      }
    } else {
      // Zaman aralığı yoksa tarihleri null yap
      updateData.plannedStartDate = null
      updateData.plannedEndDate = null
    }

    if (estimatedDuration !== undefined) {
      updateData.estimatedDuration = estimatedDuration ? parseInt(estimatedDuration, 10) : null
    }

    if (order !== undefined) {
      updateData.order = order
    }

    const topic = await prisma.topic.update({
      where: { id: params.id },
      data: updateData,
      include: {
        unit: {
          include: {
            subject: true,
          },
        },
        progress: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
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

// DELETE - Konuyu sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Konu var mı kontrol et
    const existingTopic = await prisma.topic.findUnique({
      where: { id: params.id },
    })

    if (!existingTopic) {
      return NextResponse.json(
        { error: "Konu bulunamadı" },
        { status: 404 }
      )
    }

    // Önce ilişkili progress kayıtlarını sil
    await prisma.progress.deleteMany({
      where: { topicId: params.id },
    })

    // Sonra konuyu sil
    await prisma.topic.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      message: "Konu başarıyla silindi",
    })
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
