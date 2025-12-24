import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

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

