import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""

    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    const where =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

    const basvurular = await prisma.yazOkuluBasvuru.findMany({
      where,
      select: {
        ogrenciSinifi: true,
        createdAt: true,
        contactStatus: true,
      },
    })

    const sinifStats: Record<string, number> = {}
    basvurular.forEach((b) => {
      const sinif = b.ogrenciSinifi || "Belirtilmemiş"
      sinifStats[sinif] = (sinifStats[sinif] || 0) + 1
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - 7)
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const todayCount = basvurular.filter(
      (b) => new Date(b.createdAt) >= today
    ).length
    const weekCount = basvurular.filter(
      (b) => new Date(b.createdAt) >= thisWeek
    ).length
    const monthCount = basvurular.filter(
      (b) => new Date(b.createdAt) >= thisMonth
    ).length

    const contactedCount = basvurular.filter(
      (b) => b.contactStatus === "ILETISIME_GECILDI"
    ).length
    const notContactedCount = basvurular.filter(
      (b) => b.contactStatus === "ILETISIME_GECILMEDI"
    ).length

    return NextResponse.json({
      total: basvurular.length,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      contactedCount,
      notContactedCount,
      sinifStats,
      sinifBreakdown: Object.entries(sinifStats)
        .sort(([, a], [, b]) => b - a)
        .map(([sinif, count]) => ({ sinif, count })),
    })
  } catch (error) {
    console.error("[Yaz Okulu] Stats hatası:", error)
    return NextResponse.json(
      { error: "İstatistikler alınamadı" },
      { status: 500 }
    )
  }
}
