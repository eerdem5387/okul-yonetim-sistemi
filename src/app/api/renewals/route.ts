import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const renewals = await prisma.renewal.findMany({
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

        // Sözleşmeyi oluştur
        const renewal = await prisma.renewal.create({
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

        return NextResponse.json(renewal)
    } catch (error) {
        console.error("Error creating renewal:", error)
        return NextResponse.json({ error: "Failed to create renewal" }, { status: 500 })
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
