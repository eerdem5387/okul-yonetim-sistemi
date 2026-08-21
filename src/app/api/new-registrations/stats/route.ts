import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getRenewalTargetContext,
  normalizeAcademicYearLabel,
} from "@/lib/student-registration-meta"
import {
  gradeLevelLabel,
  k12GradeWhereClause,
} from "@/lib/student-grade-level"
import { buildEnrollmentRegistrationGradeBreakdown } from "@/lib/enrolled-grade-counts"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const academicYear = searchParams.get("academicYear") || ""

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

    const whereClause: Record<string, unknown> = {}
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter
    }

    const allRegistrations = await prisma.newRegistration.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            grade: true,
            tcNumber: true,
          },
        },
      },
    })

    let registrations = allRegistrations.filter((r) => r.student !== null)

    if (academicYear) {
      const want = normalizeAcademicYearLabel(academicYear)
      registrations = registrations.filter((reg) => {
        const contractData = reg.contractData as Record<string, unknown>
        const raw = String(contractData.academicYear ?? "").trim()
        return raw !== "" && normalizeAcademicYearLabel(raw) === want
      })
    }

    const getTcNumber = (reg: (typeof registrations)[0]): string => {
      if (!reg.student) return ""
      if (reg.student.tcNumber && reg.student.tcNumber.trim() !== "") {
        return reg.student.tcNumber.trim()
      }
      const contractData = reg.contractData as Record<string, unknown>
      const tcNumberFromContract = contractData.tcNumber as string | undefined
      return tcNumberFromContract &&
        typeof tcNumberFromContract === "string" &&
        tcNumberFromContract.trim() !== ""
        ? tcNumberFromContract.trim()
        : ""
    }

    const uniqueStudents = new Set<string>()
    const todayStudents = new Set<string>()
    const thisWeekStudents = new Set<string>()
    const thisMonthStudents = new Set<string>()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay())
    thisWeek.setHours(0, 0, 0, 0)
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    registrations.forEach((r) => {
      if (!r.student) return

      const tcNumber = getTcNumber(r)
      if (!tcNumber) return

      uniqueStudents.add(tcNumber)

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

    // Sınıf kartları: kayıt yenileme ile aynı öğrenci-kümesi hesabı
    const renewalCtx = await getRenewalTargetContext(prisma)
    const allStudents = await prisma.student.findMany({
      where: k12GradeWhereClause(),
      select: {
        id: true,
        grade: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
      },
    })
    const sinifBreakdownRaw = buildEnrollmentRegistrationGradeBreakdown({
      students: allStudents,
      renewedStudentIds: renewalCtx.renewedStudentIds,
      newRegistrationStudentIds: renewalCtx.newRegistrationStudentIds,
      newRegistrationActiveYearStudentIds:
        renewalCtx.newRegistrationActiveYearStudentIds,
      futureYearOnlyNewRegistrationStudentIds:
        renewalCtx.futureYearOnlyNewRegistrationStudentIds,
    })

    const sinifStats: Record<string, number> = {}
    const sinifBreakdown: Record<
      string,
      (typeof sinifBreakdownRaw)[string] & { newRegistrations: number }
    > = {}
    for (let g = 5; g <= 12; g++) {
      const lab = gradeLevelLabel(g)
      const row = sinifBreakdownRaw[lab]
      sinifStats[lab] = row.newRegistration
      sinifBreakdown[lab] = {
        ...row,
        // Geriye uyumluluk (eski UI alan adı)
        newRegistrations: row.newRegistration,
      }
    }

    const academicYearStats: Record<string, number> = {}
    const academicYearBuckets = new Map<
      string,
      { displayLabel: string; students: Set<string> }
    >()

    registrations.forEach((reg) => {
      if (!reg.student) return
      const contractData = reg.contractData as Record<string, unknown>
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
      const tcNumber = getTcNumber(reg)
      if (tcNumber) {
        academicYearBuckets.get(canon)!.students.add(tcNumber)
      }
    })

    academicYearBuckets.forEach((b) => {
      academicYearStats[b.displayLabel] = b.students.size
    })

    const responseData = {
      total: uniqueStudents.size,
      today: todayStudents.size,
      thisWeek: thisWeekStudents.size,
      thisMonth: thisMonthStudents.size,
      sinifStats,
      sinifBreakdown,
      academicYearStats,
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching new registration stats:", error)
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    )
    console.error(
      "Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    )

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    if (
      error instanceof Error &&
      (error.message.includes("Prisma") ||
        error.message.includes("P2002") ||
        error.message.includes("P2003"))
    ) {
      return NextResponse.json(
        { error: "Veritabanı hatası oluştu", details: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: "İstatistikler alınırken bir hata oluştu",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
