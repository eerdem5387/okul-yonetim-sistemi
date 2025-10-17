import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePDF, generateContractHTML } from "@/lib/pdf-generator"

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const renewal = await prisma.renewal.findFirst({
            where: {
                student: {
                    id: params.id
                }
            },
            include: {
                student: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (!renewal) {
            return NextResponse.json({ error: "Renewal not found" }, { status: 404 })
        }

        const contractData = {
            studentName: `${renewal.student.firstName} ${renewal.student.lastName}`,
            tcNumber: renewal.student.tcNumber,
            ...renewal.contractData
        }

        const html = generateContractHTML(contractData, 'Kayıt Yenileme')
        const pdf = await generatePDF(html)

        return new NextResponse(pdf, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="kayit-yenileme-${renewal.student.firstName}-${renewal.student.lastName}.pdf"`
            }
        })
    } catch (error) {
        console.error("Error generating PDF:", error)
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
    }
}
