import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/schedules/teacher
 * Öğretmenin haftalık ders programını döndürür
 * 
 * Query Parameters:
 * - teacherId: string (zorunlu)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")

    if (!teacherId) {
      return NextResponse.json(
        { error: "teacherId parametresi gereklidir" },
        { status: 400 }
      )
    }

    // Öğretmen kontrolü
    const teacher = await prisma.staff.findUnique({
      where: { id: teacherId },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: "Öğretmen bulunamadı" },
        { status: 404 }
      )
    }

    // Öğretmenin tüm derslerini getir
    const schedules = await prisma.schedule.findMany({
      where: { teacherId },
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
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })

    // Günlere göre grupla
    const weekSchedule: Record<number, typeof schedules> = {
      1: [], // Pazartesi
      2: [], // Salı
      3: [], // Çarşamba
      4: [], // Perşembe
      5: [], // Cuma
      6: [], // Cumartesi (opsiyonel)
      7: [], // Pazar (opsiyonel)
    }

    schedules.forEach((schedule) => {
      weekSchedule[schedule.dayOfWeek].push(schedule)
    })

    // İstatistikler
    const stats = {
      totalLessons: schedules.length,
      classesCount: new Set(schedules.map((s) => s.classId)).size,
      subjectsCount: new Set(schedules.map((s) => s.subjectName)).size,
      averageLessonsPerDay: (schedules.length / 5).toFixed(1),
    }

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        subject: teacher.subject,
      },
      weekSchedule,
      schedules, // Tüm dersler (filtreleme için)
      stats,
    })
  } catch (error) {
    console.error("Error fetching teacher schedule:", error)
    return NextResponse.json(
      { error: "Öğretmen ders programı yüklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

