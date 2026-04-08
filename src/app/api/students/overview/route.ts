import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import { contractYearLabelFromAcademicYear, resolveActiveAndNextAcademicYear } from "@/lib/academic-year-ui"
import {
  gradeLevelLabel,
  k12GradeWhereClause,
  parseStudentGradeLevel,
} from "@/lib/student-grade-level"
import {
  buildGradeFractionRows,
  enrolledCountsFromStudentRows,
} from "@/lib/enrolled-grade-counts"

export const dynamic = "force-dynamic"

/**
 * Öğrenci yönetimi sayfası: özet istatistikler, sınıf düzeyi / şube dağılımı (aktif akademik yıl).
 */
export async function GET() {
  try {
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

    const {
      target,
      renewedStudentIds,
      newRegistrationStudentIds,
      newRegistrationActiveYearStudentIds,
      futureYearOnlyNewRegistrationStudentIds,
    } = await getRenewalTargetContext(prisma)

    const allStudents = await prisma.student.findMany({
      where: k12GradeWhereClause(),
      select: { id: true, grade: true },
    })

    /** Bu yıl okulda sayılan öğrenciler (gelecek yıl için ön kayıt olanlar hariç). */
    const enrolledStudents = allStudents.filter(
      (s) => !futureYearOnlyNewRegistrationStudentIds.has(s.id)
    )

    const byGrade = enrolledCountsFromStudentRows(
      allStudents,
      futureYearOnlyNewRegistrationStudentIds
    )
    let ortaokul = 0
    let lise = 0
    for (let g = 5; g <= 8; g++) {
      ortaokul += byGrade[gradeLevelLabel(g)] ?? 0
    }
    for (let g = 9; g <= 12; g++) {
      lise += byGrade[gradeLevelLabel(g)] ?? 0
    }

    const totalStudents = enrolledStudents.length

    const renewalNumerators: Record<string, number> = {}
    const newRegNumerators: Record<string, number> = {}
    for (let g = 5; g <= 12; g++) {
      const lab = gradeLevelLabel(g)
      renewalNumerators[lab] = 0
      newRegNumerators[lab] = 0
    }
    for (const s of enrolledStudents) {
      const level = parseStudentGradeLevel(s.grade)
      if (level == null) continue
      const label = gradeLevelLabel(level)
      if (
        renewedStudentIds.has(s.id) &&
        !newRegistrationStudentIds.has(s.id) &&
        renewalNumerators[label] !== undefined
      ) {
        renewalNumerators[label] += 1
      }
      if (
        newRegistrationActiveYearStudentIds.has(s.id) &&
        newRegNumerators[label] !== undefined
      ) {
        newRegNumerators[label] += 1
      }
    }
    const renewalFractionByGrade = buildGradeFractionRows(renewalNumerators, byGrade)
    const newRegistrationFractionByGrade = buildGradeFractionRows(
      newRegNumerators,
      byGrade
    )

    const newRegInScope = enrolledStudents.filter((s) =>
      newRegistrationActiveYearStudentIds.has(s.id)
    ).length
    const newRegNextYearOnly = allStudents.filter((s) =>
      futureYearOnlyNewRegistrationStudentIds.has(s.id)
    ).length
    const renewedOnlyInScope = enrolledStudents.filter(
      (s) => renewedStudentIds.has(s.id) && !newRegistrationStudentIds.has(s.id)
    ).length
    const covered = new Set<string>()
    for (const s of enrolledStudents) {
      if (renewedStudentIds.has(s.id) || newRegistrationStudentIds.has(s.id)) {
        covered.add(s.id)
      }
    }
    const notRenewedCount = enrolledStudents.filter((s) => !covered.has(s.id)).length

    type ClassRow = { id: string; name: string; grade: number; studentCount: number }
    const byGradeMap: Record<number, ClassRow[]> = {}
    for (let g = 5; g <= 12; g++) {
      byGradeMap[g] = []
    }

    let unassignedCountByGrade: Record<number, number> | null = null

    if (activeYear) {
      const classes = await prisma.class.findMany({
        where: { academicYearId: activeYear.id },
        select: {
          id: true,
          name: true,
          grade: true,
          section: true,
        },
        orderBy: [{ grade: "asc" }, { section: "asc" }],
      })
      const k12 = classes.filter((c) => c.grade >= 5 && c.grade <= 12)
      const classIds = k12.map((c) => c.id)
      const assignments =
        classIds.length === 0
          ? []
          : await prisma.classStudent.findMany({
              where: { classId: { in: classIds } },
              select: { classId: true, studentId: true },
            })
      const excludePre = futureYearOnlyNewRegistrationStudentIds
      const countByClassId = new Map<string, number>()
      const classIdToGrade = new Map<string, number>()
      for (const c of k12) {
        classIdToGrade.set(c.id, c.grade)
      }
      const assignedStudentIdsByGrade: Record<number, Set<string>> = {}
      for (let g = 5; g <= 12; g++) {
        assignedStudentIdsByGrade[g] = new Set()
      }
      for (const a of assignments) {
        if (excludePre.has(a.studentId)) continue
        const g = classIdToGrade.get(a.classId)
        if (g != null && g >= 5 && g <= 12) {
          assignedStudentIdsByGrade[g]!.add(a.studentId)
        }
        countByClassId.set(a.classId, (countByClassId.get(a.classId) ?? 0) + 1)
      }
      for (const c of classes) {
        if (c.grade < 5 || c.grade > 12) continue
        byGradeMap[c.grade].push({
          id: c.id,
          name: c.name,
          grade: c.grade,
          studentCount: countByClassId.get(c.id) ?? 0,
        })
      }

      const counts: Record<number, number> = {}
      for (let g = 5; g <= 12; g++) {
        counts[g] = enrolledStudents.filter((s) => {
          const level = parseStudentGradeLevel(s.grade)
          return level === g && !assignedStudentIdsByGrade[g]!.has(s.id)
        }).length
      }
      unassignedCountByGrade = counts
    }

    const byGradeClasses = [5, 6, 7, 8, 9, 10, 11, 12].map((grade) => ({
      grade,
      classes: byGradeMap[grade],
      unassignedCount: unassignedCountByGrade?.[grade] ?? 0,
    }))

    const ayList = yearRows.map((r) => ({
      id: r.id,
      name: r.name,
      startDate: r.startDate?.toISOString() ?? null,
      endDate: r.endDate?.toISOString() ?? null,
      isActive: r.isActive,
    }))
    const { next: nextAcademicYear } = resolveActiveAndNextAcademicYear(ayList)
    const preEnrollmentTargetYear = nextAcademicYear
      ? {
          id: nextAcademicYear.id,
          name: nextAcademicYear.name,
          label: contractYearLabelFromAcademicYear(nextAcademicYear),
        }
      : null
    const preEnrollmentCount = futureYearOnlyNewRegistrationStudentIds.size

    return NextResponse.json({
      activeAcademicYear: activeYear
        ? {
            id: activeYear.id,
            name: activeYear.name,
            label: contractYearLabelFromAcademicYear({
              name: activeYear.name,
              startDate: activeYear.startDate,
            }),
          }
        : null,
      renewalTargetYear: target,
      preEnrollmentCount,
      preEnrollmentTargetYear,
      totalStudents,
      ortaokulCount: ortaokul,
      liseCount: lise,
      byGradeCounts: byGrade,
      byGradeClasses,
      registrationCounts: {
        renewed: renewedOnlyInScope,
        newRegistration: newRegInScope + newRegNextYearOnly,
        newRegistrationActiveYear: newRegInScope,
        newRegistrationNextYear: newRegNextYearOnly,
        notRenewed: notRenewedCount,
      },
      renewalFractionByGrade,
      newRegistrationFractionByGrade,
    })
  } catch (e) {
    console.error("GET /api/students/overview", e)
    return NextResponse.json({ error: "Özet yüklenemedi" }, { status: 500 })
  }
}
