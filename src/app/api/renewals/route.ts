import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const studentId = searchParams.get('studentId')
        const academicYear = searchParams.get('academicYear')
        
        const whereClause: Record<string, unknown> = {}
        if (studentId) {
            whereClause.studentId = studentId
        }
        
        const renewals = await prisma.renewal.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        tcNumber: true,
                        grade: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        // Eğer academicYear parametresi varsa, contractData içinde bu akademik yılı kontrol et
        if (academicYear && renewals.length > 0) {
            const filteredRenewals = renewals.filter(renewal => {
                const contractData = renewal.contractData as Record<string, unknown>
                return contractData.academicYear === academicYear
            })
            return NextResponse.json(filteredRenewals)
        }

        return NextResponse.json(renewals)
    } catch (error) {
        console.error("Error fetching renewals:", error)
        return NextResponse.json({ error: "Failed to fetch renewals" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { studentId, contractData, selectedClubs } = body

        // Validasyon
        if (!studentId) {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 })
        }

        // Öğrencinin var olup olmadığını kontrol et
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        // Bu öğrenci için aynı akademik yılda zaten kayıt yenileme var mı kontrol et
        const contractDataObj = contractData as Record<string, unknown>
        const academicYear = contractDataObj?.academicYear as string | undefined
        
        if (academicYear) {
            const existingRenewals = await prisma.renewal.findMany({
                where: { studentId },
                select: { contractData: true }
            })
            
            const hasExistingRenewal = existingRenewals.some(renewal => {
                const existingContractData = renewal.contractData as Record<string, unknown>
                return existingContractData.academicYear === academicYear
            })
            
            if (hasExistingRenewal) {
                return NextResponse.json({ 
                    error: "Bu öğrenci için seçilen akademik yılda zaten kayıt yenileme yapılmış!",
                    code: "DUPLICATE_RENEWAL"
                }, { status: 400 })
            }
        }

        // Sözleşmeyi oluştur
        const renewal = await prisma.renewal.create({
            data: {
                studentId,
                contractData: contractData || {}
            },
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        tcNumber: true
                    }
                }
            }
        })

        // Kulüp seçimlerini ekle
        if (selectedClubs && Array.isArray(selectedClubs) && selectedClubs.length > 0) {
            const clubSelections = selectedClubs
                .filter((clubId: string) => clubId && typeof clubId === 'string')
                .map((clubId: string) => ({
                    clubId,
                    studentId
                }))

            if (clubSelections.length > 0) {
                await prisma.clubSelection.createMany({
                    data: clubSelections,
                    skipDuplicates: true
                })
            }
        }

        return NextResponse.json(renewal)
    } catch (error) {
        console.error("Error creating renewal:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ 
            error: "Failed to create renewal",
            details: errorMessage
        }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, contractData } = body

        const renewal = await prisma.renewal.update({
            where: { id },
            data: { contractData },
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        tcNumber: true
                    }
                }
            }
        })

        return NextResponse.json(renewal)
    } catch (error) {
        console.error("Error updating renewal:", error)
        return NextResponse.json({ error: "Failed to update renewal" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const { contractIds } = body

        if (Array.isArray(contractIds)) {
            // Bulk delete
            await prisma.renewal.deleteMany({
                where: { id: { in: contractIds } }
            })
        } else {
            // Single delete
            await prisma.renewal.delete({
                where: { id: contractIds }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting renewals:", error)
        return NextResponse.json({ error: "Failed to delete renewals" }, { status: 500 })
    }
}
