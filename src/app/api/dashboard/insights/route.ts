import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  buildNewRegistrationMatchTargets,
  contractMatchesAcademicYearTargets,
  getRenewalTargetContext,
  resolveRenewalYearTargetForStats,
} from "@/lib/student-registration-meta"
import { gradeLevelLabel, k12GradeWhereClause, parseStudentGradeLevel } from "@/lib/student-grade-level"
import { buildEnrollmentRegistrationGradeBreakdown } from "@/lib/enrolled-grade-counts"

export const dynamic = "force-dynamic"

/**
 * Yönetim dashboard: eksik işler, kısa özetler (sunucu tarafı tek istek).
 */
export async function GET() {
  try {
    const yearRows = await prisma.academicYear.findMany({
      orderBy: [{ startDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    })

    const regCtx = await getRenewalTargetContext(prisma)
    const futureOnlyIds = [...regCtx.futureYearOnlyNewRegistrationStudentIds]

    const enrollmentWhere =
      futureOnlyIds.length > 0
        ? {
            AND: [k12GradeWhereClause(), { NOT: { id: { in: futureOnlyIds } } }],
          }
        : k12GradeWhereClause()

    const activeYear = yearRows.find((y) => y.isActive) ?? null
    const now = Date.now()
    const activeByDate =
      activeYear ??
      yearRows.find((y) => {
        if (!y.startDate || !y.endDate) return false
        const s = y.startDate.getTime()
        const e = y.endDate.getTime()
        return now >= s && now <= e
      }) ??
      null

    let studentsWithoutClassInActiveYear: Array<{ id: string; firstName: string; lastName: string }> = []
    let studentsWithoutClassCount = 0

    if (activeByDate) {
      const classesInYear = await prisma.class.findMany({
        where: { academicYearId: activeByDate.id },
        select: { id: true },
      })
      const classIds = classesInYear.map((c) => c.id)
      if (classIds.length > 0) {
        const assigned = await prisma.classStudent.findMany({
          where: { classId: { in: classIds } },
          select: { studentId: true },
          distinct: ["studentId"],
        })
        const assignedSet = new Set(assigned.map((a) => a.studentId))
        const allStudents = await prisma.student.findMany({
          select: { id: true, firstName: true, lastName: true, grade: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
        const unassigned = allStudents.filter(
          (s) =>
            parseStudentGradeLevel(s.grade) != null &&
            !assignedSet.has(s.id) &&
            !regCtx.futureYearOnlyNewRegistrationStudentIds.has(s.id)
        )
        studentsWithoutClassCount = unassigned.length
        studentsWithoutClassInActiveYear = unassigned.slice(0, 12).map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
        }))
      } else {
        const totalEnrolled = await prisma.student.count({ where: enrollmentWhere })
        studentsWithoutClassCount = totalEnrolled
        const sample = await prisma.student.findMany({
          where: enrollmentWhere,
          take: 12,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        })
        studentsWithoutClassInActiveYear = sample
      }
    }

    const [allStudentsForRenewal, allRenewals, allNewRegs, k12Students] = await Promise.all([
      prisma.student.findMany({
        select: { id: true, firstName: true, lastName: true, grade: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.renewal.findMany({
        select: { studentId: true, contractData: true },
      }),
      prisma.newRegistration.findMany({
        select: { studentId: true, contractData: true },
      }),
      prisma.student.findMany({
        where: k12GradeWhereClause(),
        select: { id: true, grade: true },
      }),
    ])

    const renewalTarget = resolveRenewalYearTargetForStats(yearRows, allRenewals)
    const renewalMatchTargets = renewalTarget
      ? [{ id: renewalTarget.id, label: renewalTarget.label }]
      : []
    const newRegTargets = buildNewRegistrationMatchTargets(yearRows, allNewRegs)

    let studentsWithoutRenewalCount = 0
    let studentsWithoutRenewalSample: Array<{
      id: string
      firstName: string
      lastName: string
      grade: string | null
    }> = []

    if (renewalMatchTargets.length > 0 || newRegTargets.length > 0) {
      const hasRenewalForTarget = (studentId: string) =>
        allRenewals.some((r) => {
          if (r.studentId !== studentId) return false
          return contractMatchesAcademicYearTargets(r.contractData, renewalMatchTargets)
        })

      const hasNewRegCoveringActiveWindow = (studentId: string) =>
        allNewRegs.some((r) => {
          if (r.studentId !== studentId) return false
          return contractMatchesAcademicYearTargets(r.contractData, newRegTargets)
        })

      const pending = allStudentsForRenewal.filter(
        (s) => !hasRenewalForTarget(s.id) && !hasNewRegCoveringActiveWindow(s.id)
      )
      studentsWithoutRenewalCount = pending.length
      studentsWithoutRenewalSample = pending.slice(0, 12).map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade,
      }))
    }

    // Toplam öğrenci = sınıf kartlarındaki "Mevcut" ile aynı (yeni kayıt + yenileyen; yenilemeyen hariç)
    const gradeBreakdown = buildEnrollmentRegistrationGradeBreakdown({
      students: k12Students,
      renewedStudentIds: regCtx.renewedStudentIds,
      newRegistrationStudentIds: regCtx.newRegistrationStudentIds,
      newRegistrationActiveYearStudentIds: regCtx.newRegistrationActiveYearStudentIds,
      futureYearOnlyNewRegistrationStudentIds:
        regCtx.futureYearOnlyNewRegistrationStudentIds,
    })
    let totalStudents = 0
    for (let g = 5; g <= 12; g++) {
      totalStudents += gradeBreakdown[gradeLevelLabel(g)]?.mevcut ?? 0
    }

    const [newRegCount, renewalCount, classCount] = await Promise.all([
      prisma.newRegistration.count(),
      prisma.renewal.count(),
      prisma.class.count(),
    ])

    return NextResponse.json({
      activeAcademicYear: activeByDate
        ? { id: activeByDate.id, name: activeByDate.name }
        : null,
      renewalTargetYear: renewalTarget
        ? {
            id: renewalTarget.id,
            name: renewalTarget.name,
            label: renewalTarget.label,
          }
        : null,
      counts: {
        students: totalStudents,
        newRegistrations: newRegCount,
        renewals: renewalCount,
        classes: classCount,
      },
      studentsWithoutClassInActiveYear: {
        total: studentsWithoutClassCount,
        sample: studentsWithoutClassInActiveYear,
      },
      studentsWithoutRenewalForTargetYear: {
        total: studentsWithoutRenewalCount,
        sample: studentsWithoutRenewalSample,
      },
    })
  } catch (e) {
    console.error("GET /api/dashboard/insights", e)
    return NextResponse.json({ error: "Özet yüklenemedi" }, { status: 500 })
  }
}
