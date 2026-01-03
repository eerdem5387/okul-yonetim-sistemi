import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const contracts = await prisma.bookContract.findMany({
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        tcNumber: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json(contracts)
    } catch (error) {
        console.error("Error fetching book contracts:", error)
        return NextResponse.json({ error: "Failed to fetch book contracts" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { studentId, contractData } = body

        // Validasyon
        if (!studentId) {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 })
        }

        // Öğrencinin var olup olmadığını kontrol et
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        const contract = await prisma.bookContract.create({
            data: {
                studentId,
                contractData: contractData || {}
            },
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
        console.error("Error creating book contract:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ 
            error: "Failed to create book contract",
            details: errorMessage
        }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, contractData } = body

        const contract = await prisma.bookContract.update({
            where: { id },
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

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const { contractIds } = body

        if (Array.isArray(contractIds)) {
            // Bulk delete
            await prisma.bookContract.deleteMany({
                where: { id: { in: contractIds } }
            })
        } else {
            // Single delete
            await prisma.bookContract.delete({
                where: { id: contractIds }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting book contracts:", error)
        return NextResponse.json({ error: "Failed to delete book contracts" }, { status: 500 })
    }
}
