import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

  // GET - Tüm dersleri listele
  export async function GET(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const academicYearId = searchParams.get("academicYearId")
      const grade = searchParams.get("grade")
      const section = searchParams.get("section")
      const staffId = searchParams.get("staffId") // Öğretmen ID'si

      const where: Record<string, unknown> = {}

      if (academicYearId) {
        where.academicYearId = academicYearId
      }
      if (grade) {
        where.grade = parseInt(grade, 10)
      }
      if (section) {
        where.section = section
      }
      // Öğretmen ID'si varsa, sadece o öğretmene atanmış dersleri getir
      if (staffId) {
        where.assignments = {
          some: {
            staffId: staffId,
          },
        }
      }

    const subjects = await prisma.subject.findMany({
      where: where as never,
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
        grade: "asc",
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
    const { academicYearId, name, code, grade, section, description } = body

    if (!academicYearId || !name || !grade) {
      return NextResponse.json(
        { error: "Akademik yıl, ders adı ve sınıf zorunludur" },
        { status: 400 }
      )
    }

    // Sınıf validasyonu (5-12 arası)
    const gradeNum = parseInt(grade, 10)
    if (isNaN(gradeNum) || gradeNum < 5 || gradeNum > 12) {
      return NextResponse.json(
        { error: "Sınıf 5 ile 12 arasında olmalıdır" },
        { status: 400 }
      )
    }

    // Şube validasyonu (boş string ise null yap)
    const sectionValue = section && section.trim() !== "" ? section.trim() : null

    const subject = await prisma.subject.create({
      data: {
        academicYearId,
        name: name.trim(),
        code: code && code.trim() !== "" ? code.trim() : null,
        grade: gradeNum,
        section: sectionValue,
        description: description && description.trim() !== "" ? description.trim() : null,
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

