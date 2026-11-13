import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeClubGradeLevels } from "@/lib/club-grade-levels"
import { instructorSelect } from "@/lib/clubs/access"
import { evaluateClubCompatibilityForStudent } from "@/lib/clubs/schedule-compatibility"

export async function GET(request: NextRequest) {
    try {
        const studentId = request.nextUrl.searchParams.get("studentId")?.trim() || ""

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
                schedules: {
                    where: {
                        isActive: true,
                        OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
                    },
                    select: {
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true,
                        clubGroupId: true,
                    },
                    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
                },
                _count: {
                    select: {
                        membershipRequests: { where: { status: "PENDING" } },
                        demandRequests: true,
                        schedules: { where: { isActive: true, clubGroupId: null } },
                    },
                },
            },
            orderBy: {
                name: "asc"
            }
        })

        // Veli seçimi: programı olan + ÖÇG ile çakışmayan; mevcut seçimler her zaman dahil
        if (studentId) {
            const mine = await prisma.clubSelection.findMany({
                where: { studentId },
                select: { clubId: true },
            })
            const selectedSet = new Set(mine.map((m) => m.clubId))
            const compat = await evaluateClubCompatibilityForStudent({
                studentId,
                clubIds: clubs.map((c) => c.id),
            })
            const filtered = clubs
                .filter((c) => compat.get(c.id)?.selectable || selectedSet.has(c.id))
                .map((c) => {
                    const info = compat.get(c.id)
                    return {
                        ...c,
                        scheduleSummary: info?.scheduleSummary ?? [],
                        scheduleBlocks: info?.scheduleBlocks ?? [],
                        scheduleSelectable: Boolean(info?.selectable),
                    }
                })
            return NextResponse.json(filtered)
        }

        return NextResponse.json(clubs)
    } catch (error) {
        console.error("Error fetching clubs:", error)
        return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, capacity, gradeLevels, instructorId, exemptFromSelectionLimit } = body
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
                exemptFromSelectionLimit: Boolean(exemptFromSelectionLimit),
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
        const { id, name, description, capacity, gradeLevels, instructorId, exemptFromSelectionLimit } = body
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
                ...(exemptFromSelectionLimit !== undefined
                  ? { exemptFromSelectionLimit: Boolean(exemptFromSelectionLimit) }
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
