import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Tüm bildirimleri okundu işaretle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetRole, targetUserId } = body

    const where: any = { isRead: false }

    if (targetRole) {
      where.OR = [{ targetRole: targetRole }, { targetRole: null }]
    }

    if (targetUserId) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [{ targetUserId: targetUserId }, { targetUserId: null }],
        },
      ]
    }

    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
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

