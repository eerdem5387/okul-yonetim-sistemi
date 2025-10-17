import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const contracts = await prisma.mealContract.findMany({
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
        console.error("Error fetching meal contracts:", error)
        return NextResponse.json({ error: "Failed to fetch meal contracts" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { studentId, contractData } = body

        const contract = await prisma.mealContract.create({
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

        return NextResponse.json(contract)
    } catch (error) {
        console.error("Error creating meal contract:", error)
        return NextResponse.json({ error: "Failed to create meal contract" }, { status: 500 })
    }
}
