import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"

export async function GET(request: NextRequest) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const [
      totalEvents,
      totalParticipants,
      byMainType,
      byVerificationStatus,
      recentEvents,
    ] = await Promise.all([
      prisma.activityEvent.count(),
      prisma.activityParticipant.count(),
      prisma.activityEvent.groupBy({
        by: ["mainType"],
        _count: { id: true },
      }),
      prisma.activityParticipant.groupBy({
        by: ["verificationStatus"],
        _count: { id: true },
      }),
      prisma.activityEvent.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          teacher: { select: { firstName: true, lastName: true } },
          _count: { select: { participants: true } },
        },
      }),
    ])

    const byMainTypeMap: Record<string, number> = {}
    for (const item of byMainType) {
      byMainTypeMap[item.mainType] = item._count.id
    }

    const verificationMap: Record<string, number> = {
      IMZA_SURECINDE: 0,
      ONAY_BEKLIYOR: 0,
      ONAYLANDI: 0,
    }
    for (const item of byVerificationStatus) {
      verificationMap[item.verificationStatus] = item._count.id
    }

    return NextResponse.json({
      totalEvents,
      totalParticipants,
      byMainType: byMainTypeMap,
      verification: verificationMap,
      recentEvents,
    })
  } catch (error) {
    console.error("GET /api/activity-events/stats error:", error)
    return NextResponse.json({ error: "İstatistikler yüklenirken hata oluştu" }, { status: 500 })
  }
}
