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

        // Sözleşmeyi oluştur
        const registration = await prisma.newRegistration.create({
            data: {
                studentId,
                contractData
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
        if (selectedClubs && selectedClubs.length > 0) {
            const clubSelections = selectedClubs.map((clubId: string) => ({
                clubId,
                studentId
            }))

            await prisma.clubSelection.createMany({
                data: clubSelections,
                skipDuplicates: true
            })
        }

        return NextResponse.json(registration)
    } catch (error) {
        console.error("Error creating new registration:", error)
        return NextResponse.json({ error: "Failed to create new registration" }, { status: 500 })
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
