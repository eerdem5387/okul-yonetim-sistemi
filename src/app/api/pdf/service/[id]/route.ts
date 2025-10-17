import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePDF, generateContractHTML } from "@/lib/pdf-generator"

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const contract = await prisma.serviceContract.findFirst({
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
            ...(contract.contractData as Record<string, unknown>)
        }

        const html = generateContractHTML(contractData, 'Servis Sözleşmesi')
        const pdf = await generatePDF(html)

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="servis-sozlesmesi-${contract.student.firstName}-${contract.student.lastName}.pdf"`
            }
        })
    } catch (error) {
        console.error("Error generating PDF:", error)
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
    }
}
