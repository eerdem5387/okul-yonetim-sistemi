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

    // Ders programı + neredeyiz atamalarından sınıfları birleştir
    const [schedules, assignments] = await Promise.all([
      prisma.schedule.findMany({
        where: { teacherId: id, isActive: true },
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
      }),
      prisma.subjectAssignment.findMany({
        where: { staffId: id },
        include: {
          subject: {
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
          },
        },
      }),
    ])

    const byId = new Map<
      string,
      { id: string; name: string; grade: number; section: string }
    >()
    for (const s of schedules) {
      if (s.class) byId.set(s.class.id, s.class)
    }
    for (const a of assignments) {
      if (a.subject.class) byId.set(a.subject.class.id, a.subject.class)
    }

    const uniqueClasses = Array.from(byId.values()).sort(
      (a, b) => a.grade - b.grade || a.section.localeCompare(b.section)
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

