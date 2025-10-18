import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
