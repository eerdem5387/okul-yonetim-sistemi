import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import { contractYearLabelFromAcademicYear, resolveActiveAndNextAcademicYear } from "@/lib/academic-year-ui"

export const dynamic = "force-dynamic"

/**
 * Gelecek akademik yıl için yalnızca yeni kaydı olan (ön kayıtlı) öğrenciler — sayfalama ve filtre.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)))
    const search = (searchParams.get("search") || "").trim()
    const grade = (searchParams.get("grade") || "").trim()
    const gradeBand = (searchParams.get("gradeBand") || "").trim()
    const skip = (page - 1) * limit

    const yearRows = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
    })
    const ayList = yearRows.map((r) => ({
      id: r.id,
      name: r.name,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      isActive: r.isActive,
    }))
    const { next } = resolveActiveAndNextAcademicYear(ayList)
    const targetYear = next
      ? { id: next.id, name: next.name, label: contractYearLabelFromAcademicYear(next) }
      : null

    const { futureYearOnlyNewRegistrationStudentIds } = await getRenewalTargetContext(prisma)
    const poolIds = [...futureYearOnlyNewRegistrationStudentIds]

    const whereConditions: Array<Record<string, unknown>> = [
      { id: { in: poolIds.length > 0 ? poolIds : ["__pre_enrollment_empty__"] } },
    ]

    if (search) {
      whereConditions.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { tcNumber: { contains: search } },
          { grade: { contains: search, mode: "insensitive" as const } },
        ],
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

    const where = { AND: whereConditions }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: limit,
      }),
    ])

    return NextResponse.json({
      students,
      targetYear,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (e) {
    console.error("GET /api/students/pre-enrollment", e)
    return NextResponse.json({ error: "Liste yüklenemedi" }, { status: 500 })
  }
}
