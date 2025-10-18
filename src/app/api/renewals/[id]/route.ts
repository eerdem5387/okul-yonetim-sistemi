import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const renewal = await prisma.renewal.findUnique({
            where: { id: params.id },
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        tcNumber: true
                    }
                }
            }
        })

        if (!renewal) {
            return NextResponse.json({ error: "Renewal not found" }, { status: 404 })
        }

        return NextResponse.json(renewal)
    } catch (error) {
        console.error("Error fetching renewal:", error)
        return NextResponse.json({ error: "Failed to fetch renewal" }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { contractData } = body

        const renewal = await prisma.renewal.update({
            where: { id: params.id },
            data: { contractData },
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        tcNumber: true
                    }
                }
            }
        })

        return NextResponse.json(renewal)
    } catch (error) {
        console.error("Error updating renewal:", error)
        return NextResponse.json({ error: "Failed to update renewal" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        await prisma.renewal.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting renewal:", error)
        return NextResponse.json({ error: "Failed to delete renewal" }, { status: 500 })
    }
}
