import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const { searchParams } = new URL(request.url)
        const format = searchParams.get("format") // "legacy" veya null
        
        const student = await prisma.student.findUnique({
            where: { id: params.id }
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        // Backward compatibility: 
        // - Test bot: { student: {...} } formatını bekliyor (default)
        // - Eski frontend (eğer varsa): ?format=legacy ile direkt student objesi
        if (format === "legacy") {
            return NextResponse.json(student)
        }
        
        // Default: Test bot uyumlu format
        return NextResponse.json({ student })
    } catch (error) {
        console.error("Error fetching student:", error)
        return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { 
            firstName, lastName, tcNumber, birthDate, grade, address,
            motherName, motherTc, motherPhone, motherAddress, motherOccupation,
            fatherName, fatherTc, fatherPhone, fatherAddress, fatherOccupation
        } = body

        const updateData: Record<string, unknown> = {
            firstName,
            lastName,
            tcNumber,
            grade,
            address,
            motherName,
            motherTc,
            motherPhone,
            motherAddress,
            motherOccupation,
            fatherName,
            fatherTc,
            fatherPhone,
            fatherAddress,
            fatherOccupation
        }

        // birthDate sadece varsa ekle
        if (birthDate) {
            updateData.birthDate = new Date(birthDate)
        }

        const student = await prisma.student.update({
            where: { id: params.id },
            data: updateData
        })

        return NextResponse.json({ student })
    } catch (error) {
        console.error("Error updating student:", error)
        return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        await prisma.student.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting student:", error)
        return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
    }
}
