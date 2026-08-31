import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import {
  gradeLevelLabel,
  k12GradeWhereClause,
  parseStudentGradeLevel,
} from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

/** Sınıf bazında kitap ödemesi özeti (5–12). */
export async function GET() {
  try {
    const whereConditions: Array<Record<string, unknown>> = [k12GradeWhereClause()]

    const regCtx = await getRenewalTargetContext(prisma)
    if (regCtx.futureYearOnlyNewRegistrationStudentIds.size > 0) {
      whereConditions.push({
        NOT: { id: { in: [...regCtx.futureYearOnlyNewRegistrationStudentIds] } },
      })
    }

    const students = await prisma.student.findMany({
      where: { AND: whereConditions },
      select: { grade: true, bookPaymentPaid: true },
    })

    const byGrade: Record<number, { paid: number; unpaid: number; unknown: number }> = {}
    for (let g = 5; g <= 12; g++) {
      byGrade[g] = { paid: 0, unpaid: 0, unknown: 0 }
    }

    for (const s of students) {
      const level = parseStudentGradeLevel(s.grade)
      if (level == null || level < 5 || level > 12) continue
      if (s.bookPaymentPaid === true) byGrade[level].paid++
      else if (s.bookPaymentPaid === false) byGrade[level].unpaid++
      else byGrade[level].unknown++
    }

    const grades = []
    let totalsPaid = 0
    let totalsUnpaid = 0
    let totalsUnknown = 0

    for (let g = 5; g <= 12; g++) {
      const row = byGrade[g]
      const total = row.paid + row.unpaid + row.unknown
      totalsPaid += row.paid
      totalsUnpaid += row.unpaid
      totalsUnknown += row.unknown
      grades.push({
        grade: g,
        label: gradeLevelLabel(g),
        paid: row.paid,
        unpaid: row.unpaid,
        unknown: row.unknown,
        notPaid: row.unpaid + row.unknown,
        total,
      })
    }

    return NextResponse.json({
      grades,
      totals: {
        paid: totalsPaid,
        unpaid: totalsUnpaid,
        unknown: totalsUnknown,
        notPaid: totalsUnpaid + totalsUnknown,
        total: totalsPaid + totalsUnpaid + totalsUnknown,
      },
    })
  } catch (e) {
    console.error("GET /api/students/book-payment/stats", e)
    return NextResponse.json({ error: "Kitap ödemesi özeti yüklenemedi" }, { status: 500 })
  }
}
