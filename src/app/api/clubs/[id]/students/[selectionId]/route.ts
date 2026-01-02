import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/clubs/[id]/students/[selectionId]
 * Kulüp seçim kaydını getirir
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string; selectionId: string }> }
) {
    try {
        const params = await context.params
        const selection = await prisma.clubSelection.findUnique({
            where: { id: params.selectionId },
            include: {
                student: true,
                club: true,
            },
        })

        if (!selection) {
            return NextResponse.json({ error: "Selection not found" }, { status: 404 })
        }

        return NextResponse.json(selection)
    } catch (error) {
        console.error("Error fetching club selection:", error)
        return NextResponse.json({ error: "Failed to fetch club selection" }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string; selectionId: string }> }
) {
    try {
        const params = await context.params

        // Öğrenciyi kulüpten çıkar
        await prisma.clubSelection.delete({
            where: { id: params.selectionId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error removing student from club:", error)
        return NextResponse.json({ error: "Failed to remove student from club" }, { status: 500 })
    }
}
