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
 * GET /api/schedules/[id]
 * Ders detaylarını döndürür
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params

    const schedule = await prisma.schedule.findUnique({
      where: { id },
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
            email: true,
            phone: true,
          },
        },
        approvals: {
          where: {
            status: "PENDING",
          },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return NextResponse.json(
      { error: "Ders bilgileri yüklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/schedules/[id]
 * Ders programını günceller
 * 
 * Body:
 * - subjectName?: string
 * - teacherId?: string
 * - dayOfWeek?: number
 * - startTime?: string
 * - endTime?: string
 * - room?: string
 * - notes?: string
 * - requestedBy?: string (Rehberlik uzmanı ID - onay mekanizması için)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: scheduleId } = params
    const body = await request.json()
    const {
      subjectName,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      notes,
      requestedBy,
    } = body

    // Mevcut ders kontrolü
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }

    // Öğretmen kontrolü (eğer değiştiriliyorsa)
    if (teacherId && teacherId !== existingSchedule.teacherId) {
      const teacher = await prisma.staff.findUnique({
        where: { id: teacherId },
      })

      if (!teacher || teacher.department !== "OGRETMEN") {
        return NextResponse.json(
          { error: "Geçerli bir öğretmen seçiniz" },
          { status: 400 }
        )
      }
    }

    // Çakışma kontrolü: Eğer öğretmen, gün veya saat değiştiriliyorsa kontrol et
    const finalTeacherId = teacherId ?? existingSchedule.teacherId
    const finalDayOfWeek = dayOfWeek ?? existingSchedule.dayOfWeek
    const finalStartTime = startTime ?? existingSchedule.startTime
    const finalEndTime = endTime ?? existingSchedule.endTime

    // Eğer öğretmen, gün veya saat değiştiyse çakışma kontrolü yap
    const needsConflictCheck = 
      teacherId !== undefined || 
      dayOfWeek !== undefined || 
      startTime !== undefined || 
      endTime !== undefined

    if (needsConflictCheck) {
      // Öğretmenin aynı gün ve saatte başka bir sınıfta dersi var mı kontrol et (mevcut dersi hariç tut)
      const conflictingSchedules = await prisma.schedule.findMany({
        where: {
          teacherId: finalTeacherId,
          dayOfWeek: finalDayOfWeek,
          isActive: true,
          NOT: {
            id: scheduleId, // Mevcut dersi hariç tut
          },
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
        hasTimeConflict(schedule.startTime, schedule.endTime, finalStartTime, finalEndTime)
      )

      if (conflicts.length > 0) {
        const conflictInfo = conflicts.map((c) => 
          `${c.class.name} sınıfında ${c.startTime}-${c.endTime} saatleri arasında ${c.subjectName} dersi`
        ).join(', ')

        const dayNames = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
        
        return NextResponse.json(
          { 
            error: `Bu öğretmen ${dayNames[finalDayOfWeek]} günü ${finalStartTime}-${finalEndTime} saatleri arasında zaten ders vermektedir. Çakışan dersler: ${conflictInfo}`,
            conflicts: conflicts.map(c => ({
              class: c.class.name,
              subject: c.subjectName,
              time: `${c.startTime}-${c.endTime}`,
            })),
          },
          { status: 400 }
        )
      }
    }

    // Eğer requestedBy varsa (Rehberlik), onay talebi oluştur
    if (requestedBy) {
      const oldValue = JSON.stringify(existingSchedule)
      const newValue = JSON.stringify({
        ...existingSchedule,
        subjectName: subjectName ?? existingSchedule.subjectName,
        teacherId: teacherId ?? existingSchedule.teacherId,
        dayOfWeek: dayOfWeek ?? existingSchedule.dayOfWeek,
        startTime: startTime ?? existingSchedule.startTime,
        endTime: endTime ?? existingSchedule.endTime,
        room: room ?? existingSchedule.room,
        notes: notes ?? existingSchedule.notes,
      })

      const approval = await prisma.scheduleApproval.create({
        data: {
          scheduleId,
          classId: existingSchedule.classId,
          changeType: "UPDATE",
          requestedBy,
          status: "PENDING",
          oldValue,
          newValue,
        },
      })

      return NextResponse.json({
        success: true,
        message: "Ders güncelleme talebi oluşturuldu. Onay bekliyor.",
        approval,
        pendingApproval: true,
      })
    }

    // Direkt güncelleme (Yönetici/Müdür için)
    const updateData: Prisma.ScheduleUpdateInput = {}
    if (subjectName !== undefined) updateData.subjectName = subjectName
    if (teacherId !== undefined) updateData.teacher = { connect: { id: teacherId } }
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (room !== undefined) updateData.room = room
    if (notes !== undefined) updateData.notes = notes

    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: updateData,
      include: {
        class: {
          select: {
            id: true,
            name: true,
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
      message: "Ders başarıyla güncellendi",
      schedule: updatedSchedule,
    })
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json(
      { error: "Ders güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/schedules/[id]
 * Dersi siler
 * 
 * Query:
 * - requestedBy?: string (Rehberlik uzmanı ID - onay mekanizması için)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: scheduleId } = params
    const { searchParams } = new URL(request.url)
    const requestedBy = searchParams.get("requestedBy")

    // Mevcut ders kontrolü
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }

    // Eğer requestedBy varsa (Rehberlik), onay talebi oluştur
    if (requestedBy) {
      const oldValue = JSON.stringify(existingSchedule)

      const approval = await prisma.scheduleApproval.create({
        data: {
          scheduleId,
          classId: existingSchedule.classId,
          changeType: "DELETE",
          requestedBy,
          status: "PENDING",
          oldValue,
        },
      })

      return NextResponse.json({
        success: true,
        message: "Ders silme talebi oluşturuldu. Onay bekliyor.",
        approval,
        pendingApproval: true,
      })
    }

    // Direkt silme (Yönetici/Müdür için)
    await prisma.schedule.delete({
      where: { id: scheduleId },
    })

    return NextResponse.json({
      success: true,
      message: "Ders başarıyla silindi",
    })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json(
      { error: "Ders silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

