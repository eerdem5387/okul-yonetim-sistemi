import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const studentId = searchParams.get('studentId')
        
        const whereClause = studentId ? { studentId } : {}
        
        const registrations = await prisma.newRegistration.findMany({
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

        return NextResponse.json(registrations)
    } catch (error) {
        console.error("Error fetching new registrations:", error)
        return NextResponse.json({ error: "Failed to fetch new registrations" }, { status: 500 })
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

        // Akademik yıl bazlı çift kayıt kontrolü
        const contractDataObj = contractData as Record<string, unknown>
        const academicYear = contractDataObj?.academicYear as string | undefined
        
        if (academicYear) {
            // Bu öğrenci için aynı akademik yılda zaten kayıt var mı kontrol et
            const existingRegistrations = await prisma.newRegistration.findMany({
                where: { studentId },
                select: { contractData: true, id: true, createdAt: true }
            })
            
            const hasExistingRegistration = existingRegistrations.some(reg => {
                const existingContractData = reg.contractData as Record<string, unknown>
                return existingContractData.academicYear === academicYear
            })
            
            if (hasExistingRegistration) {
                return NextResponse.json({ 
                    error: "Bu öğrenci için seçilen akademik yılda zaten yeni kayıt yapılmış!",
                    code: "DUPLICATE_REGISTRATION"
                }, { status: 409 })
            }
        }

        // Otomatik çift kayıt önleme: Son 5 dakika içinde aynı öğrenci ve akademik yıl için kayıt var mı?
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        const recentRegistrations = await prisma.newRegistration.findMany({
            where: {
                studentId,
                createdAt: {
                    gte: fiveMinutesAgo
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        // Eğer son 5 dakika içinde kayıt varsa ve aynı akademik yıl ise, en son kaydı döndür
        if (recentRegistrations.length > 0 && academicYear) {
            const matchingRegistration = recentRegistrations.find(reg => {
                const regContractData = reg.contractData as Record<string, unknown>
                return regContractData.academicYear === academicYear
            })
            
            if (matchingRegistration) {
                console.log(`[New Registration] Duplicate prevention: Found recent registration for student ${studentId} and academic year ${academicYear}, returning existing registration`)
                return NextResponse.json({
                    ...matchingRegistration,
                    duplicatePrevented: true
                })
            }
        }

        // Sözleşmeyi oluştur
        const registration = await prisma.newRegistration.create({
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

        return NextResponse.json(registration)
    } catch (error) {
        console.error("Error creating new registration:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ 
            error: "Failed to create new registration",
            details: errorMessage
        }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, contractData } = body

        const registration = await prisma.newRegistration.update({
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

        return NextResponse.json(registration)
    } catch (error) {
        console.error("Error updating new registration:", error)
        return NextResponse.json({ error: "Failed to update new registration" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const { contractIds } = body

        const idsToDelete = Array.isArray(contractIds) ? contractIds : [contractIds]
        
        // Silinecek kayıtların studentId'lerini al
        const registrationsToDelete = await prisma.newRegistration.findMany({
            where: { id: { in: idsToDelete } },
            select: { studentId: true }
        })
        
        const studentIds = [...new Set(registrationsToDelete.map(r => r.studentId))]
        
        // Kayıtları sil
        if (Array.isArray(contractIds)) {
            // Bulk delete
            await prisma.newRegistration.deleteMany({
                where: { id: { in: contractIds } }
            })
        } else {
            // Single delete
            await prisma.newRegistration.delete({
                where: { id: contractIds }
            })
        }
        
        // Her öğrenci için kontrol et: Eğer başka kayıt (new-registration veya renewal) yoksa öğrenciyi sil
        for (const studentId of studentIds) {
            const [remainingNewRegistrations, remainingRenewals] = await Promise.all([
                prisma.newRegistration.findMany({
                    where: { studentId },
                    select: { id: true }
                }),
                prisma.renewal.findMany({
                    where: { studentId },
                    select: { id: true }
                })
            ])
            
            // Eğer bu öğrenciye ait hiç kayıt kalmadıysa öğrenciyi sil
            if (remainingNewRegistrations.length === 0 && remainingRenewals.length === 0) {
                await prisma.student.delete({
                    where: { id: studentId }
                })
                console.log(`[Delete New Registration] Student ${studentId} deleted (no remaining registrations)`)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting new registrations:", error)
        return NextResponse.json({ error: "Failed to delete new registrations" }, { status: 500 })
    }
}
