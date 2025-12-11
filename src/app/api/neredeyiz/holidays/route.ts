import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { HolidayType } from "@prisma/client"

// GET - Tüm tatilleri listele
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get("academicYearId")

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Akademik yıl ID zorunludur" },
        { status: 400 }
      )
    }

    const holidays = await prisma.holiday.findMany({
      where: { academicYearId },
      orderBy: {
        startDate: "asc",
      },
    })

    return NextResponse.json(holidays)
  } catch (error) {
    console.error("Error fetching holidays:", error)
    return NextResponse.json(
      { error: "Tatiller getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni tatil ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { academicYearId, name, type, startDate, endDate, description } = body

    if (!academicYearId || !name || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Akademik yıl ID, ad, tip, başlangıç ve bitiş tarihi zorunludur" },
        { status: 400 }
      )
    }

    const holiday = await prisma.holiday.create({
      data: {
        academicYearId,
        name,
        type: type as HolidayType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || null,
      },
    })

    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    console.error("Error creating holiday:", error)
    return NextResponse.json(
      { error: "Tatil oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

