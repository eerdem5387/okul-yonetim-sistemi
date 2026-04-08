import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { contractYearLabelFromAcademicYear } from "@/lib/academic-year-ui"
import { generatePDF, generateContractHTML } from "@/lib/pdf-generator"

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const registration = await prisma.newRegistration.findFirst({
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

        if (!registration) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 })
        }

        const raw = registration.contractData as Record<string, unknown>
        const ayId = String(raw.academicYearId ?? "").trim()
        let academicYearLabel = String(raw.academicYear ?? "").trim()
        if (!academicYearLabel && ayId) {
            const row = await prisma.academicYear.findUnique({
                where: { id: ayId },
                select: { name: true, startDate: true },
            })
            if (row) {
                academicYearLabel = contractYearLabelFromAcademicYear(row)
            }
        }
        const contractData = {
            studentName: `${registration.student.firstName} ${registration.student.lastName}`,
            tcNumber: registration.student.tcNumber,
            ...raw,
            ...(academicYearLabel ? { academicYear: academicYearLabel } : {}),
        }

        const html = generateContractHTML(contractData, 'Yeni Kayıt')
        const pdf = await generatePDF(html)

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="yeni-kayit-${registration.student.firstName}-${registration.student.lastName}.pdf"`
            }
        })
    } catch (error) {
        console.error("Error generating PDF:", error)
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
    }
}
