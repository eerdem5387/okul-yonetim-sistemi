import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { k12GradeWhereClause, parseStudentGradeLevel } from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

type UnassignedStudent = {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  gradeLevel: number | null
}

function sortGrades(a: string, b: string): number {
  const la = parseStudentGradeLevel(a)
  const lb = parseStudentGradeLevel(b)
  if (la != null && lb != null && la !== lb) return la - lb
  return a.localeCompare(b, "tr")
}

export async function GET(request: NextRequest) {
  try {
    const gradeFilter = request.nextUrl.searchParams.get("grade")?.trim() || ""

    const [students, selectedRows] = await Promise.all([
      prisma.student.findMany({
        where: k12GradeWhereClause(),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tcNumber: true,
          grade: true,
        },
        orderBy: [{ grade: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.clubSelection.findMany({
        select: { studentId: true },
        distinct: ["studentId"],
      }),
    ])

    const selectedIds = new Set(selectedRows.map((row) => row.studentId))
    const withSelectionCount = students.filter((s) => selectedIds.has(s.id)).length

    let unassigned: UnassignedStudent[] = students
      .filter((s) => !selectedIds.has(s.id))
      .map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        tcNumber: s.tcNumber,
        grade: s.grade,
        gradeLevel: parseStudentGradeLevel(s.grade),
      }))

    if (gradeFilter && gradeFilter !== "all") {
      unassigned = unassigned.filter((s) => s.grade === gradeFilter)
    }

    const byGradeMap = new Map<string, number>()
    for (const student of students.filter((s) => !selectedIds.has(s.id))) {
      byGradeMap.set(student.grade, (byGradeMap.get(student.grade) || 0) + 1)
    }

    const totalByGradeMap = new Map<string, number>()
    for (const student of students) {
      totalByGradeMap.set(student.grade, (totalByGradeMap.get(student.grade) || 0) + 1)
    }

    const byGrade = [...byGradeMap.entries()]
      .map(([grade, count]) => {
        const totalInGrade = totalByGradeMap.get(grade) || 0
        return {
          grade,
          gradeLevel: parseStudentGradeLevel(grade),
          unassignedCount: count,
          totalStudents: totalInGrade,
          selectedCount: Math.max(0, totalInGrade - count),
        }
      })
      .sort((a, b) => sortGrades(a.grade, b.grade))

    const grades = [...totalByGradeMap.keys()].sort(sortGrades)

    return NextResponse.json({
      summary: {
        totalStudents: students.length,
        withSelection: withSelectionCount,
        withoutSelection: students.length - withSelectionCount,
        gradeCount: byGrade.length,
      },
      grades,
      byGrade,
      students: unassigned,
    })
  } catch (error) {
    console.error("Error fetching unassigned club students:", error)
    return NextResponse.json({ error: "Seçim yapmayan öğrenciler alınamadı" }, { status: 500 })
  }
}
