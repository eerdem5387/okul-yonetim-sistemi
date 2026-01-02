import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
                                grade: true
                            }
                        }
                    }
                }
            }
        })

        if (!club) {
            return NextResponse.json({ error: "Club not found" }, { status: 404 })
        }

        return NextResponse.json(club)
    } catch (error) {
        console.error("Error fetching club:", error)
        return NextResponse.json({ error: "Failed to fetch club" }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { name, description, capacity } = body

        const club = await prisma.club.update({
            where: { id: params.id },
            data: {
                name,
                description,
                capacity: parseInt(capacity)
            }
        })

        return NextResponse.json(club)
    } catch (error) {
        console.error("Error updating club:", error)
        return NextResponse.json({ error: "Failed to update club" }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        
        // Önce kulüp seçimlerini sil (cascade delete çalışmazsa)
        await prisma.clubSelection.deleteMany({
            where: { clubId: params.id }
        })
        
        // Sonra kulübü sil
        await prisma.club.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true, message: "Kulüp başarıyla silindi" })
    } catch (error) {
        console.error("Error deleting club:", error)
        if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
            return NextResponse.json({ error: "Kulüp bulunamadı" }, { status: 404 })
        }
        return NextResponse.json({ error: "Kulüp silinirken bir hata oluştu" }, { status: 500 })
    }
}
