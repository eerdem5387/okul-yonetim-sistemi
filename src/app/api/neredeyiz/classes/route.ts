import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** Neredeyiz sınıf planı listesi */
export async function GET(request: NextRequest) {
  try {
    const academicYearId = request.nextUrl.searchParams.get("academicYearId")
    const classes = await prisma.class.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      orderBy: [{ grade: "asc" }, { section: "asc" }],
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        academicYearId: true,
        academicYear: { select: { id: true, name: true, isActive: true } },
        _count: { select: { subjects: true, schedules: true } },
      },
    })
    return NextResponse.json({ classes })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Sınıflar yüklenemedi" }, { status: 500 })
  }
}
