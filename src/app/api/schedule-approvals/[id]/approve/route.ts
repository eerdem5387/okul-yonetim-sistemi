import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncScheduleToNeredeyiz } from "@/lib/neredeyiz/sync"

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
      const newScheduleData = JSON.parse(approval.newValue!)
      const { subjectId } = await syncScheduleToNeredeyiz({
        classId: newScheduleData.classId,
        subjectName: newScheduleData.subjectName,
        teacherId: newScheduleData.teacherId,
      })
      result = await prisma.schedule.create({
        data: {
          classId: newScheduleData.classId,
          subjectName: String(newScheduleData.subjectName).trim(),
          subjectId,
          teacherId: newScheduleData.teacherId,
          dayOfWeek: newScheduleData.dayOfWeek,
          startTime: newScheduleData.startTime,
          endTime: newScheduleData.endTime,
          room: newScheduleData.room ?? null,
          notes: newScheduleData.notes ?? null,
          isActive: true,
        },
      })
    } else if (approval.changeType === "UPDATE") {
      const updatedScheduleData = JSON.parse(approval.newValue!)
      const existing = await prisma.schedule.findUnique({
        where: { id: approval.scheduleId! },
      })
      if (!existing) {
        return NextResponse.json({ error: "Ders programı satırı bulunamadı" }, { status: 404 })
      }
      const { subjectId } = await syncScheduleToNeredeyiz({
        classId: existing.classId,
        subjectName: updatedScheduleData.subjectName ?? existing.subjectName,
        teacherId: updatedScheduleData.teacherId ?? existing.teacherId,
      })
      result = await prisma.schedule.update({
        where: { id: approval.scheduleId! },
        data: {
          subjectName: updatedScheduleData.subjectName,
          subjectId,
          teacherId: updatedScheduleData.teacherId,
          dayOfWeek: updatedScheduleData.dayOfWeek,
          startTime: updatedScheduleData.startTime,
          endTime: updatedScheduleData.endTime,
          room: updatedScheduleData.room,
          notes: updatedScheduleData.notes,
        },
      })
    } else if (approval.changeType === "DELETE") {
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

