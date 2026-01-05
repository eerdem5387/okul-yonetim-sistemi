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
                        id: true,
                        firstName: true,
                        lastName: true,
                        tcNumber: true,
                        grade: true,
                        birthDate: true,
                        address: true,
                        motherName: true,
                        motherPhone: true,
                        fatherName: true,
                        fatherPhone: true
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

        // Önce sözleşmeyi bul ve studentId'yi al
        const renewal = await prisma.renewal.findUnique({
            where: { id: params.id },
            select: { studentId: true }
        })

        if (!renewal) {
            return NextResponse.json({ error: "Renewal not found" }, { status: 404 })
        }

        // Öğrencinin tüm yan sözleşmelerini sil (cascade delete)
        await Promise.all([
            prisma.uniformContract.deleteMany({ where: { studentId: renewal.studentId } }),
            prisma.mealContract.deleteMany({ where: { studentId: renewal.studentId } }),
            prisma.serviceContract.deleteMany({ where: { studentId: renewal.studentId } }),
            prisma.bookContract.deleteMany({ where: { studentId: renewal.studentId } })
        ])

        // Ana sözleşmeyi sil
        await prisma.renewal.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting renewal:", error)
        return NextResponse.json({ error: "Failed to delete renewal" }, { status: 500 })
    }
}
