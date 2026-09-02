import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import { k12GradeWhereClause } from "@/lib/student-grade-level"
import { buildStudentSearchWhere } from "@/lib/turkish-search"

export const dynamic = "force-dynamic"

/** Kitap almadı olarak işaretlenmemiş öğrenciler (bookPaymentPaid !== true). */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "12", 10)), 50)
    const search = searchParams.get("search") || ""
    const grade = searchParams.get("grade") || ""
    const gradeBand = searchParams.get("gradeBand") || ""

    const whereConditions: Array<Record<string, unknown>> = [
      k12GradeWhereClause(),
      { NOT: { bookPaymentPaid: true } },
    ]

    const regCtx = await getRenewalTargetContext(prisma)
    if (regCtx.futureYearOnlyNewRegistrationStudentIds.size > 0) {
      whereConditions.push({
        NOT: { id: { in: [...regCtx.futureYearOnlyNewRegistrationStudentIds] } },
      })
    }

    if (grade) {
      whereConditions.push({ grade: { equals: grade, mode: "insensitive" as const } })
    } else if (gradeBand === "ortaokul" || gradeBand === "lise") {
      const nums = gradeBand === "ortaokul" ? [5, 6, 7, 8] : [9, 10, 11, 12]
      const orParts: Record<string, unknown>[] = []
      for (const n of nums) {
        orParts.push({ grade: { equals: `${n}. Sınıf`, mode: "insensitive" as const } })
        orParts.push({ grade: { equals: String(n), mode: "insensitive" as const } })
      }
      whereConditions.push({ OR: orParts })
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
