import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * İki zaman aralığının çakışıp çakışmadığını kontrol eder
 * @param start1 İlk aralığın başlangıç saati (HH:MM formatında)
 * @param end1 İlk aralığın bitiş saati (HH:MM formatında)
 * @param start2 İkinci aralığın başlangıç saati (HH:MM formatında)
 * @param end2 İkinci aralığın bitiş saati (HH:MM formatında)
 * @returns true eğer çakışma varsa
 */
function hasTimeConflict(start1: string, end1: string, start2: string, end2: string): boolean {
  // Zamanları dakikaya çevir (örn: "09:00" -> 540)
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const start1Min = timeToMinutes(start1)
  const end1Min = timeToMinutes(end1)
  const start2Min = timeToMinutes(start2)
  const end2Min = timeToMinutes(end2)

  // Çakışma kontrolü: İki aralık çakışıyor mu?
  // Çakışma: (start1 < end2 && end1 > start2)
  return start1Min < end2Min && end1Min > start2Min
}

/**
 * GET /api/schedules
 * Ders programını döndürür
 * 
 * Query Parameters:
 * - classId?: string - Belirli bir sınıfın programı
 * - teacherId?: string - Belirli bir öğretmenin programı
 * - dayOfWeek?: number - Belirli bir günün dersleri
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")
    const teacherId = searchParams.get("teacherId")
    const dayOfWeek = searchParams.get("dayOfWeek")

    const whereConditions: Prisma.ScheduleWhereInput = {}

    if (classId) {
      whereConditions.classId = classId
    }

    if (teacherId) {
      whereConditions.teacherId = teacherId
    }

    if (dayOfWeek) {
      whereConditions.dayOfWeek = parseInt(dayOfWeek)
    }

    const schedules = await prisma.schedule.findMany({
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
            department: true,
            subject: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json(
      { error: "Ders programı yüklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/schedules
 * Yeni ders ekler
 * 
 * Body:
 * - classId: string
 * - subjectName: string
 * - teacherId: string
 * - dayOfWeek: number (1-7)
 * - startTime: string ("09:00")
 * - endTime: string ("09:45")
 * - room?: string
 * - notes?: string
 * - requestedBy?: string (Rehberlik uzmanı ID - onay mekanizması için)
 * 
 * Not: Eğer requestedBy belirtilirse, onay bekleyen bir talep oluşturulur.
 * Yönetici/Müdür için direkt aktif ders eklenir.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      classId,
      subjectName,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      notes,
      requestedBy, // Rehberlik uzmanı ise bu alan dolu gelir
    } = body

    // Validasyon
    if (!classId || !subjectName || !teacherId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json(
        { error: "classId, subjectName, teacherId, dayOfWeek, startTime ve endTime zorunludur" },
        { status: 400 }
      )
    }

    // Gün kontrolü
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      return NextResponse.json(
        { error: "dayOfWeek 1-7 arasında olmalıdır" },
        { status: 400 }
      )
    }

    // Sınıf kontrolü
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classData) {
      return NextResponse.json(
        { error: "Sınıf bulunamadı" },
        { status: 404 }
      )
    }

    // Öğretmen kontrolü
    const teacher = await prisma.staff.findUnique({
      where: { id: teacherId },
    })

    if (!teacher || teacher.department !== "OGRETMEN") {
      return NextResponse.json(
        { error: "Geçerli bir öğretmen seçiniz" },
        { status: 400 }
      )
    }

    // Öğretmenin aynı gün ve saatte başka bir sınıfta dersi var mı kontrol et
    const conflictingSchedules = await prisma.schedule.findMany({
      where: {
        teacherId,
        dayOfWeek,
        isActive: true,
      },
      include: {
        class: {
          select: {
            name: true,
            grade: true,
            section: true,
          },
        },
      },
    })

    // Çakışan dersleri bul
    const conflicts = conflictingSchedules.filter((schedule) =>
      hasTimeConflict(schedule.startTime, schedule.endTime, startTime, endTime)
    )

    if (conflicts.length > 0) {
      const conflictInfo = conflicts.map((c) => 
        `${c.class.name} sınıfında ${c.startTime}-${c.endTime} saatleri arasında ${c.subjectName} dersi`
      ).join(', ')

      return NextResponse.json(
        { 
          error: `Bu öğretmen ${dayOfWeek === 1 ? 'Pazartesi' : dayOfWeek === 2 ? 'Salı' : dayOfWeek === 3 ? 'Çarşamba' : dayOfWeek === 4 ? 'Perşembe' : dayOfWeek === 5 ? 'Cuma' : dayOfWeek === 6 ? 'Cumartesi' : 'Pazar'} günü ${startTime}-${endTime} saatleri arasında zaten ders vermektedir. Çakışan dersler: ${conflictInfo}`,
          conflicts: conflicts.map(c => ({
            class: c.class.name,
            subject: c.subjectName,
            time: `${c.startTime}-${c.endTime}`,
          })),
        },
        { status: 400 }
      )
    }

    // Eğer requestedBy varsa (Rehberlik), onay talebi oluştur
    if (requestedBy) {
      const newValue = JSON.stringify({
        classId,
        subjectName,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        room,
        notes,
      })

      const approval = await prisma.scheduleApproval.create({
        data: {
          classId,
          changeType: "CREATE",
          requestedBy,
          status: "PENDING",
          newValue,
        },
      })

      return NextResponse.json({
        success: true,
        message: "Ders ekleme talebi oluşturuldu. Onay bekliyor.",
        approval,
        pendingApproval: true,
      })
    }

    // Direkt ders oluştur (Yönetici/Müdür için)
    const newSchedule = await prisma.schedule.create({
      data: {
        classId,
        subjectName,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        room,
        notes,
        isActive: true,
      },
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
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Ders başarıyla eklendi",
      schedule: newSchedule,
    })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return NextResponse.json(
      { error: "Ders eklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

