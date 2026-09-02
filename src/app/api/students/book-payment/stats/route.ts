import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import {
  gradeLevelLabel,
  k12GradeWhereClause,
  parseStudentGradeLevel,
} from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

/** Sınıf bazında kitap durumu özeti (5–12): Aldı / Almadı. */
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

    const byGrade: Record<number, { received: number; notReceived: number }> = {}
    for (let g = 5; g <= 12; g++) {
      byGrade[g] = { received: 0, notReceived: 0 }
    }

    for (const s of students) {
      const level = parseStudentGradeLevel(s.grade)
      if (level == null || level < 5 || level > 12) continue
      if (s.bookPaymentPaid === true) byGrade[level].received++
      else byGrade[level].notReceived++
    }

    const grades = []
    let totalsReceived = 0
    let totalsNotReceived = 0

    for (let g = 5; g <= 12; g++) {
      const row = byGrade[g]
      const total = row.received + row.notReceived
      totalsReceived += row.received
      totalsNotReceived += row.notReceived
      grades.push({
        grade: g,
        label: gradeLevelLabel(g),
        received: row.received,
        notReceived: row.notReceived,
        total,
      })
    }

    return NextResponse.json({
      grades,
      totals: {
        received: totalsReceived,
        notReceived: totalsNotReceived,
        total: totalsReceived + totalsNotReceived,
      },
    })
  } catch (e) {
    console.error("GET /api/students/book-payment/stats", e)
    return NextResponse.json({ error: "Kitap özeti yüklenemedi" }, { status: 500 })
  }
}
