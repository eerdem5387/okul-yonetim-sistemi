import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const registrations = await prisma.newRegistration.findMany({
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        tcNumber: true
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

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting new registrations:", error)
        return NextResponse.json({ error: "Failed to delete new registrations" }, { status: 500 })
    }
}
