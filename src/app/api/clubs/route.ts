import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeClubGradeLevels } from "@/lib/club-grade-levels"
import { instructorSelect } from "@/lib/clubs/access"

export async function GET() {
    try {
        const clubs = await prisma.club.findMany({
            include: {
                instructor: { select: instructorSelect },
                selections: {
                    select: {
                        id: true,
                        studentId: true,
                        student: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                grade: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        membershipRequests: { where: { status: "PENDING" } },
                        demandRequests: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json(clubs)
    } catch (error) {
        console.error("Error fetching clubs:", error)
        return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, capacity, gradeLevels, instructorId } = body
        const levels = normalizeClubGradeLevels(gradeLevels)
        if (levels.length === 0) {
            return NextResponse.json({ error: "En az bir sınıf düzeyi seçin" }, { status: 400 })
        }

        const club = await prisma.club.create({
            data: {
                name,
                description,
                capacity: parseInt(capacity),
                gradeLevels: levels,
                instructorId: instructorId ? String(instructorId) : null,
            },
            include: { instructor: { select: instructorSelect } },
        })

        return NextResponse.json(club)
    } catch (error) {
        console.error("Error creating club:", error)
        return NextResponse.json({ error: "Failed to create club" }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, name, description, capacity, gradeLevels, instructorId } = body
        const levels = normalizeClubGradeLevels(gradeLevels)
        if (levels.length === 0) {
            return NextResponse.json({ error: "En az bir sınıf düzeyi seçin" }, { status: 400 })
        }

        const club = await prisma.club.update({
            where: { id },
            data: {
                name,
                description,
                capacity: parseInt(capacity),
                gradeLevels: levels,
                ...(instructorId !== undefined
                  ? { instructorId: instructorId ? String(instructorId) : null }
                  : {}),
            },
            include: { instructor: { select: instructorSelect } },
        })

        return NextResponse.json(club)
    } catch (error) {
        console.error("Error updating club:", error)
        return NextResponse.json({ error: "Failed to update club" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const { clubIds } = body

        if (Array.isArray(clubIds)) {
            // Bulk delete
            await prisma.club.deleteMany({
                where: { id: { in: clubIds } }
            })
        } else {
            // Single delete
            await prisma.club.delete({
                where: { id: clubIds }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting clubs:", error)
        return NextResponse.json({ error: "Failed to delete clubs" }, { status: 500 })
    }
}
