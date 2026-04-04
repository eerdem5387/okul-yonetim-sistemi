import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetYearFromList, type AcademicYearListItem } from "@/lib/academic-year-ui"

export const dynamic = "force-dynamic"

/**
 * Yönetim dashboard: eksik işler, kısa özetler (sunucu tarafı tek istek).
 */
export async function GET() {
  try {
    const yearRows = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
    })
    const list: AcademicYearListItem[] = yearRows.map((r) => ({
      id: r.id,
      name: r.name,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      isActive: r.isActive,
    }))

    const activeYear = yearRows.find((y) => y.isActive) ?? null
    const now = Date.now()
    const activeByDate =
      activeYear ??
      yearRows.find((y) => {
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
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
        const unassigned = allStudents.filter((s) => !assignedSet.has(s.id))
        studentsWithoutClassCount = unassigned.length
        studentsWithoutClassInActiveYear = unassigned.slice(0, 12).map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
        }))
      } else {
        const totalStudents = await prisma.student.count()
        studentsWithoutClassCount = totalStudents
        const sample = await prisma.student.findMany({
          take: 12,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        })
        studentsWithoutClassInActiveYear = sample
      }
    }

    const renewalTarget = getRenewalTargetYearFromList(list)

    let studentsWithoutRenewalCount = 0
    let studentsWithoutRenewalSample: Array<{
      id: string
      firstName: string
      lastName: string
      grade: string | null
    }> = []

    if (renewalTarget) {
      const [allStudents, allRenewals, allNewRegs] = await Promise.all([
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
      ])

      const hasRenewalForTarget = (studentId: string) =>
        allRenewals.some((r) => {
          if (r.studentId !== studentId) return false
          const cd = r.contractData as Record<string, unknown>
          return (
            cd.academicYearId === renewalTarget.id ||
            String(cd.academicYear ?? "").trim() === renewalTarget.label
          )
        })

      const hasNewRegForTarget = (studentId: string) =>
        allNewRegs.some((r) => {
          if (r.studentId !== studentId) return false
          const cd = r.contractData as Record<string, unknown>
          return (
            cd.academicYearId === renewalTarget.id ||
            String(cd.academicYear ?? "").trim() === renewalTarget.label
          )
        })

      const pending = allStudents.filter(
        (s) => !hasRenewalForTarget(s.id) && !hasNewRegForTarget(s.id)
      )
      studentsWithoutRenewalCount = pending.length
      studentsWithoutRenewalSample = pending.slice(0, 12).map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade,
      }))
    }

    const [totalStudents, newRegCount, renewalCount, classCount] = await Promise.all([
      prisma.student.count(),
      prisma.newRegistration.count(),
      prisma.renewal.count(),
      prisma.class.count(),
    ])

    return NextResponse.json({
      activeAcademicYear: activeByDate
        ? { id: activeByDate.id, name: activeByDate.name }
        : null,
      renewalTargetYear: renewalTarget
        ? { id: renewalTarget.id, name: renewalTarget.name, label: renewalTarget.label }
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
