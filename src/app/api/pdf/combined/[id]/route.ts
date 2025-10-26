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
        const { contractTypes, mainContractData, otherContractData, selectedClubs } = body

        // Önce sözleşmeyi bul, sonra öğrenciyi ve tüm yan sözleşmeleri al
        const contract = await prisma.newRegistration.findUnique({
            where: { id: params.id },
            include: {
                student: {
                    include: {
                        clubSelections: {
                            include: {
                                club: true
                            }
                        }
                    }
                }
            }
        })

        let student = null
        let studentId = null

        if (!contract) {
            // Renewal sözleşmesi olabilir
            const renewalContract = await prisma.renewal.findUnique({
                where: { id: params.id },
                include: {
                    student: {
                        include: {
                            clubSelections: {
                                include: {
                                    club: true
                                }
                            }
                        }
                    }
                }
            })

            if (!renewalContract) {
                return NextResponse.json({ error: "Contract not found" }, { status: 404 })
            }

            student = renewalContract.student
            studentId = renewalContract.studentId
        } else {
            student = contract.student
            studentId = contract.studentId
        }

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        // Öğrencinin tüm yan sözleşmelerini çek
        const [uniformContract, mealContract, serviceContract, bookContract] = await Promise.all([
            prisma.uniformContract.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
            prisma.mealContract.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
            prisma.serviceContract.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
            prisma.bookContract.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' } })
        ])

        // Yan sözleşme verilerini hazırla
        const otherContractDataFromDB: Record<string, unknown> = {}

        if (uniformContract) {
            Object.assign(otherContractDataFromDB, uniformContract.contractData as Record<string, unknown>)
        }
        if (mealContract) {
            Object.assign(otherContractDataFromDB, mealContract.contractData as Record<string, unknown>)
        }
        if (serviceContract) {
            Object.assign(otherContractDataFromDB, serviceContract.contractData as Record<string, unknown>)
        }
        if (bookContract) {
            Object.assign(otherContractDataFromDB, bookContract.contractData as Record<string, unknown>)
        }

        // Eğer yan sözleşmeler yoksa ve mainContractData varsa, ana sözleşmedeki verileri kullan
        if (Object.keys(otherContractDataFromDB).length === 0 && mainContractData) {
            // Ana sözleşmedeki verileri yan sözleşmelere aktar
            otherContractDataFromDB.uniformSize = (mainContractData as Record<string, unknown>).uniformSize || ""
            otherContractDataFromDB.uniformPrice = (mainContractData as Record<string, unknown>).uniformPrice || ""
            otherContractDataFromDB.uniformDeliveryDate = (mainContractData as Record<string, unknown>).uniformDeliveryDate || ""
            otherContractDataFromDB.uniformItems = (mainContractData as Record<string, unknown>).uniformItems || []

            otherContractDataFromDB.mealPeriods = (mainContractData as Record<string, unknown>).mealPeriods || []
            otherContractDataFromDB.mealPrice = (mainContractData as Record<string, unknown>).mealPrice || ""

            otherContractDataFromDB.bookSet = (mainContractData as Record<string, unknown>).bookSet || ""
            otherContractDataFromDB.bookDeliveryDate = (mainContractData as Record<string, unknown>).bookDeliveryDate || ""

            otherContractDataFromDB.serviceRegion = (mainContractData as Record<string, unknown>).serviceRegion || ""
            otherContractDataFromDB.servicePrice = (mainContractData as Record<string, unknown>).servicePrice || ""
        }

        // Frontend'den gelen veya veritabanından çekilen verileri kullan
        const finalOtherContractData = Object.keys(otherContractData || {}).length > 0
            ? otherContractData
            : otherContractDataFromDB

        // Kulüp seçimlerini hazırla (frontend'den gelen veya veritabanından)
        const clubsForPDF = selectedClubs || student.clubSelections.map(selection => ({
            id: selection.club.id,
            name: selection.club.name
        }))

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
            contractTypes: ["new-registration", "uniform", "meal", "service", "book"],
            mainContractData,
            otherContractData: finalOtherContractData,
            selectedClubs: clubsForPDF.length > 0 ? clubsForPDF : undefined
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
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({
            error: "Failed to generate combined PDF",
            details: errorMessage
        }, { status: 500 })
    }
}
