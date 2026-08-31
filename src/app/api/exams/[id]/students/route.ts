import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamScan } from "@/lib/exams/auth"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

/** Sınav kapsamındaki öğrenciler — masaüstü offline cache için. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await context.params
  const actor = await requireExamScan(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { grade: true, classId: true },
  })
  if (!exam) return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 })

  let students
  if (exam.classId) {
    students = await prisma.student.findMany({
      where: { classAssignments: { some: { classId: exam.classId } } },
      select: { id: true, firstName: true, lastName: true, tcNumber: true, grade: true },
      orderBy: { lastName: "asc" },
    })
  } else {
    const all = await prisma.student.findMany({
      select: { id: true, firstName: true, lastName: true, tcNumber: true, grade: true },
      orderBy: { lastName: "asc" },
    })
    if (exam.grade != null) {
      students = all.filter((s) => parseStudentGradeLevel(s.grade) === exam.grade)
    } else {
      students = all
    }
  }

  return NextResponse.json({ students, count: students.length })
}
