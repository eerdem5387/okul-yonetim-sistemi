import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/teachers/[id]/classes
 * Öğretmenin atandığı sınıfları döndürür
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Öğretmen kontrolü
    const teacher = await prisma.staff.findUnique({
      where: { id },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: "Öğretmen bulunamadı" },
        { status: 404 }
      )
    }

    // Öğretmenin ders programından sınıfları çıkar
    const schedules = await prisma.schedule.findMany({
      where: { teacherId: id },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
      },
      distinct: ["classId"],
    })

    // Benzersiz sınıfları al
    const uniqueClasses = schedules
      .map((s) => s.class)
      .filter((c) => c !== null)
      .filter((value, index, self) => 
        index === self.findIndex((c) => c.id === value.id)
      )

    return NextResponse.json({ classes: uniqueClasses })
  } catch (error) {
    console.error("Error fetching teacher classes:", error)
    return NextResponse.json(
      { error: "Sınıflar yüklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

