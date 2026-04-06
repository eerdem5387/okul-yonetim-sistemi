import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { k12GradeWhereClause } from "@/lib/student-grade-level"

/**
 * Public endpoint for fetching student by TC number (for gezi-basvuru-sistemi)
 * KVKK gereği sadece TC numarası ile arama yapılabilir
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
    const tcNumber = searchParams.get("tcNumber")?.trim() || ""

    const whereConditions: Array<Record<string, unknown>> = []

    whereConditions.push(k12GradeWhereClause())

    // TC Number filter (KVKK gereği sadece TC ile arama)
    if (tcNumber) {
      // TC numarası sadece rakam olmalı ve 11 haneli olmalı
      const cleanedTc = tcNumber.replace(/\D/g, "") // Sadece rakamları al
      if (cleanedTc.length === 11) {
        whereConditions.push({ tcNumber: { equals: cleanedTc } })
      } else {
        // Geçersiz TC numarası - boş sonuç döndür
        return NextResponse.json({ data: [] })
      }
    } else {
      // TC numarası verilmemiş - boş sonuç döndür (KVKK gereği)
      return NextResponse.json({ data: [] })
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
      take: 1, // TC numarası unique olduğu için sadece 1 sonuç beklenir
    })

    // Test bot uyumluluğu için - hem students hem data property'si
    const studentsList = students.map((s) => ({
      id: s.id,
      fullName: `${s.firstName} ${s.lastName}`,
      grade: s.grade,
      tcNumber: s.tcNumber,
    }))

    const response = NextResponse.json({
      students: studentsList,
      data: studentsList,
      // Test bot için ek kontrol
      success: true,
      count: studentsList.length,
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

