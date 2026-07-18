import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SERVICE_API_SECRET
  if (!expected) {
    console.error("[Yaz Okulu Students] SERVICE_API_SECRET tanımlı değil")
    return false
  }

  const secret = request.headers.get("x-service-secret")
  return secret === expected
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const studentId = new URL(request.url).searchParams.get("id")

    const students = await prisma.student.findMany({
      where: studentId ? { id: studentId } : undefined,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    })

    return NextResponse.json({
      ogrenciler: students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade,
      })),
    })
  } catch (error) {
    console.error("[Yaz Okulu Students] Hata:", error)
    return NextResponse.json(
      { error: "Öğrenci listesi alınamadı" },
      { status: 500 }
    )
  }
}
