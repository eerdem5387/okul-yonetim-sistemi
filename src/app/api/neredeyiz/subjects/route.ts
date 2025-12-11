import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tüm dersleri listele
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get("academicYearId")

    const where = academicYearId ? { academicYearId } : {}

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        assignments: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        units: {
          orderBy: {
            order: "asc",
          },
          include: {
            topics: {
              orderBy: {
                order: "asc",
              },
              include: {
                progress: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(subjects)
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json(
      { error: "Dersler getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni ders oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { academicYearId, name, code, description } = body

    if (!academicYearId || !name) {
      return NextResponse.json(
        { error: "Akademik yıl ve ders adı zorunludur" },
        { status: 400 }
      )
    }

    const subject = await prisma.subject.create({
      data: {
        academicYearId,
        name,
        code: code || null,
        description: description || null,
      },
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    console.error("Error creating subject:", error)
    return NextResponse.json(
      { error: "Ders oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

