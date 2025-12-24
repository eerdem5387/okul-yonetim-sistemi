import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/schedule-approvals/[id]/reject
 * Ders programı değişikliğini reddeder
 * 
 * Body:
 * - approvedBy: string (Müdür/Yönetici Staff ID - isim yanlış ama uyumluluk için aynı)
 * - notes?: string (Red sebebi)
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
        { error: "approvedBy (red eden kişi) zorunludur" },
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

    // Onay durumunu güncelle
    const updatedApproval = await prisma.scheduleApproval.update({
      where: { id: approvalId },
      data: {
        status: "REJECTED",
        approvedBy, // Red eden kişi
        rejectedAt: new Date(),
        notes,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Değişiklik reddedildi",
      approval: updatedApproval,
    })
  } catch (error) {
    console.error("Error rejecting schedule change:", error)
    return NextResponse.json(
      { error: "Reddetme sırasında bir hata oluştu" },
      { status: 500 }
    )
  }
}

