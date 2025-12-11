import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tüm akademik yılları listele
export async function GET() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: {
        startDate: "desc",
      },
    })

    return NextResponse.json(academicYears)
  } catch (error) {
    console.error("Error fetching academic years:", error)
    return NextResponse.json(
      { error: "Akademik yıllar getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni akademik yıl oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, startDate, endDate, isActive } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Ad, başlangıç ve bitiş tarihi zorunludur" },
        { status: 400 }
      )
    }

    // Tarih validasyonu
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Geçersiz tarih formatı" },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır" },
        { status: 400 }
      )
    }

    // Eğer aktif yapılıyorsa, diğer aktif yılları pasif yap
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        startDate: start,
        endDate: end,
        isActive: isActive || false,
      },
    })

    return NextResponse.json(academicYear, { status: 201 })
  } catch (error) {
    console.error("Error creating academic year:", error)
    return NextResponse.json(
      { error: "Akademik yıl oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

