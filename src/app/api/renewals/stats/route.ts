import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  contractMatchesAcademicYearTargets,
  getRenewalTargetContext,
  normalizeAcademicYearLabel,
} from "@/lib/student-registration-meta"
import {
  gradeLevelLabel,
  k12GradeWhereClause,
  parseStudentGradeLevel,
} from "@/lib/student-grade-level"
import {
  buildGradeFractionRows,
  enrolledCountsFromStudentRows,
} from "@/lib/enrolled-grade-counts"

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
    })

    const renewalCtx = await getRenewalTargetContext(prisma)
    const renewalMatchTargets = renewalCtx.target
      ? [{ id: renewalCtx.target.id, label: renewalCtx.target.label }]
      : []

    const allStudents = await prisma.student.findMany({
      where: k12GradeWhereClause(),
      select: { id: true, grade: true },
    })
    const gradeTotals = enrolledCountsFromStudentRows(
      allStudents,
      renewalCtx.futureYearOnlyNewRegistrationStudentIds
    )

    const renewedTcByGrade = new Map<string, Set<string>>()
    for (let g = 5; g <= 12; g++) {
      renewedTcByGrade.set(gradeLevelLabel(g), new Set())
    }

    for (const r of renewals) {
      if (!r.student) continue
      if (!contractMatchesAcademicYearTargets(r.contractData, renewalMatchTargets)) {
        continue
      }
      const tcNumber = getTcNumber(r)
      if (!tcNumber) continue
      const level = parseStudentGradeLevel(r.student.grade)
      if (level == null) continue
      const sinif = gradeLevelLabel(level)
      renewedTcByGrade.get(sinif)?.add(tcNumber)
    }

    const renewedNumerators: Record<string, number> = {}
    for (let g = 5; g <= 12; g++) {
      const lab = gradeLevelLabel(g)
      renewedNumerators[lab] = renewedTcByGrade.get(lab)?.size ?? 0
    }
    const fractionRows = buildGradeFractionRows(renewedNumerators, gradeTotals)
    const sinifBreakdown: Record<
      string,
      { renewed: number; total: number; percent: number }
    > = {}
    const sinifStats: Record<string, number> = {}
    for (let g = 5; g <= 12; g++) {
      const lab = gradeLevelLabel(g)
      const row = fractionRows[lab]
      sinifBreakdown[lab] = {
        renewed: row.numerator,
        total: row.total,
        percent: row.percent,
      }
      sinifStats[lab] = row.numerator
    }

    const todayCount = todayStudents.size
    const thisWeekCount = thisWeekStudents.size
    const thisMonthCount = thisMonthStudents.size
    const totalCount = uniqueStudents.size
    
    // Akademik yıl bazlı istatistikler (sadece kayıt yapılan yıllar)
    // Benzersiz öğrenci sayısını say (TC numarasına göre)
    const academicYearStats: Record<string, number> = {}
    const academicYearBuckets = new Map<
      string,
      { displayLabel: string; students: Set<string> }
    >()

    renewals.forEach((renewal) => {
      if (!renewal.student) return
      const contractData = renewal.contractData as Record<string, unknown>
      const raw =
        typeof contractData.academicYear === "string"
          ? contractData.academicYear.trim()
          : ""
      const canon = raw ? normalizeAcademicYearLabel(raw) : "__none__"
      if (!academicYearBuckets.has(canon)) {
        academicYearBuckets.set(canon, {
          displayLabel: raw || "Belirtilmemiş",
          students: new Set(),
        })
      }
      const tcNumber = getTcNumber(renewal)
      if (tcNumber) {
        academicYearBuckets.get(canon)!.students.add(tcNumber)
      }
    })

    academicYearBuckets.forEach((b) => {
      academicYearStats[b.displayLabel] = b.students.size
    })
    
    const responseData = {
      total: totalCount,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      sinifStats,
      sinifBreakdown,
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

