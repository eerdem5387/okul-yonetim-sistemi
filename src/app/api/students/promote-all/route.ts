import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
    try {
        const students = await prisma.student.findMany()

        const gradeMap: Record<string, string> = {}
        for (let n = 5; n < 12; n++) {
            const next = `${n + 1}. Sınıf`
            gradeMap[`${n}. Sınıf`] = next
            gradeMap[String(n)] = next
        }

        let updatedCount = 0
        let skippedCount = 0

        for (const student of students) {
            const newGrade = gradeMap[student.grade]

            if (newGrade && newGrade !== student.grade) {
                await prisma.student.update({
                    where: { id: student.id },
                    data: { grade: newGrade }
                })
                updatedCount++
            } else {
                skippedCount++
            }
        }

        return NextResponse.json({
            success: true,
            message: `${updatedCount} öğrenci bir üst sınıfa yükseltildi. ${skippedCount} öğrenci güncellenmedi (12. sınıf veya tanınmayan sınıf).`,
            updatedCount,
            skippedCount
        })
    } catch (error) {
        console.error("Error promoting students:", error)
        return NextResponse.json({ error: "Failed to promote students" }, { status: 500 })
    }
}
