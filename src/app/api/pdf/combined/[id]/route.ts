import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePDF, generateCombinedContractHTML } from "@/lib/pdf-generator"

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { contractTypes, mainContractData, otherContractData } = body

        // Öğrenci bilgilerini al
        const student = await prisma.student.findUnique({
            where: { id: params.id }
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        // Tüm sözleşmeleri birleştir
        const combinedHTML = generateCombinedContractHTML({
            student: {
                firstName: student.firstName,
                lastName: student.lastName,
                tcNumber: student.tcNumber,
                grade: student.grade,
                address: student.address,
                birthDate: student.birthDate.toISOString().split('T')[0], // Date'i string'e çevir
                parentName: student.parentName
            },
            contractTypes,
            mainContractData,
            otherContractData
        })

        const pdf = await generatePDF(combinedHTML)

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="tum-sozlesmeler-${student.firstName}-${student.lastName}.pdf"`
            }
        })
    } catch (error) {
        console.error("Error generating combined PDF:", error)
        return NextResponse.json({ error: "Failed to generate combined PDF" }, { status: 500 })
    }
}
