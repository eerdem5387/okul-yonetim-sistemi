import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const contract = await prisma.bookContract.findUnique({
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
        console.error("Error fetching book contract:", error)
        return NextResponse.json({ error: "Failed to fetch book contract" }, { status: 500 })
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

        const contract = await prisma.bookContract.update({
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
        console.error("Error updating book contract:", error)
        return NextResponse.json({ error: "Failed to update book contract" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        await prisma.bookContract.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting book contract:", error)
        return NextResponse.json({ error: "Failed to delete book contract" }, { status: 500 })
    }
}
