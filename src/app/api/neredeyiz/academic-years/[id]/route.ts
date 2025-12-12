import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek akademik yıl getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: params.id },
      include: {
        subjects: {
          include: {
            assignments: {
              include: {
                staff: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        holidays: true,
        disruptions: true,
      },
    })

    if (!academicYear) {
      return NextResponse.json(
        { error: "Akademik yıl bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(academicYear)
  } catch (error) {
    console.error("Error fetching academic year:", error)
    return NextResponse.json(
      { error: "Akademik yıl getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Akademik yıl güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { name, startDate, endDate, isActive, weekendDays } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Ad, başlangıç ve bitiş tarihi zorunludur" },
        { status: 400 }
      )
    }

    // weekendDays validasyonu
    const validWeekendDays = weekendDays?.filter(
      (day: string) => day === "SATURDAY" || day === "SUNDAY"
    ) || []

    // Eğer aktif yapılıyorsa, diğer aktif yılları pasif yap
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: { isActive: true, id: { not: params.id } },
        data: { isActive: false },
      })
    }

    const academicYear = await prisma.academicYear.update({
      where: { id: params.id },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== undefined ? isActive : false,
        weekendDays: validWeekendDays,
      },
    })

    return NextResponse.json(academicYear)
  } catch (error) {
    console.error("Error updating academic year:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Akademik yıl bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Akademik yıl güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Akademik yıl sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.academicYear.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Akademik yıl başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting academic year:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Akademik yıl bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Akademik yıl silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

