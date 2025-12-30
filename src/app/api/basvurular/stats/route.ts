import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    
    // Tarih filtresi
    const dateFilter: Record<string, unknown> = {}
    if (startDate || endDate) {
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        dateFilter.lte = endDateTime
      }
    }
    
    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
    
    // Tüm başvuruları çek
    const basvurular = await prisma.basvuru.findMany({
      where,
      select: {
        ogrenciSinifi: true,
        okul: true,
        babaMeslek: true,
        anneMeslek: true,
        createdAt: true,
        sinavGunu: true,
      }
    })
    
    // Sınıf bazında sayım
    const sinifStats: Record<string, number> = {}
    basvurular.forEach(b => {
      const sinif = b.ogrenciSinifi || 'Belirtilmemiş'
      sinifStats[sinif] = (sinifStats[sinif] || 0) + 1
    })
    
    // Okul bazında sayım (top 10)
    const okulStats: Record<string, number> = {}
    basvurular.forEach(b => {
      const okul = b.okul || 'Belirtilmemiş'
      okulStats[okul] = (okulStats[okul] || 0) + 1
    })
    
    // Meslek bazında sayım (top 10)
    const babaMeslekStats: Record<string, number> = {}
    const anneMeslekStats: Record<string, number> = {}
    basvurular.forEach(b => {
      if (b.babaMeslek) {
        babaMeslekStats[b.babaMeslek] = (babaMeslekStats[b.babaMeslek] || 0) + 1
      }
      if (b.anneMeslek) {
        anneMeslekStats[b.anneMeslek] = (anneMeslekStats[b.anneMeslek] || 0) + 1
      }
    })
    
    // Bugün, bu hafta, bu ay
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - 7)
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    
    const todayCount = basvurular.filter(b => new Date(b.createdAt) >= today).length
    const weekCount = basvurular.filter(b => new Date(b.createdAt) >= thisWeek).length
    const monthCount = basvurular.filter(b => new Date(b.createdAt) >= thisMonth).length
    
    // Gün bazında sayım (10 Ocak Cumartesi ve 11 Ocak Pazar)
    // sinavGunu alanında "10 Ocak Cumartesi", "11 Ocak Pazar" veya sadece "Cumartesi", "Pazar" olabilir
    const saturdayCount = basvurular.filter(b => {
      const gun = b.sinavGunu || ''
      return gun.includes('Cumartesi') || gun.includes('10 Ocak')
    }).length
    
    const sundayCount = basvurular.filter(b => {
      const gun = b.sinavGunu || ''
      return gun.includes('Pazar') || gun.includes('11 Ocak')
    }).length
    
    return NextResponse.json({
      total: basvurular.length,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      saturdayCount, // 10 Ocak Cumartesi
      sundayCount,   // 11 Ocak Pazar
      sinifStats,
      topOkullar: Object.entries(okulStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([okul, count]) => ({ okul, count })),
      topBabaMeslekler: Object.entries(babaMeslekStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([meslek, count]) => ({ meslek, count })),
      topAnneMeslekler: Object.entries(anneMeslekStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([meslek, count]) => ({ meslek, count })),
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

