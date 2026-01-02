import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek bildirimi getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Bildirim bulunamadı" },
        { status: 404 }
      )
    }

    // Test bot uyumluluğu için
    return NextResponse.json({ notification })
  } catch (error) {
    console.error("Error fetching notification:", error)
    return NextResponse.json(
      { error: "Bildirim getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Bildirimi güncelle (okundu işaretle)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { isRead } = body

    const notification = await prisma.notification.update({
      where: { id: params.id },
      data: {
        isRead: isRead !== undefined ? isRead : true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error("Error updating notification:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Bildirim bulunamadı" }, { status: 404 })
    }
    return NextResponse.json(
      { error: "Bildirim güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Bildirimi sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.notification.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Bildirim başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Bildirim bulunamadı" }, { status: 404 })
    }
    return NextResponse.json(
      { error: "Bildirim silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

