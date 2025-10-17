import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const renewals = await prisma.renewal.findMany({
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

        return NextResponse.json(renewals)
    } catch (error) {
        console.error("Error fetching renewals:", error)
        return NextResponse.json({ error: "Failed to fetch renewals" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { studentId, contractData } = body

        const renewal = await prisma.renewal.create({
            data: {
                studentId,
                contractData
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

        return NextResponse.json(renewal)
    } catch (error) {
        console.error("Error creating renewal:", error)
        return NextResponse.json({ error: "Failed to create renewal" }, { status: 500 })
    }
}
