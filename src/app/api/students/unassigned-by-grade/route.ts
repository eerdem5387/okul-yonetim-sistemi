import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import {
  gradeLevelWhereClause,
  parseStudentGradeLevel,
} from "@/lib/student-grade-level"
import { buildStudentSearchWhere } from "@/lib/turkish-search"

export const dynamic = "force-dynamic"

async function resolveAcademicYear(academicYearId: string | null) {
  if (academicYearId) {
    return prisma.academicYear.findUnique({ where: { id: academicYearId } })
  }

  const yearRows = await prisma.academicYear.findMany({
    orderBy: [{ startDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  })

  return (
    yearRows.find((y) => y.isActive) ??
    yearRows.find((y) => {
      if (!y.startDate || !y.endDate) return false
      const now = Date.now()
      return now >= y.startDate.getTime() && now <= y.endDate.getTime()
    }) ??
    null
  )
}

/**
 * Aktif (veya verilen) akademik yılda, sınıf düzeyi G olan fakat G düzeyinde
 * hiçbir şubeye atanmamış öğrenciler.
 *
 * Query: grade (zorunlu), academicYearId?, search?
 */
export async function GET(request: NextRequest) {
  try {
    const gradeParam = request.nextUrl.searchParams.get("grade")
    const grade = parseInt(gradeParam || "", 10)
    if (Number.isNaN(grade) || grade < 5 || grade > 12) {
      return NextResponse.json({ error: "grade 5–12 arası olmalıdır" }, { status: 400 })
    }

    const academicYearId = request.nextUrl.searchParams.get("academicYearId")
    const search = request.nextUrl.searchParams.get("search") || ""

    const activeYear = await resolveAcademicYear(academicYearId)

    if (!activeYear) {
      return NextResponse.json({
        students: [],
        classes: [],
        error: "Akademik yıl tanımlı değil",
      })
    }

    const { futureYearOnlyNewRegistrationStudentIds } = await getRenewalTargetContext(prisma)
    const excludePre = futureYearOnlyNewRegistrationStudentIds

    const classes = await prisma.class.findMany({
      where: { academicYearId: activeYear.id, grade },
      select: { id: true, name: true, grade: true, section: true },
      orderBy: [{ section: "asc" }],
    })

    const classIds = classes.map((c) => c.id)
    const assignments =
      classIds.length === 0
        ? []
        : await prisma.classStudent.findMany({
            where: { classId: { in: classIds } },
            select: { studentId: true },
          })

    const assignedInGrade = new Set<string>()
    for (const a of assignments) {
      if (excludePre.has(a.studentId)) continue
      assignedInGrade.add(a.studentId)
    }

    const whereConditions: Record<string, unknown>[] = [gradeLevelWhereClause(grade)]

    const assignedIds = [...assignedInGrade]
    if (assignedIds.length > 0) {
      whereConditions.push({ NOT: { id: { in: assignedIds } } })
    }

    if (excludePre.size > 0) {
      whereConditions.push({ NOT: { id: { in: [...excludePre] } } })
    }

    const searchWhere = buildStudentSearchWhere(search)
    if (searchWhere) {
      whereConditions.push(searchWhere)
    }

    const students = await prisma.student.findMany({
      where: { AND: whereConditions },
      select: { id: true, firstName: true, lastName: true, tcNumber: true, grade: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: search ? 500 : 5000,
    })

    // Ek güvenlik: kart sınıf düzeyi eşleşmesi
    const filtered = students.filter((s) => parseStudentGradeLevel(s.grade) === grade)

    return NextResponse.json({
      students: filtered,
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        section: c.section,
      })),
      academicYear: { id: activeYear.id, name: activeYear.name },
    })
  } catch (e) {
    console.error("GET /api/students/unassigned-by-grade", e)
    return NextResponse.json({ error: "Liste yüklenemedi" }, { status: 500 })
  }
}
