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
    
    // Tüm kayıt yenilemelerini çek (student bilgisiyle birlikte)
    const whereClause: Record<string, unknown> = {}
    
    // Tarih filtresi ekle
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter
    }
    
    // Tüm kayıt yenilemelerini çek
    const allRenewals = await prisma.renewal.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            grade: true,
            tcNumber: true,
          }
        }
      }
    })
    
    // Sadece geçerli student'ı olan kayıtları filtrele
    const renewals = allRenewals.filter(r => r.student !== null)
    
    // Debug: Toplam kayıt sayısını logla (sadece development'ta)
    if (process.env.NODE_ENV === 'development') {
      const totalCountInDB = allRenewals.length
      const validCount = renewals.length
      console.log(`[Renewal Stats] Total renewals in DB: ${totalCountInDB}, Valid (with student): ${validCount}`)
      
      // Eğer fark varsa, detaylı log
      if (totalCountInDB !== validCount) {
        const invalidRenewals = allRenewals.filter(r => !r.student)
        if (invalidRenewals.length > 0) {
          console.log(`[Renewal Stats] Found ${invalidRenewals.length} renewals without valid student:`, invalidRenewals.map(r => ({ id: r.id, studentId: r.studentId })))
        }
      }
    }
    
    // TC numarasına göre benzersiz öğrenci sayısını hesapla
    // Önce student.tcNumber'ı kullan (güncel ve doğru kaynak), yoksa contractData.tcNumber'ı kullan
    // student.tcNumber öncelikli çünkü TC düzeltildiğinde student tablosu güncelleniyor
    const getTcNumber = (renewal: typeof renewals[0]): string => {
      if (!renewal.student) return ''
      // Önce student.tcNumber'ı kullan (güncel ve doğru kaynak)
      if (renewal.student.tcNumber && renewal.student.tcNumber.trim() !== '') {
        return renewal.student.tcNumber.trim()
      }
      // Eğer student.tcNumber yoksa, contractData.tcNumber'ı kullan
      const contractData = renewal.contractData as Record<string, unknown>
      const tcNumberFromContract = contractData.tcNumber as string | undefined
      return (tcNumberFromContract && typeof tcNumberFromContract === 'string' && tcNumberFromContract.trim() !== '') 
        ? tcNumberFromContract.trim() 
        : ''
    }
    
    // Benzersiz öğrenci setleri (TC numarasına göre)
    const uniqueStudents = new Set<string>()
    const todayStudents = new Set<string>()
    const thisWeekStudents = new Set<string>()
    const thisMonthStudents = new Set<string>()
    const sinifStudentMap = new Map<string, Set<string>>() // sinif -> Set of TC numbers
    
    // Tarih aralıkları
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay())
    thisWeek.setHours(0, 0, 0, 0)
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    
    // Kayıtları işle ve benzersiz öğrencileri say
    renewals.forEach(r => {
      if (!r.student) return // Güvenlik kontrolü
      
      const tcNumber = getTcNumber(r)
      if (!tcNumber) return
      
      // Toplam benzersiz öğrenci
      uniqueStudents.add(tcNumber)
      
      // Tarih bazlı benzersiz öğrenciler
      const createdAt = new Date(r.createdAt)
      const createdAtDateOnly = new Date(createdAt)
      createdAtDateOnly.setHours(0, 0, 0, 0)
      
      if (createdAtDateOnly.getTime() === today.getTime()) {
        todayStudents.add(tcNumber)
      }
      
      if (createdAt >= thisWeek) {
        thisWeekStudents.add(tcNumber)
      }
      
      if (createdAtDateOnly >= thisMonth) {
        thisMonthStudents.add(tcNumber)
      }
      
      // Sınıf bazında: Listeyle aynı mantık – sözleşmedeki sınıf (studentClass) yoksa öğrencinin sınıfı (student.grade) kullanılır.
      // Sınıf anahtarı her zaman "X. Sınıf" (boşluklu) olmalı ki sinifStats ile eşleşsin.
      const contractData = r.contractData as Record<string, unknown>
      const contractGrade = (contractData?.studentClass as string) || r.student.grade || ''
      const grade = typeof contractGrade === 'string' ? contractGrade.trim() : ''
      let sinif = ''
      if (grade) {
        const gradeNum = parseInt(grade.replace(/\D/g, ''), 10)
        if (!isNaN(gradeNum) && gradeNum >= 5 && gradeNum <= 12) {
          sinif = `${gradeNum}. Sınıf`
        }
      }

      if (sinif) {
        if (!sinifStudentMap.has(sinif)) {
          sinifStudentMap.set(sinif, new Set())
        }
        sinifStudentMap.get(sinif)!.add(tcNumber)
      }
    })
    
    // Sınıf bazında sayım (benzersiz öğrenci sayısı)
    const sinifStats: Record<string, number> = {}
    // Önce tüm sınıfları 0 ile başlat (5-12. Sınıf)
    for (let i = 5; i <= 12; i++) {
      sinifStats[`${i}. Sınıf`] = 0
    }
    
    // Her sınıf için benzersiz öğrenci sayısını hesapla
    sinifStudentMap.forEach((studentSet, sinif) => {
      if (sinifStats.hasOwnProperty(sinif)) {
        sinifStats[sinif] = studentSet.size
      }
    })
    
    const todayCount = todayStudents.size
    const thisWeekCount = thisWeekStudents.size
    const thisMonthCount = thisMonthStudents.size
    const totalCount = uniqueStudents.size
    
    // Akademik yıl bazlı istatistikler (sadece kayıt yapılan yıllar)
    // Benzersiz öğrenci sayısını say (TC numarasına göre)
    const academicYearStats: Record<string, number> = {}
    const academicYearStudentMap = new Map<string, Set<string>>() // year -> Set of TC numbers
    
    renewals.forEach(renewal => {
      if (!renewal.student) return
      const contractData = renewal.contractData as Record<string, unknown>
      const year = contractData.academicYear as string | undefined
      // Akademik yıl değeri varsa ve geçerli bir string ise kullan, yoksa "Belirtilmemiş" olarak işaretle
      const yearKey = (year && typeof year === 'string' && year.trim() !== '') 
        ? year.trim() 
        : 'Belirtilmemiş'
      
      if (!academicYearStudentMap.has(yearKey)) {
        academicYearStudentMap.set(yearKey, new Set())
      }
      // TC numarasını contractData'dan veya student'tan al
      const tcNumber = getTcNumber(renewal)
      if (tcNumber) {
        academicYearStudentMap.get(yearKey)!.add(tcNumber)
      }
    })
    
    // Her akademik yıl için benzersiz öğrenci sayısını hesapla
    academicYearStudentMap.forEach((studentSet, year) => {
      academicYearStats[year] = studentSet.size
    })
    
    const responseData = {
      total: totalCount,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      sinifStats,
      academicYearStats, // Akademik yıl bazlı istatistikler
    }
    
    // Debug log (sadece development'ta)
    if (process.env.NODE_ENV === 'development') {
      console.log("[Renewal Stats API] Returning stats:", JSON.stringify(responseData, null, 2))
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching renewal stats:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    // Prisma hataları için özel mesaj
    if (error instanceof Error && (
      error.message.includes("Prisma") ||
      error.message.includes("P2002") ||
      error.message.includes("P2003")
    )) {
      return NextResponse.json(
        { error: "Veritabanı hatası oluştu", details: errorMessage },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: "İstatistikler alınırken bir hata oluştu", details: errorMessage },
      { status: 500 }
    )
  }
}

