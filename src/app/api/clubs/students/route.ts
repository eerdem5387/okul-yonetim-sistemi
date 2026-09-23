import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clubMatchesStudentGrade } from "@/lib/club-grade-levels"
import {
  isOverClubSelectionQuota,
  MAX_CLUB_SELECTIONS,
} from "@/lib/clubs/selection-quota"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const studentId = searchParams.get('studentId')

        if (!studentId) {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 })
        }

        const [selections, demands] = await Promise.all([
          prisma.clubSelection.findMany({
            where: { studentId },
            include: { club: true },
          }),
          prisma.clubDemandRequest.findMany({
            where: { studentId },
            select: { clubId: true },
          }),
        ])

        return NextResponse.json({
          selections,
          demandedClubIds: demands.map((d) => d.clubId),
        })
    } catch (error) {
        console.error("Error fetching student clubs:", error)
        return NextResponse.json({ error: "Failed to fetch student clubs" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { studentId, clubSelections } = body

        if (!studentId) {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 })
        }

        if (!Array.isArray(clubSelections)) {
            return NextResponse.json({ error: "clubSelections must be an array" }, { status: 400 })
        }

        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.student.findUnique({
                where: { id: studentId },
                select: { grade: true },
            })
            if (!student) {
                throw new Error("STUDENT_NOT_FOUND")
            }

            const visibleClubs = await tx.club.findMany({
              select: { id: true, gradeLevels: true, exemptFromSelectionLimit: true },
            })
            const visibleIds = visibleClubs
                .filter((club) => clubMatchesStudentGrade(club.gradeLevels, student.grade))
                .map((club) => club.id)

            await tx.clubSelection.deleteMany({
                where: { studentId, clubId: { in: visibleIds } },
            })

            if (clubSelections.length === 0) {
                return { success: true, message: "All club selections removed", count: 0 }
            }

            const fullClubs: { name: string }[] = []
            const clubIds = clubSelections.map((s: { clubId: string }) => s.clubId)

            const clubs = await tx.club.findMany({
                where: { id: { in: clubIds } },
                include: {
                    selections: {
                        select: { id: true, studentId: true }
                    }
                }
            })

            if (isOverClubSelectionQuota(clubIds, clubs)) {
                throw new Error("QUOTA")
            }

            const clubMap = new Map(clubs.map(club => [club.id, club]))

            for (const selection of clubSelections) {
                const club = clubMap.get(selection.clubId)

                if (!club) {
                    throw new Error(`Club with id ${selection.clubId} not found`)
                }
                if (!clubMatchesStudentGrade(club.gradeLevels, student.grade)) {
                    throw new Error("GRADE_MISMATCH")
                }

                const currentSelectionsCount = club.selections.length
                const sameClubInRequest = clubSelections.filter(
                    (s: { clubId: string }) => s.clubId === selection.clubId
                ).length
                const totalSelections = currentSelectionsCount + sameClubInRequest

                if (totalSelections > club.capacity) {
                    fullClubs.push({ name: club.name })
                }
            }

            if (fullClubs.length > 0) {
                throw new Error(JSON.stringify({
                    error: "Some clubs are at full capacity",
                    fullClubs
                }))
            }

            const createdSelections = await tx.clubSelection.createMany({
                data: clubSelections,
                skipDuplicates: true
            })

            const savedClubIds = clubSelections.map((s: { clubId: string }) => s.clubId)
            if (savedClubIds.length > 0) {
              await tx.clubDemandRequest.deleteMany({
                where: { studentId, clubId: { in: savedClubIds } },
              })
            }

            return { success: true, count: createdSelections.count }
        }, {
            maxWait: 5000,
            timeout: 10000,
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Error saving club selections:", error)

        if (error instanceof Error && error.message === "GRADE_MISMATCH") {
            return NextResponse.json({ error: "Seçilen kulüpler öğrencinin sınıfına açık değil" }, { status: 400 })
        }
        if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
            return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
        }
        if (error instanceof Error && error.message === "QUOTA") {
            return NextResponse.json(
              {
                error: `En fazla ${MAX_CLUB_SELECTIONS} kulüp seçebilirsiniz (kota dışı kulüpler bu sayıya dahil değildir)`,
              },
              { status: 400 }
            )
        }
        if (error instanceof Error && error.message.startsWith("{")) {
            try {
                const errorData = JSON.parse(error.message)
                return NextResponse.json(errorData, { status: 400 })
            } catch {
                // JSON parse hatası
            }
        }

        return NextResponse.json({ error: "Failed to save club selections" }, { status: 500 })
    }
}
