import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const clubs = await prisma.club.findMany({
            include: {
                selections: {
                    include: {
                        student: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json(clubs)
    } catch (error) {
        console.error("Error fetching clubs:", error)
        return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, capacity } = body

        const club = await prisma.club.create({
            data: {
                name,
                description,
                capacity: parseInt(capacity)
            }
        })

        return NextResponse.json(club)
    } catch (error) {
        console.error("Error creating club:", error)
        return NextResponse.json({ error: "Failed to create club" }, { status: 500 })
    }
}
