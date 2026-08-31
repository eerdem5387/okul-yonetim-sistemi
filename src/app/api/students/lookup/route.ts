import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExamScan } from "@/lib/exams/auth"
import { nameSimilarity, normalizeTc } from "@/lib/exams/validation"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

export async function GET(request: NextRequest) {
  const actor = await requireExamScan(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tc = searchParams.get("tc")
  const examId = searchParams.get("examId")
  const nameRaw = searchParams.get("name")

  if (!tc) {
    return NextResponse.json({ error: "tc parametresi gerekli" }, { status: 400 })
  }

  const normalized = normalizeTc(tc)
  if (!normalized) {
    return NextResponse.json({ found: false, inExamScope: false, nameSimilarity: 0 })
  }

  const student = await prisma.student.findUnique({
    where: { tcNumber: normalized },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      tcNumber: true,
      classAssignments: { select: { classId: true } },
    },
  })

  if (!student) {
    return NextResponse.json({ found: false, inExamScope: false, nameSimilarity: 0 })
  }

  let inExamScope = true
  if (examId) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { grade: true, classId: true },
    })
    if (exam) {
      if (exam.classId) {
        inExamScope = student.classAssignments.some((c) => c.classId === exam.classId)
      } else if (exam.grade != null) {
        inExamScope = parseStudentGradeLevel(student.grade) === exam.grade
      }
    }
  }

  const fullName = `${student.firstName} ${student.lastName}`
  const sim = nameRaw ? nameSimilarity(nameRaw, fullName) : 1

  return NextResponse.json({
    found: true,
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade,
      tcNumber: student.tcNumber,
    },
    inExamScope,
    nameSimilarity: sim,
  })
}
