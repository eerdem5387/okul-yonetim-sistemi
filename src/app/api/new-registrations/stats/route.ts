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
    
    // Debug: Toplam kayıt sayısını logla (sadece development'ta)
    if (process.env.NODE_ENV === 'development') {
      const totalCountInDB = await prisma.newRegistration.count()
      const validCount = registrations.length
      console.log(`[Stats] Total registrations in DB: ${totalCountInDB}, Valid (with student): ${validCount}`)
      
      // Eğer fark varsa, detaylı log
      if (totalCountInDB !== validCount) {
        const allRegistrations = await prisma.newRegistration.findMany({
          select: {
            id: true,
            createdAt: true,
            studentId: true
          }
        })
        
        const studentIds = allRegistrations.map(r => r.studentId)
        const validStudents = await prisma.student.findMany({
          where: {
            id: { in: studentIds }
          },
          select: { id: true }
        })
        
        const validStudentIds = new Set(validStudents.map(s => s.id))
        const invalidRegistrations = allRegistrations.filter(r => !validStudentIds.has(r.studentId))
        
        if (invalidRegistrations.length > 0) {
          console.log(`[Stats] Found ${invalidRegistrations.length} registrations without valid student:`, invalidRegistrations)
        }
      }
    }
    
    // Sınıf bazında sayım
    const sinifStats: Record<string, number> = {}
    // Önce tüm sınıfları 0 ile başlat (5-12. Sınıf)
    for (let i = 5; i <= 12; i++) {
      sinifStats[`${i}. Sınıf`] = 0
    }
    
    // Kayıtları say
    registrations.forEach(r => {
      const grade = r.student?.grade || ''
      // Grade formatını kontrol et (örn: "5. Sınıf" veya "5")
      let sinif = ''
      if (grade.includes('Sınıf')) {
        sinif = grade
      } else if (grade) {
        // Sadece sayı varsa "5. Sınıf" formatına çevir
        const gradeNum = parseInt(grade.replace(/\D/g, ''))
        if (gradeNum >= 5 && gradeNum <= 12) {
          sinif = `${gradeNum}. Sınıf`
        }
      }
      
      if (sinif && sinifStats.hasOwnProperty(sinif)) {
        sinifStats[sinif] = (sinifStats[sinif] || 0) + 1
      }
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
    
    const responseData = {
      total: registrations.length,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      sinifStats,
    }
    
    // Debug log (sadece development'ta)
    if (process.env.NODE_ENV === 'development') {
      console.log("[Stats API] Returning stats:", JSON.stringify(responseData, null, 2))
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching new registration stats:", error)
    return NextResponse.json(
      { error: "İstatistikler alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

