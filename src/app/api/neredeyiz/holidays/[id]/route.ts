import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { HolidayType } from "@prisma/client"

// GET - Tek tatil getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const holiday = await prisma.holiday.findUnique({
      where: { id: params.id },
      include: {
        academicYear: true,
      },
    })

    if (!holiday) {
      return NextResponse.json(
        { error: "Tatil bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(holiday)
  } catch (error) {
    console.error("Error fetching holiday:", error)
    return NextResponse.json(
      { error: "Tatil getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Tatil güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { name, type, startDate, endDate, description } = body

    if (!name || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Ad, tip, başlangıç ve bitiş tarihi zorunludur" },
        { status: 400 }
      )
    }

    const holiday = await prisma.holiday.update({
      where: { id: params.id },
      data: {
        name,
        type: type as HolidayType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || null,
      },
    })

    return NextResponse.json(holiday)
  } catch (error) {
    console.error("Error updating holiday:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Tatil bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Tatil güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Tatil sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.holiday.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Tatil başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting holiday:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Tatil bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Tatil silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

