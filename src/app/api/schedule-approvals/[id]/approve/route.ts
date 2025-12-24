import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/schedule-approvals/[id]/approve
 * Ders programı değişikliğini onaylar
 * 
 * Body:
 * - approvedBy: string (Müdür/Yönetici Staff ID)
 * - notes?: string
 * 
 * Yetki: Sadece Müdür ve Yönetici
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: approvalId } = params
    const body = await request.json()
    const { approvedBy, notes } = body

    if (!approvedBy) {
      return NextResponse.json(
        { error: "approvedBy zorunludur" },
        { status: 400 }
      )
    }

    // Onay talebi kontrolü
    const approval = await prisma.scheduleApproval.findUnique({
      where: { id: approvalId },
    })

    if (!approval) {
      return NextResponse.json(
        { error: "Onay talebi bulunamadı" },
        { status: 404 }
      )
    }

    if (approval.status !== "PENDING") {
      return NextResponse.json(
        { error: "Bu talep zaten işlenmiş" },
        { status: 400 }
      )
    }

    // Değişiklik tipine göre işlem yap
    let result: { id: string } | undefined

    if (approval.changeType === "CREATE") {
      // Yeni ders oluştur
      const newScheduleData = JSON.parse(approval.newValue!)
      result = await prisma.schedule.create({
        data: {
          ...newScheduleData,
          isActive: true,
        },
      })
    } else if (approval.changeType === "UPDATE") {
      // Mevcut dersi güncelle
      const updatedScheduleData = JSON.parse(approval.newValue!)
      result = await prisma.schedule.update({
        where: { id: approval.scheduleId! },
        data: {
          subjectName: updatedScheduleData.subjectName,
          teacherId: updatedScheduleData.teacherId,
          dayOfWeek: updatedScheduleData.dayOfWeek,
          startTime: updatedScheduleData.startTime,
          endTime: updatedScheduleData.endTime,
          room: updatedScheduleData.room,
          notes: updatedScheduleData.notes,
        },
      })
    } else if (approval.changeType === "DELETE") {
      // Dersi sil
      result = await prisma.schedule.delete({
        where: { id: approval.scheduleId! },
      })
    }

    // Onay durumunu güncelle
    const updatedApproval = await prisma.scheduleApproval.update({
      where: { id: approvalId },
      data: {
        status: "APPROVED",
        approvedBy,
        approvedAt: new Date(),
        notes,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Değişiklik başarıyla onaylandı",
      approval: updatedApproval,
      result,
    })
  } catch (error) {
    console.error("Error approving schedule change:", error)
    return NextResponse.json(
      { error: "Onaylama sırasında bir hata oluştu" },
      { status: 500 }
    )
  }
}

