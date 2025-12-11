import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek görüşme getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const meeting = await prisma.parentMeeting.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            tcNumber: true
          }
        }
      }
    })

    if (!meeting) {
      return NextResponse.json(
        { error: "Görüşme bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error("Error fetching parent meeting:", error)
    return NextResponse.json(
      { error: "Görüşme getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Görüşme güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { meetingDate, notes, counselorName } = body

    if (!meetingDate || !notes) {
      return NextResponse.json(
        { error: "Görüşme tarihi ve notlar zorunludur" },
        { status: 400 }
      )
    }

    const meeting = await prisma.parentMeeting.update({
      where: { id: params.id },
      data: {
        meetingDate: new Date(meetingDate),
        notes,
        counselorName: counselorName || null
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            tcNumber: true
          }
        }
      }
    })

    return NextResponse.json(meeting)
  } catch (error) {
    console.error("Error updating parent meeting:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Görüşme bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Görüşme güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Görüşme sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.parentMeeting.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Görüşme başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting parent meeting:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Görüşme bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Görüşme silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

