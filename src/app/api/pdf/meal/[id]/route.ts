import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePDF, generateContractHTML } from "@/lib/pdf-generator"

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const contract = await prisma.mealContract.findFirst({
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

        if (!contract) {
            return NextResponse.json({ error: "Contract not found" }, { status: 404 })
        }

        const contractData = {
            studentName: `${contract.student.firstName} ${contract.student.lastName}`,
            tcNumber: contract.student.tcNumber,
            ...contract.contractData
        }

        const html = generateContractHTML(contractData, 'Yemek Sözleşmesi')
        const pdf = await generatePDF(html)

        return new NextResponse(pdf, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="yemek-sozlesmesi-${contract.student.firstName}-${contract.student.lastName}.pdf"`
            }
        })
    } catch (error) {
        console.error("Error generating PDF:", error)
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
    }
}
