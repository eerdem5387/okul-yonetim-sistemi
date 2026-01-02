import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/attendance
 * Yoklamaları listeler
 * 
 * Query:
 * - teacherId?: string (Öğretmen ID)
 * - classId?: string (Sınıf ID)
 * - studentId?: string (Öğrenci ID)
 * - date?: string (Tarih - ISO format)
 * - status?: string (PRESENT, ABSENT, LATE, EXCUSED)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")
    const classId = searchParams.get("classId")
    const studentId = searchParams.get("studentId")
    const date = searchParams.get("date")
    const status = searchParams.get("status")

    const whereConditions: Prisma.AttendanceWhereInput = {}

    if (teacherId) {
      whereConditions.teacherId = teacherId
    }

    if (classId) {
      whereConditions.classId = classId
    }

    if (studentId) {
      whereConditions.studentId = studentId
    }

    if (date) {
      // Tarihe göre filtrele (gün bazlı)
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      whereConditions.date = {
        gte: targetDate,
        lt: nextDay,
      }
    }

    if (status) {
      whereConditions.status = status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
    }

    const attendances = await prisma.attendance.findMany({
      where: whereConditions,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
          },
        },
        schedule: {
          select: {
            id: true,
            subjectName: true,
            dayOfWeek: true,
          },
        },
      },
      orderBy: [
        { date: "desc" },
        { startTime: "asc" },
      ],
    })

    return NextResponse.json({ attendances })
  } catch (error) {
    console.error("Error fetching attendances:", error)
    return NextResponse.json(
      { error: "Yoklamalar alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/attendance
 * Toplu yoklama alır
 * 
 * Body:
 * - scheduleId?: string (Ders programı ID - opsiyonel)
 * - classId: string (Sınıf ID)
 * - teacherId: string (Öğretmen ID)
 * - date: string (Tarih - ISO format)
 * - lessonName: string (Ders adı)
 * - startTime: string (Başlangıç saati - HH:mm)
 * - endTime: string (Bitiş saati - HH:mm)
 * - attendances: Array<{
 *     studentId: string,
 *     status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
 *     note?: string
 *   }>
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      scheduleId,
      classId,
      teacherId,
      date,
      lessonName,
      startTime,
      endTime,
      attendances,
    } = body

    // Validasyon - daha esnek
    if (!classId || !teacherId || !date) {
      return NextResponse.json(
        { error: "Sınıf, öğretmen ve tarih gereklidir" },
        { status: 400 }
      )
    }

    // lessonName, startTime, endTime opsiyonel olabilir
    const lessonNameValue = lessonName || "Ders"
    const startTimeValue = startTime || "09:00"
    const endTimeValue = endTime || "10:00"

    // attendances array kontrolü
    const validAttendances = Array.isArray(attendances) ? attendances.filter(att => att && att.studentId && att.status) : []

    if (validAttendances.length === 0) {
      return NextResponse.json(
        { error: "En az bir öğrenci yoklama durumu gereklidir" },
        { status: 400 }
      )
    }

    // Toplu yoklama oluştur
    const createdAttendances = await prisma.attendance.createMany({
      data: validAttendances.map((att: { studentId: string; status: string; note?: string }) => ({
        scheduleId: scheduleId || null,
        classId,
        teacherId,
        date: new Date(date),
        lessonName: lessonNameValue,
        startTime: startTimeValue,
        endTime: endTimeValue,
        studentId: att.studentId,
        status: att.status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
        note: att.note || null,
      })),
    })

    return NextResponse.json({
      success: true,
      count: createdAttendances.count,
      message: `${createdAttendances.count} öğrenci için yoklama kaydedildi`,
    })
  } catch (error) {
    console.error("Error creating attendances:", error)
    return NextResponse.json(
      { error: "Yoklama kaydedilirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

