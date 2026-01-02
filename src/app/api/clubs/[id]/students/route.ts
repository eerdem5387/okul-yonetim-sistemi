import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/clubs/[id]/students
 * Kulüpteki öğrencileri getirir
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const club = await prisma.club.findUnique({
            where: { id: params.id },
            include: {
                selections: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                tcNumber: true,
                                grade: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        })

        if (!club) {
            return NextResponse.json({ error: "Club not found" }, { status: 404 })
        }

        // Test bot uyumluluğu için
        const studentsList = club.selections.map((s) => ({
            ...s.student,
            selectionId: s.id,
            selectedAt: s.createdAt,
        }))

        return NextResponse.json({
            success: true,
            students: studentsList,
            club: {
                id: club.id,
                name: club.name,
                capacity: club.capacity,
                currentCount: club.selections.length,
            },
            count: studentsList.length,
        })
    } catch (error) {
        console.error("Error fetching club students:", error)
        return NextResponse.json({ error: "Failed to fetch club students" }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const { studentId } = await request.json()

        // Kulüp kapasitesini kontrol et
        const club = await prisma.club.findUnique({
            where: { id: params.id },
            include: { selections: true }
        })

        if (!club) {
            return NextResponse.json({ error: "Club not found" }, { status: 404 })
        }

        if (club.selections.length >= club.capacity) {
            return NextResponse.json({ error: "Club capacity is full" }, { status: 400 })
        }

        // Öğrencinin zaten bu kulüpte olup olmadığını kontrol et
        const existingSelection = await prisma.clubSelection.findFirst({
            where: {
                clubId: params.id,
                studentId: studentId
            }
        })

        if (existingSelection) {
            return NextResponse.json({ error: "Student is already in this club" }, { status: 400 })
        }

        // Öğrenciyi kulübe ekle
        const selection = await prisma.clubSelection.create({
            data: {
                clubId: params.id,
                studentId: studentId
            },
            include: {
                student: true
            }
        })

        return NextResponse.json(selection)
    } catch (error) {
        console.error("Error adding student to club:", error)
        return NextResponse.json({ error: "Failed to add student to club" }, { status: 500 })
    }
}
