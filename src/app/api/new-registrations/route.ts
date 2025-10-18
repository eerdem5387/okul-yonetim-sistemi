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
