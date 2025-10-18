import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const contract = await prisma.mealContract.findUnique({
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

        if (!contract) {
            return NextResponse.json({ error: "Contract not found" }, { status: 404 })
        }

        return NextResponse.json(contract)
    } catch (error) {
        console.error("Error fetching meal contract:", error)
        return NextResponse.json({ error: "Failed to fetch meal contract" }, { status: 500 })
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

        const contract = await prisma.mealContract.update({
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

        return NextResponse.json(contract)
    } catch (error) {
        console.error("Error updating meal contract:", error)
        return NextResponse.json({ error: "Failed to update meal contract" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        await prisma.mealContract.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting meal contract:", error)
        return NextResponse.json({ error: "Failed to delete meal contract" }, { status: 500 })
    }
}
