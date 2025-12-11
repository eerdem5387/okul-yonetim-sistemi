import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { DisruptionType } from "@prisma/client"

// GET - Tüm aksamaları listele
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get("academicYearId")
    const type = searchParams.get("type")

    const where: Record<string, unknown> = {}
    if (academicYearId) {
      where.academicYearId = academicYearId
    }
    if (type) {
      where.type = type as DisruptionType
    }

    const disruptions = await prisma.disruption.findMany({
      where,
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    })

    return NextResponse.json(disruptions)
  } catch (error) {
    console.error("Error fetching disruptions:", error)
    return NextResponse.json(
      { error: "Aksamalar getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni aksama ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      academicYearId,
      type,
      reason,
      startDate,
      endDate,
      affectedSubjects,
      createdBy,
    } = body

    if (!academicYearId || !type || !reason || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Akademik yıl ID, tip, sebep, başlangıç ve bitiş tarihi zorunludur" },
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

    if (start > end) {
      return NextResponse.json(
        { error: "Bitiş tarihi başlangıç tarihinden önce olamaz" },
        { status: 400 }
      )
    }

    const disruption = await prisma.disruption.create({
      data: {
        academicYearId,
        type: type as DisruptionType,
        reason: reason.trim(),
        startDate: start,
        endDate: end,
        affectedSubjects: Array.isArray(affectedSubjects) ? affectedSubjects : [],
        createdBy: createdBy || null,
      },
    })

    return NextResponse.json(disruption, { status: 201 })
  } catch (error) {
    console.error("Error creating disruption:", error)
    return NextResponse.json(
      { error: "Aksama oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

