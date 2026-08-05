import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { academicYearLabelsEquivalent } from "@/lib/student-registration-meta"
import { k12GradeWhereClause } from "@/lib/student-grade-level"

type RegistrationRow = {
  studentId: string
  contractData: unknown
}

function matchesAcademicYear(
  row: RegistrationRow,
  targetYearLabel: string,
  targetYearId: string
): boolean {
  const contractData = (row.contractData || {}) as Record<string, unknown>
  const sameLabel = targetYearLabel
    ? academicYearLabelsEquivalent(contractData.academicYear, targetYearLabel)
    : false
  const sameId =
    !!targetYearId &&
    typeof contractData.academicYearId === "string" &&
    contractData.academicYearId === targetYearId
  return sameLabel || sameId
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYear = (searchParams.get("academicYear") || "").trim()
    const academicYearId = (searchParams.get("academicYearId") || "").trim()

    if (!academicYear && !academicYearId) {
      return NextResponse.json(
        { error: "academicYear veya academicYearId gerekli" },
        { status: 400 }
      )
    }

    const [students, renewals, newRegistrations] = await Promise.all([
      prisma.student.findMany({
        where: k12GradeWhereClause(),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tcNumber: true,
          grade: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.renewal.findMany({
        select: {
          studentId: true,
          contractData: true,
        },
      }),
      prisma.newRegistration.findMany({
        select: {
          studentId: true,
          contractData: true,
        },
      }),
    ])

    const renewedStudentIds = new Set<string>()
    for (const renewal of renewals) {
      if (matchesAcademicYear(renewal, academicYear, academicYearId)) {
        renewedStudentIds.add(renewal.studentId)
      }
    }

    const newRegistrationStudentIds = new Set<string>()
    for (const reg of newRegistrations) {
      if (matchesAcademicYear(reg, academicYear, academicYearId)) {
        newRegistrationStudentIds.add(reg.studentId)
      }
    }

    const renewedStudents = students.filter((s) => renewedStudentIds.has(s.id))
    const notRenewedStudents = students.filter((s) => !renewedStudentIds.has(s.id))
    const newRegisteredStudents = students.filter((s) =>
      newRegistrationStudentIds.has(s.id)
    )
    const notNewRegisteredStudents = students.filter(
      (s) => !newRegistrationStudentIds.has(s.id)
    )

    return NextResponse.json({
      selectedAcademicYear: academicYear || null,
      selectedAcademicYearId: academicYearId || null,
      totalStudents: students.length,
      renewedCount: renewedStudents.length,
      notRenewedCount: notRenewedStudents.length,
      newRegistrationCount: newRegisteredStudents.length,
      notNewRegistrationCount: notNewRegisteredStudents.length,
      renewedStudents,
      notRenewedStudents,
      newRegisteredStudents,
      notNewRegisteredStudents,
    })
  } catch (error) {
    console.error("Error in yearly registration history:", error)
    return NextResponse.json(
      { error: "Yıllık kayıt geçmişi alınamadı" },
      { status: 500 }
    )
  }
}
