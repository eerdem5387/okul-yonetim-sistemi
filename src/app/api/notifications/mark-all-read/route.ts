import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Tüm bildirimleri okundu işaretle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetRole, targetUserId } = body

    // Where clause'u düzgün oluştur
    const whereConditions: Record<string, unknown> = {
      isRead: false
    }

    // targetRole ve targetUserId varsa ekle
    if (targetRole) {
      whereConditions.targetRole = targetRole
    }

    if (targetUserId) {
      whereConditions.targetUserId = targetUserId
    }

    const result = await prisma.notification.updateMany({
      where: whereConditions,
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "Tüm bildirimler okundu olarak işaretlendi",
      count: result.count,
    })
  } catch (error) {
    console.error("Error marking all as read:", error)
    return NextResponse.json(
      { error: "Bildirimler güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

