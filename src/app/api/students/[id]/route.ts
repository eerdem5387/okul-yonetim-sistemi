import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const student = await prisma.student.findUnique({
            where: { id: params.id }
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        return NextResponse.json(student)
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
            firstName, lastName, tcNumber, birthDate, grade, phone, email, address, 
            parentName, parentPhone, parentEmail, parent2Name, parent2Phone, parent2Email 
        } = body

        const student = await prisma.student.update({
            where: { id: params.id },
            data: {
                firstName,
                lastName,
                tcNumber,
                birthDate: new Date(birthDate),
                grade,
                phone,
                email,
                address,
                parentName,
                parentPhone,
                parentEmail,
                parent2Name,
                parent2Phone,
                parent2Email
            }
        })

        return NextResponse.json(student)
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
