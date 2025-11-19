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
        const { studentId, clubSelections } = body

        if (!studentId) {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 })
        }

        if (!Array.isArray(clubSelections)) {
            return NextResponse.json({ error: "clubSelections must be an array" }, { status: 400 })
        }

        // Transaction içinde tüm işlemleri atomic olarak yap
        const result = await prisma.$transaction(async (tx) => {
            // 1. Önce öğrencinin mevcut tüm kulüp seçimlerini sil
            await tx.clubSelection.deleteMany({
                where: { studentId }
            })

            // Eğer boş array geldiyse (tüm kulüplerden çıkma), sadece silme işlemiyle bitir
            if (clubSelections.length === 0) {
                return { success: true, message: "All club selections removed", count: 0 }
            }

            const fullClubs: { name: string }[] = []
            const clubIds = clubSelections.map((s: { clubId: string }) => s.clubId)

            // 2. Seçilen kulüpleri transaction içinde tekrar çek (FRESH DATA - race condition önlemi)
            const clubs = await tx.club.findMany({
                where: { id: { in: clubIds } },
                include: { 
                    selections: {
                        select: { id: true, studentId: true }
                    }
                }
            })

            const clubMap = new Map(clubs.map(club => [club.id, club]))

            // 3. Her kulüp seçimi için GÜNCEL kapasite kontrolü yap
            for (const selection of clubSelections) {
                const club = clubMap.get(selection.clubId)

                if (!club) {
                    throw new Error(`Club with id ${selection.clubId} not found`)
                }

                // GÜNCEL kontenjan kontrolü (transaction içinde fresh data ile)
                const currentSelectionsCount = club.selections.length
                
                // Aynı istekteki aynı kulüp için yapılan seçimleri de hesaba kat
                const sameClubInRequest = clubSelections.filter(
                    (s: { clubId: string }) => s.clubId === selection.clubId
                ).length
                
                // Toplam kontenjan kontrolü
                const totalSelections = currentSelectionsCount + sameClubInRequest
                
                if (totalSelections > club.capacity) {
                    fullClubs.push({ name: club.name })
                }
            }

            // 4. Eğer dolu kulüpler varsa transaction'ı rollback et
            if (fullClubs.length > 0) {
                throw new Error(JSON.stringify({ 
                    error: "Some clubs are at full capacity", 
                    fullClubs 
                }))
            }

            // 5. Tüm kontroller başarılıysa, yeni seçimleri kaydet
            const createdSelections = await tx.clubSelection.createMany({
                data: clubSelections,
                skipDuplicates: true
            })

            return { success: true, count: createdSelections.count }
        }, {
            maxWait: 5000, // Transaction için maksimum bekleme süresi
            timeout: 10000, // Transaction timeout süresi
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Error saving club selections:", error)
        
        // Kapasite hatası için özel handling
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
