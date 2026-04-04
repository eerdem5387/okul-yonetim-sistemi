import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { isStaffEligibleAsClassCounselor } from "@/lib/staff-counseling"

/**
 * GET /api/classes
 * Sınıf listesini döndürür
 * 
 * Query Parameters:
 * - academicYearId?: string - Belirli bir akademik yıla ait sınıflar
 * - counselorId?: string - Belirli bir rehberlik uzmanına ait sınıflar (Rehberlik için)
 * - grade?: number - Belirli bir sınıf seviyesi (5-12)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId")
    const counselorId = searchParams.get("counselorId")
    const grade = searchParams.get("grade")

    const whereConditions: Prisma.ClassWhereInput = {}

    if (academicYearId) {
      whereConditions.academicYearId = academicYearId
    }

    if (counselorId) {
      whereConditions.counselorId = counselorId
    }

    if (grade) {
      whereConditions.grade = parseInt(grade)
    }

    const classes = await prisma.class.findMany({
      where: whereConditions,
      include: {
        academicYear: true,
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
              },
            },
          },
        },
        schedules: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            schedules: true,
          },
        },
      },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    })

    return NextResponse.json({ classes })
  } catch (error) {
    console.error("Error fetching classes:", error)
    return NextResponse.json(
      { error: "Sınıflar yüklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/classes
 * Yeni sınıf oluşturur
 * 
 * Body:
 * - name: string - Sınıf adı ("5/A", "10/B")
 * - grade: number - Sınıf seviyesi (5-12)
 * - section: string - Şube ("A", "B", "C")
 * - academicYearId: string - Akademik yıl ID
 * - counselorId?: string - Rehberlik uzmanı ID (opsiyonel)
 * - description?: string - Açıklama (opsiyonel)
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, grade, section, academicYearId, counselorId, description } = body

    // Validasyon
    if (!name || !grade || !section || !academicYearId) {
      return NextResponse.json(
        { error: "name, grade, section ve academicYearId zorunludur" },
        { status: 400 }
      )
    }

    // Sınıf seviyesi kontrolü
    if (grade < 5 || grade > 12) {
      return NextResponse.json(
        { error: "Sınıf seviyesi 5-12 arasında olmalıdır" },
        { status: 400 }
      )
    }

    // Akademik yıl kontrolü
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    })

    if (!academicYear) {
      return NextResponse.json(
        { error: "Akademik yıl bulunamadı" },
        { status: 404 }
      )
    }

    // Counselor kontrolü (eğer varsa)
    if (counselorId) {
      const counselor = await prisma.staff.findUnique({
        where: { id: counselorId },
      })

      if (!counselor || !isStaffEligibleAsClassCounselor(counselor.department)) {
        return NextResponse.json(
          { error: "Geçersiz rehberlik uzmanı" },
          { status: 400 }
        )
      }
    }

    // Sınıf oluştur
    const newClass = await prisma.class.create({
      data: {
        name,
        grade,
        section,
        academicYearId,
        counselorId,
        description,
      },
      include: {
        academicYear: true,
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Sınıf başarıyla oluşturuldu",
      class: newClass,
    })
  } catch (error) {
    console.error("Error creating class:", error)
    
    // Unique constraint hatası
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Bu akademik yılda bu isimde bir sınıf zaten mevcut" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Sınıf oluşturulurken bir hata oluştu" },
      { status: 500 }
    )
  }
}

