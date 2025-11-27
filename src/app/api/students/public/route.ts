import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Public endpoint for fetching student list (for gezi-basvuru-sistemi)
 * Returns only basic student information: id, firstName, lastName, grade
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  const allowedOrigins = [
    "https://gezi.leventokullari.com",
    "http://localhost:3000",
    "http://localhost:3001",
  ]

  const response = new NextResponse(null, { status: 200 })
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
  } else {
    response.headers.set("Access-Control-Allow-Origin", "*")
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim() || ""
    const grade = searchParams.get("grade")?.trim() || ""

    const whereConditions: Array<Record<string, unknown>> = []

    // Exclude graduated students
    whereConditions.push({
      NOT: { grade: { equals: "Mezun", mode: "insensitive" as const } },
    })

    // Search filter
    if (search) {
      whereConditions.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          {
            AND: [
              { firstName: { contains: search.split(" ")[0] || "", mode: "insensitive" as const } },
              { lastName: { contains: search.split(" ")[1] || "", mode: "insensitive" as const } },
            ],
          },
        ],
      })
    }

    // Grade filter
    if (grade) {
      whereConditions.push({ grade: { equals: grade, mode: "insensitive" as const } })
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {}

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        tcNumber: true,
      },
      orderBy: [
        { grade: "asc" },
        { firstName: "asc" },
        { lastName: "asc" },
      ],
      take: 100, // Limit to 100 results for performance
    })

    const response = NextResponse.json({
      data: students.map((s) => ({
        id: s.id,
        fullName: `${s.firstName} ${s.lastName}`,
        grade: s.grade,
        tcNumber: s.tcNumber,
      })),
    })

    // CORS headers for gezi-basvuru-sistemi
    const origin = request.headers.get("origin")
    const allowedOrigins = [
      "https://gezi.leventokullari.com",
      "http://localhost:3000",
      "http://localhost:3001",
    ]

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set("Access-Control-Allow-Credentials", "true")
    } else {
      response.headers.set("Access-Control-Allow-Origin", "*")
    }

    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type")
    response.headers.set("Access-Control-Max-Age", "86400")

    return response
  } catch (error) {
    console.error("Error fetching public students:", error)
    return NextResponse.json(
      { error: "Öğrenci listesi alınamadı" },
      { status: 500 }
    )
  }
}

