import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const studentId = searchParams.get('studentId')

        if (!studentId) {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 })
        }

        const selections = await prisma.clubSelection.findMany({
            where: { studentId },
            include: { club: true }
        })

        return NextResponse.json(selections)
    } catch (error) {
        console.error("Error fetching student clubs:", error)
        return NextResponse.json({ error: "Failed to fetch student clubs" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { clubSelections } = body

        if (!Array.isArray(clubSelections)) {
            return NextResponse.json({ error: "clubSelections must be an array" }, { status: 400 })
        }

        const existingClubs: { name: string }[] = []
        const fullClubs: { name: string }[] = []

        // Önce tüm kulüpleri ve mevcut seçimleri çek
        const clubIds = clubSelections.map((s: { clubId: string }) => s.clubId)
        const clubs = await prisma.club.findMany({
            where: { id: { in: clubIds } },
            include: { selections: true }
        })

        const clubMap = new Map(clubs.map(club => [club.id, club]))

        // Her kulüp seçimi için kontrol yap
        for (const selection of clubSelections) {
            const club = clubMap.get(selection.clubId)

            if (!club) {
                return NextResponse.json({ error: `Club with id ${selection.clubId} not found` }, { status: 404 })
            }

            // Öğrencinin zaten bu kulüpte olup olmadığını kontrol et
            const existingSelection = await prisma.clubSelection.findFirst({
                where: {
                    clubId: selection.clubId,
                    studentId: selection.studentId
                }
            })

            if (existingSelection) {
                existingClubs.push({ name: club.name })
                continue
            }

            // Kapasite kontrolü - aynı istekteki aynı kulüp için yapılan seçimleri de hesaba kat
            // (Aynı öğrenci aynı kulübe birden fazla kez kayıt olamaz, ama farklı öğrenciler olabilir)
            const sameClubInRequest = clubSelections.filter(
                (s: { clubId: string }) => s.clubId === selection.clubId
            ).length
            
            // Mevcut seçimler + bu istekteki yeni seçimler
            const totalSelections = club.selections.length + sameClubInRequest
            
            if (totalSelections > club.capacity) {
                fullClubs.push({ name: club.name })
            }
        }

        // Eğer zaten kayıtlı olduğu kulüpler varsa hata döndür
        if (existingClubs.length > 0) {
            return NextResponse.json({ 
                error: "Student is already registered in some clubs", 
                existingClubs 
            }, { status: 400 })
        }

        // Eğer dolu kulüpler varsa hata döndür
        if (fullClubs.length > 0) {
            return NextResponse.json({ 
                error: "Some clubs are at full capacity", 
                fullClubs 
            }, { status: 400 })
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
