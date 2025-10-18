import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const registration = await prisma.newRegistration.findUnique({
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

        if (!registration) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 })
        }

        return NextResponse.json(registration)
    } catch (error) {
        console.error("Error fetching new registration:", error)
        return NextResponse.json({ error: "Failed to fetch new registration" }, { status: 500 })
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

        const registration = await prisma.newRegistration.update({
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

        return NextResponse.json(registration)
    } catch (error) {
        console.error("Error updating new registration:", error)
        return NextResponse.json({ error: "Failed to update new registration" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        await prisma.newRegistration.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting new registration:", error)
        return NextResponse.json({ error: "Failed to delete new registration" }, { status: 500 })
    }
}
