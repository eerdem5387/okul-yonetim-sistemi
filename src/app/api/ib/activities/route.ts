import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - IB Viewer için faaliyetleri listele (sadece okuma - doğrulanmış faaliyetler)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId") || ""
    const type = searchParams.get("type") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""

    const whereConditions: Array<Record<string, unknown>> = []

    // IB Viewer sadece doğrulanmış faaliyetleri görebilir
    whereConditions.push({ isVerified: true })

    if (studentId) {
      whereConditions.push({ studentId })
    }

    if (type) {
      whereConditions.push({ type })
    }

    if (startDate) {
      whereConditions.push({ activityDate: { gte: new Date(startDate) } })
    }

    if (endDate) {
      whereConditions.push({ activityDate: { lte: new Date(endDate) } })
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {}

    const activities = await prisma.activity.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            birthDate: true,
          },
        },
      },
      orderBy: {
        activityDate: "desc",
      },
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error("Error fetching activities for IB viewer:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}

