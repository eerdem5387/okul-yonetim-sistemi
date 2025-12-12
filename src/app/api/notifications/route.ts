import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Bildirimleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetRole = searchParams.get("targetRole") as "OGRETMEN" | "REHBERLIK" | "OGRENCI_ISLERI" | null
    const targetUserId = searchParams.get("targetUserId")
    const isRead = searchParams.get("isRead")
    const type = searchParams.get("type")
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50

    const where: any = {}

    // Rol bazlı filtreleme
    if (targetRole) {
      where.OR = [
        { targetRole: targetRole },
        { targetRole: null }, // Herkese açık bildirimler
      ]
    }

    // Kullanıcı bazlı filtreleme
    if (targetUserId) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { targetUserId: targetUserId },
            { targetUserId: null }, // Herkese veya role özel bildirimler
          ],
        },
      ]
    }

    // Okunma durumu
    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === "true"
    }

    // Bildirim türü
    if (type) {
      where.type = type
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
    })

    // Okunmamış sayısı
    const unreadCount = await prisma.notification.count({
      where: {
        ...where,
        isRead: false,
      },
    })

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Bildirimler getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni bildirim oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type,
      title,
      message,
      targetRole,
      targetUserId,
      priority = "NORMAL",
      relatedSubjectId,
      relatedTopicId,
      relatedUnitId,
      relatedStaffId,
    } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Type, title ve message zorunludur" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        targetRole: targetRole || null,
        targetUserId: targetUserId || null,
        priority,
        relatedSubjectId: relatedSubjectId || null,
        relatedTopicId: relatedTopicId || null,
        relatedUnitId: relatedUnitId || null,
        relatedStaffId: relatedStaffId || null,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json(
      { error: "Bildirim oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

