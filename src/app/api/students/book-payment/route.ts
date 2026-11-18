import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/auth/api-guard"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import { gradeBandWhereClause, gradeLevelWhereClause, k12GradeWhereClause } from "@/lib/student-grade-level"
import { studentBookNotReceivedWhere } from "@/lib/student-book-payment"
import { buildStudentSearchWhere } from "@/lib/turkish-search"

export const dynamic = "force-dynamic"

/** Kitap almadı olarak işaretlenmemiş öğrenciler (bookPaymentPaid !== true). */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "12", 10) || 12), 50)
    const search = searchParams.get("search") || ""
    const grade = searchParams.get("grade") || ""
    const gradeBand = searchParams.get("gradeBand") || ""

    const whereConditions: Array<Record<string, unknown>> = [
      k12GradeWhereClause(),
      studentBookNotReceivedWhere(),
    ]

    const regCtx = await getRenewalTargetContext(prisma)
    if (regCtx.futureYearOnlyNewRegistrationStudentIds.size > 0) {
      whereConditions.push({
        NOT: { id: { in: [...regCtx.futureYearOnlyNewRegistrationStudentIds] } },
      })
    }

    if (grade) {
      // Öğrenci listesiyle aynı davranış: "5" ve "5. Sınıf" birlikte eşleşir
      const level = parseInt(grade, 10)
      if (!Number.isNaN(level) && level >= 5 && level <= 12) {
        whereConditions.push(gradeLevelWhereClause(level))
      } else {
        whereConditions.push({ grade: { equals: grade, mode: "insensitive" as const } })
      }
    } else {
      const band = gradeBandWhereClause(gradeBand)
      if (band) whereConditions.push(band)
    }

    const searchWhere = buildStudentSearchWhere(search)
    if (searchWhere) whereConditions.push(searchWhere)

    const where = { AND: whereConditions }
    const skip = (page - 1) * limit

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          bookPaymentPaid: true,
        },
      }),
    ])

    return NextResponse.json({
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (e) {
    console.error("GET /api/students/book-payment", e)
    return NextResponse.json({ error: "Kitap listesi yüklenemedi" }, { status: 500 })
  }
}
