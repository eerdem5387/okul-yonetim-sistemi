import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    try {
        // Tüm öğrencileri çek
        const students = await prisma.student.findMany()

        // Sınıf yükseltme mapping
        const gradeMap: { [key: string]: string } = {
            "5. Sınıf": "6. Sınıf",
            "6. Sınıf": "7. Sınıf",
            "7. Sınıf": "8. Sınıf",
            "8. Sınıf": "9. Sınıf",
            "9. Sınıf": "10. Sınıf",
            "10. Sınıf": "11. Sınıf",
            "11. Sınıf": "12. Sınıf",
            "12. Sınıf": "Mezun" // 12. sınıf mezun olur
        }

        let updatedCount = 0
        let skippedCount = 0

        // Her öğrenciyi güncelle
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
            message: `${updatedCount} öğrenci bir üst sınıfa yükseltildi. ${skippedCount} öğrenci güncellenmedi (Mezun veya geçersiz sınıf).`,
            updatedCount,
            skippedCount
        })
    } catch (error) {
        console.error("Error promoting students:", error)
        return NextResponse.json({ error: "Failed to promote students" }, { status: 500 })
    }
}

