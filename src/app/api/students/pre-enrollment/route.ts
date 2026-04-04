import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import { contractYearLabelFromAcademicYear, resolveActiveAndNextAcademicYear } from "@/lib/academic-year-ui"

export const dynamic = "force-dynamic"

/**
 * Gelecek akademik yıl için yalnızca yeni kaydı olan (ön kayıtlı) öğrenciler — öğrenci yönetimi modal listesi.
 */
export async function GET() {
  try {
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
    const ids = [...futureYearOnlyNewRegistrationStudentIds]
    if (ids.length === 0) {
      return NextResponse.json({ students: [], count: 0, targetYear })
    }

    const students = await prisma.student.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        tcNumber: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })

    return NextResponse.json({
      students,
      count: students.length,
      targetYear,
    })
  } catch (e) {
    console.error("GET /api/students/pre-enrollment", e)
    return NextResponse.json({ error: "Liste yüklenemedi" }, { status: 500 })
  }
}
