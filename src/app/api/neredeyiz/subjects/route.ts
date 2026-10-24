import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tüm dersleri listele
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get("academicYearId")
    const grade = searchParams.get("grade")
    const section = searchParams.get("section")
    const classId = searchParams.get("classId")
    const staffId = searchParams.get("staffId")
    const counselorId = searchParams.get("counselorId")

    const where: Record<string, unknown> = {}

    if (academicYearId) {
      where.academicYearId = academicYearId
    }

    // classId tercih edilir (öğretmen/rehberlik tek anahtar)
    if (classId) {
      where.classId = classId
    } else {
      if (grade) {
        where.grade = parseInt(grade, 10)
      }
      if (section) {
        where.section = section
      }
    }

    if (counselorId) {
      const assignedClasses = await prisma.class.findMany({
        where: { counselorId },
        select: { id: true },
      })
      const assignedClassIds = assignedClasses.map((c) => c.id)

      if (assignedClassIds.length === 0) {
        return NextResponse.json([])
      }

      if (classId) {
        if (!assignedClassIds.includes(classId)) {
          return NextResponse.json([])
        }
        where.classId = classId
      } else {
        where.classId = { in: assignedClassIds }
      }
    }

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
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
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
                progress: {
                  orderBy: {
                    createdAt: "desc",
                  },
                },
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

// POST - Yeni ders oluştur (classId zorunlu; grade/section Class'tan)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { academicYearId, name, code, description, classId, branchId } = body

    if (!name || !classId || String(classId).trim() === "") {
      return NextResponse.json(
        { error: "Ders adı ve sınıf (classId) zorunludur" },
        { status: 400 }
      )
    }

    const classData = await prisma.class.findUnique({
      where: { id: String(classId).trim() },
    })

    if (!classData) {
      return NextResponse.json({ error: "Sınıf bulunamadı" }, { status: 404 })
    }

    const yearId =
      academicYearId && String(academicYearId).trim() !== ""
        ? String(academicYearId).trim()
        : classData.academicYearId

    if (yearId !== classData.academicYearId) {
      return NextResponse.json(
        { error: "Akademik yıl, seçilen sınıfla uyuşmuyor" },
        { status: 400 }
      )
    }

    let resolvedBranchId: string | null =
      typeof branchId === "string" && branchId.trim() ? branchId.trim() : null
    if (!resolvedBranchId && name.trim()) {
      const { upsertBranchByName } = await import("@/lib/branches")
      const branch = await upsertBranchByName(name.trim())
      resolvedBranchId = branch?.id ?? null
    }

    const subject = await prisma.subject.create({
      data: {
        academicYearId: yearId,
        name: name.trim(),
        code: code && code.trim() !== "" ? code.trim() : null,
        grade: classData.grade,
        section: classData.section,
        classId: classData.id,
        branchId: resolvedBranchId,
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
