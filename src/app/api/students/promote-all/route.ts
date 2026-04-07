import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { computeNextGradeAfterRollover } from "@/lib/academic-year-rollover"

export async function POST() {
  try {
    const students = await prisma.student.findMany()

    let updatedCount = 0
    let skippedCount = 0

    for (const student of students) {
      const newGrade = computeNextGradeAfterRollover(student.grade)
      if (newGrade && newGrade !== student.grade) {
        await prisma.student.update({
          where: { id: student.id },
          data: { grade: newGrade },
        })
        updatedCount++
      } else {
        skippedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updatedCount} öğrenci bir üst sınıfa yükseltildi veya mezun olarak işaretlendi (8. ve 12. sınıflar mezun). ${skippedCount} kayıt değişmedi.`,
      updatedCount,
      skippedCount,
    })
  } catch (error) {
    console.error("Error promoting students:", error)
    return NextResponse.json({ error: "Failed to promote students" }, { status: 500 })
  }
}
