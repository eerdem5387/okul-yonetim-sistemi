import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"
import { k12GradeWhereClause } from "@/lib/student-grade-level"

/** Faaliyet katılımcı seçimi — arama ve yüksek limit (staff.view gerekmez). */
export async function GET(request: NextRequest) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const search = (searchParams.get("search") || "").trim()
    const parsedLimit = parseInt(searchParams.get("limit") || "500", 10)
    const limit = Math.min(5000, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 500))

    const whereConditions: Record<string, unknown>[] = [k12GradeWhereClause()]

    if (search) {
      whereConditions.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { tcNumber: { contains: search } },
          { grade: { contains: search, mode: "insensitive" as const } },
        ],
      })
    }

    const students = await prisma.student.findMany({
      where: { AND: whereConditions },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        tcNumber: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error("GET /api/activity-events/students error:", error)
    return NextResponse.json({ error: "Öğrenci listesi alınamadı" }, { status: 500 })
  }
}
