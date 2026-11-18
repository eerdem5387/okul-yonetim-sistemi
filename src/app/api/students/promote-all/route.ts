import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { computeNextGradeAfterRollover } from "@/lib/academic-year-rollover"
import { requireStaffAccess } from "@/lib/auth/api-guard"

/**
 * Tüm öğrencileri bir üst sınıfa geçirir (8 ve 12 → Mezun).
 * Güncellemeler tek bir veritabanı işleminde yapılır: bir hata olursa hiçbir öğrenci değişmez
 * (eskiden öğrenci öğrenci güncelleniyordu; yarıda kalırsa bir kısmı yükselmiş kalıyordu).
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaffAccess(request, { module: "students", action: "edit" })
  if (!auth.ok) return auth.response
  try {
    const students = await prisma.student.findMany({ select: { id: true, grade: true } })

    // Hedef sınıfa göre grupla; her grup kendi id listesiyle güncellenir (zincirleme yükselme olmaz)
    const idsByNextGrade = new Map<string, string[]>()
    let skippedCount = 0
    for (const student of students) {
      const newGrade = computeNextGradeAfterRollover(student.grade)
      if (newGrade && newGrade !== student.grade) {
        const list = idsByNextGrade.get(newGrade) ?? []
        list.push(student.id)
        idsByNextGrade.set(newGrade, list)
      } else {
        skippedCount++
      }
    }

    const results = await prisma.$transaction(
      [...idsByNextGrade.entries()].map(([grade, ids]) =>
        prisma.student.updateMany({ where: { id: { in: ids } }, data: { grade } })
      )
    )
    const updatedCount = results.reduce((sum, r) => sum + r.count, 0)

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
