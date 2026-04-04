import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import { gradeLevelLabel, parseStudentGradeLevel } from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

function isMezunGrade(grade: string): boolean {
  const t = grade.trim().toLowerCase()
  return t === "mezun" || t.includes("mezun")
}

/**
 * Öğrenci yönetimi sayfası: özet istatistikler, sınıf düzeyi / şube dağılımı (aktif akademik yıl).
 */
export async function GET() {
  try {
    const yearRows = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
    })

    const activeYear =
      yearRows.find((y) => y.isActive) ??
      yearRows.find((y) => {
        const now = Date.now()
        const s = y.startDate.getTime()
        const e = y.endDate.getTime()
        return now >= s && now <= e
      }) ??
      null

    const { target, renewedStudentIds, newRegistrationStudentIds } =
      await getRenewalTargetContext(prisma)

    const baseStudentWhere = {
      NOT: { grade: { equals: "Mezun", mode: "insensitive" as const } },
    }

    const allStudents = await prisma.student.findMany({
      where: baseStudentWhere,
      select: { id: true, grade: true },
    })

    const effectiveStudents = allStudents.filter((s) => !isMezunGrade(s.grade))

    const byGrade: Record<string, number> = {}
    for (let g = 5; g <= 12; g++) {
      byGrade[gradeLevelLabel(g)] = 0
    }
    let ortaokul = 0
    let lise = 0
    for (const s of effectiveStudents) {
      const level = parseStudentGradeLevel(s.grade)
      if (level == null) continue
      const label = gradeLevelLabel(level)
      if (byGrade[label] !== undefined) {
        byGrade[label] += 1
      }
      if (level >= 5 && level <= 8) ortaokul += 1
      if (level >= 9 && level <= 12) lise += 1
    }

    const totalStudents = effectiveStudents.length

    const newRegInScope = effectiveStudents.filter((s) =>
      newRegistrationStudentIds.has(s.id)
    ).length
    const renewedOnlyInScope = effectiveStudents.filter(
      (s) => renewedStudentIds.has(s.id) && !newRegistrationStudentIds.has(s.id)
    ).length
    const covered = new Set<string>()
    for (const s of effectiveStudents) {
      if (renewedStudentIds.has(s.id) || newRegistrationStudentIds.has(s.id)) {
        covered.add(s.id)
      }
    }
    const notRenewedCount = effectiveStudents.filter((s) => !covered.has(s.id)).length

    type ClassRow = { id: string; name: string; grade: number; studentCount: number }
    const byGradeMap: Record<number, ClassRow[]> = {}
    for (let g = 5; g <= 12; g++) {
      byGradeMap[g] = []
    }

    if (activeYear) {
      const classes = await prisma.class.findMany({
        where: { academicYearId: activeYear.id },
        select: {
          id: true,
          name: true,
          grade: true,
          section: true,
          _count: { select: { students: true } },
        },
        orderBy: [{ grade: "asc" }, { section: "asc" }],
      })
      for (const c of classes) {
        if (c.grade < 5 || c.grade > 12) continue
        byGradeMap[c.grade].push({
          id: c.id,
          name: c.name,
          grade: c.grade,
          studentCount: c._count.students,
        })
      }
    }

    const byGradeClasses = [5, 6, 7, 8, 9, 10, 11, 12].map((grade) => ({
      grade,
      classes: byGradeMap[grade],
    }))

    return NextResponse.json({
      activeAcademicYear: activeYear
        ? { id: activeYear.id, name: activeYear.name }
        : null,
      renewalTargetYear: target,
      totalStudents,
      ortaokulCount: ortaokul,
      liseCount: lise,
      byGradeCounts: byGrade,
      byGradeClasses,
      registrationCounts: {
        renewed: renewedOnlyInScope,
        newRegistration: newRegInScope,
        notRenewed: notRenewedCount,
      },
    })
  } catch (e) {
    console.error("GET /api/students/overview", e)
    return NextResponse.json({ error: "Özet yüklenemedi" }, { status: 500 })
  }
}
