import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek ünite getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const unit = await prisma.unit.findUnique({
      where: { id: params.id },
      include: {
        subject: true,
        topics: {
          orderBy: {
            order: "asc",
          },
          include: {
            progress: true,
            subTopics: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
    })

    if (!unit) {
      return NextResponse.json(
        { error: "Ünite bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(unit)
  } catch (error) {
    console.error("Error fetching unit:", error)
    return NextResponse.json(
      { error: "Ünite getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Ünite güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { name, order, description } = body

    if (!name || order === undefined) {
      return NextResponse.json(
        { error: "Ünite adı ve sıra zorunludur" },
        { status: 400 }
      )
    }

    const unit = await prisma.unit.update({
      where: { id: params.id },
      data: {
        name,
        order: parseInt(order.toString()),
        description: description || null,
      },
    })

    return NextResponse.json(unit)
  } catch (error) {
    console.error("Error updating unit:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Ünite bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Ünite güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Ünite sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Ünite var mı kontrol et
    const existingUnit = await prisma.unit.findUnique({
      where: { id: params.id },
      include: {
        topics: true,
      },
    })

    if (!existingUnit) {
      return NextResponse.json(
        { error: "Ünite bulunamadı" },
        { status: 404 }
      )
    }

    // İlişkili kayıtları sil
    try {
      // 1. Her topic için progress kayıtlarını sil
      for (const topic of existingUnit.topics) {
        await prisma.progress.deleteMany({
          where: { topicId: topic.id },
        })
      }

      // 2. Topic'leri sil
      await prisma.topic.deleteMany({
        where: { unitId: params.id },
      })

      // 3. Üniteyi sil
      await prisma.unit.delete({
        where: { id: params.id },
      })

      return NextResponse.json({ message: "Ünite ve tüm konuları başarıyla silindi" })
    } catch (deleteError) {
      console.error("Error during unit cascade delete:", deleteError)
      return NextResponse.json(
        { error: "Ünite silinirken bir hata oluştu" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error deleting unit:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Ünite bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Ünite silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

