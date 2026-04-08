import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import { k12GradeWhereClause, parseStudentGradeLevel } from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

/**
 * Aktif akademik yılda, kart sınıf düzeyi G olan fakat G düzeyinde hiçbir şubeye atanmamış öğrenciler
 * + bu düzeydeki şubeler (atama seçimi için).
 */
export async function GET(request: NextRequest) {
  try {
    const gradeParam = request.nextUrl.searchParams.get("grade")
    const grade = parseInt(gradeParam || "", 10)
    if (Number.isNaN(grade) || grade < 5 || grade > 12) {
      return NextResponse.json({ error: "grade 5–12 arası olmalıdır" }, { status: 400 })
    }

    const yearRows = await prisma.academicYear.findMany({
      orderBy: [{ startDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    })

    const activeYear =
      yearRows.find((y) => y.isActive) ??
      yearRows.find((y) => {
        if (!y.startDate || !y.endDate) return false
        const now = Date.now()
        const s = y.startDate.getTime()
        const e = y.endDate.getTime()
        return now >= s && now <= e
      }) ??
      null

    if (!activeYear) {
      return NextResponse.json({
        students: [],
        classes: [],
        error: "Aktif akademik yıl tanımlı değil",
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

    const allK12 = await prisma.student.findMany({
      where: k12GradeWhereClause(),
      select: { id: true, firstName: true, lastName: true, tcNumber: true, grade: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })

    const students = allK12.filter((s) => {
      if (excludePre.has(s.id)) return false
      const level = parseStudentGradeLevel(s.grade)
      if (level !== grade) return false
      return !assignedInGrade.has(s.id)
    })

    return NextResponse.json({
      students,
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        section: c.section,
      })),
    })
  } catch (e) {
    console.error("GET /api/students/unassigned-by-grade", e)
    return NextResponse.json({ error: "Liste yüklenemedi" }, { status: 500 })
  }
}
