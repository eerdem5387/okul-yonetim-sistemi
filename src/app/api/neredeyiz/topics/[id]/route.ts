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

    // Progress kayıtlarındaki Staff ID'lerini topla
    const staffIds = new Set<string>()
    if (topic.progress && topic.progress.length > 0) {
      const progress = topic.progress[0]
      if (progress.markedBy) staffIds.add(progress.markedBy)
      if (progress.approvedBy) staffIds.add(progress.approvedBy)
      if (progress.reportedBy) staffIds.add(progress.reportedBy)
    }

    // Staff bilgilerini çek
    const staffMembers = await prisma.staff.findMany({
      where: {
        id: { in: Array.from(staffIds) },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
      },
    })

    // Staff bilgilerini map'e çevir
    const staffMap = new Map(staffMembers.map((s) => [s.id, s]))

    // Progress kayıtlarına Staff bilgilerini ekle
    const topicWithStaff = {
      ...topic,
      progress: topic.progress.map((p) => ({
        ...p,
        markedByStaff: p.markedBy ? staffMap.get(p.markedBy) : null,
        approvedByStaff: p.approvedBy ? staffMap.get(p.approvedBy) : null,
        reportedByStaff: p.reportedBy ? staffMap.get(p.reportedBy) : null,
        // ✅ Tarih alanlarını da ekle
        reportedAt: p.reportedAt ? p.reportedAt.toISOString() : null,
        approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
        markedAt: p.markedAt ? p.markedAt.toISOString() : null,
      })),
    }

    return NextResponse.json(topicWithStaff)
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
    } = {
      name: name.trim(),
    }

    if (description !== undefined) {
      updateData.description = description && description.trim() ? description.trim() : null
    }

    // Tarihleri kaydet (varsa)
    if (plannedStartDate !== undefined) {
      updateData.plannedStartDate = plannedStartDate ? new Date(plannedStartDate) : null
    }

    if (plannedEndDate !== undefined) {
      updateData.plannedEndDate = plannedEndDate ? new Date(plannedEndDate) : null
    }

    if (estimatedDuration !== undefined) {
      updateData.estimatedDuration = estimatedDuration ? parseInt(estimatedDuration.toString(), 10) : null
    }

    if (order !== undefined) {
      updateData.order = parseInt(order.toString(), 10)
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
