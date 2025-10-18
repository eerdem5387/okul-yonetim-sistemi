import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { clubSelections } = body

        if (!Array.isArray(clubSelections)) {
            return NextResponse.json({ error: "clubSelections must be an array" }, { status: 400 })
        }

        // Her kulüp seçimi için kapasite kontrolü yap
        for (const selection of clubSelections) {
            const club = await prisma.club.findUnique({
                where: { id: selection.clubId },
                include: { selections: true }
            })

            if (!club) {
                return NextResponse.json({ error: `Club with id ${selection.clubId} not found` }, { status: 404 })
            }

            if (club.selections.length >= club.capacity) {
                return NextResponse.json({ error: `Club ${club.name} is at full capacity` }, { status: 400 })
            }

            // Öğrencinin zaten bu kulüpte olup olmadığını kontrol et
            const existingSelection = await prisma.clubSelection.findFirst({
                where: {
                    clubId: selection.clubId,
                    studentId: selection.studentId
                }
            })

            if (existingSelection) {
                return NextResponse.json({ error: `Student is already in club ${club.name}` }, { status: 400 })
            }
        }

        // Tüm seçimleri kaydet
        const createdSelections = await prisma.clubSelection.createMany({
            data: clubSelections,
            skipDuplicates: true
        })

        return NextResponse.json({ success: true, count: createdSelections.count })
    } catch (error) {
        console.error("Error saving club selections:", error)
        return NextResponse.json({ error: "Failed to save club selections" }, { status: 500 })
    }
}
