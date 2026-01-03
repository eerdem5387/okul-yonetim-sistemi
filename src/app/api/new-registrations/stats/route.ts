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
    
    // Sadece geçerli student'ı olan kayıtları say (student silinmiş olabilir)
    const baseWhere: Record<string, unknown> = {
      student: {
        isNot: null
      }
    }
    
    // Tarih filtresi ekle
    if (Object.keys(dateFilter).length > 0) {
      baseWhere.createdAt = dateFilter
    }
    
    // Tüm yeni kayıtları çek (sadece geçerli student'ı olanlar)
    const registrations = await prisma.newRegistration.findMany({
      where: baseWhere,
      include: {
        student: {
          select: {
            grade: true,
          }
        }
      }
    })
    
    // Debug: Toplam kayıt sayısını logla
    const totalCountInDB = await prisma.newRegistration.count()
    const validCount = registrations.length
    console.log(`[Stats] Total registrations in DB: ${totalCountInDB}, Valid (with student): ${validCount}`)
    
    // Eğer fark varsa, detaylı log
    if (totalCountInDB !== validCount) {
      const invalidRegistrations = await prisma.newRegistration.findMany({
        where: {
          student: null
        },
        select: {
          id: true,
          createdAt: true,
          studentId: true
        }
      })
      console.log(`[Stats] Found ${invalidRegistrations.length} registrations without valid student:`, invalidRegistrations)
    }
    
    // Sınıf bazında sayım
    const sinifStats: Record<string, number> = {}
    registrations.forEach(r => {
      const grade = r.student?.grade || 'Belirtilmemiş'
      const sinif = `${grade}. Sınıf`
      sinifStats[sinif] = (sinifStats[sinif] || 0) + 1
    })
    
    // Bugün, bu hafta, bu ay
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay())
    thisWeek.setHours(0, 0, 0, 0)
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    
    const todayCount = registrations.filter(r => {
      const createdAt = new Date(r.createdAt)
      createdAt.setHours(0, 0, 0, 0)
      return createdAt.getTime() === today.getTime()
    }).length
    
    const thisWeekCount = registrations.filter(r => {
      const createdAt = new Date(r.createdAt)
      return createdAt >= thisWeek
    }).length
    
    const thisMonthCount = registrations.filter(r => {
      const createdAt = new Date(r.createdAt)
      createdAt.setHours(0, 0, 0, 0)
      return createdAt >= thisMonth
    }).length
    
    return NextResponse.json({
      total: registrations.length,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      sinifStats,
    })
  } catch (error) {
    console.error("Error fetching new registration stats:", error)
    return NextResponse.json(
      { error: "İstatistikler alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

