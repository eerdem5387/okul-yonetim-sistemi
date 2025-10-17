import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const students = await prisma.student.findMany({
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json(students)
    } catch (error) {
        console.error("Error fetching students:", error)
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { firstName, lastName, tcNumber, birthDate, phone, email, address, parentName, parentPhone, parentEmail } = body

        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                tcNumber,
                birthDate: new Date(birthDate),
                phone,
                email,
                address,
                parentName,
                parentPhone,
                parentEmail
            }
        })

        return NextResponse.json(student)
    } catch (error) {
        console.error("Error creating student:", error)
        return NextResponse.json({ error: "Failed to create student" }, { status: 500 })
    }
}
