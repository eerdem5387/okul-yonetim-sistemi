import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ActivityType, Prisma } from "@prisma/client"
import { checkIbAccess } from "@/lib/access-control"

// GET - Tek faaliyet detayı
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Yetki kontrolü
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }

  try {
    const params = await context.params
    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            tcNumber: true,
          },
        },
      },
    })

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error("Error fetching activity:", error)
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 })
  }
}

// PUT - Faaliyet güncelle (activityDate hariç - değiştirilemez)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Yetki kontrolü
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }

  try {
    const params = await context.params
    const body = await request.json()
    const {
      type,
      title,
      description,
      location,
      organizer,
      duration,
      participants,
      outcome,
      evidence,
      notes,
      isVerified,
      verifiedBy,
      verifiedAt,
    } = body

    // Mevcut faaliyeti kontrol et
    const existingActivity = await prisma.activity.findUnique({
      where: { id: params.id },
    })

    if (!existingActivity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    // activityDate asla güncellenemez - body'den gelen activityDate'ı yok say
    const updateData: Prisma.ActivityUpdateInput = {
      type: type as ActivityType,
      title,
      description: description ?? null,
      location: location ?? null,
      organizer: organizer ?? null,
      duration: duration ? parseInt(duration) : null,
      participants: participants ? parseInt(participants) : null,
      outcome: outcome ?? null,
      evidence,
      notes: notes ?? null,
    }

    // Doğrulama bilgileri
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified
      if (isVerified) {
        updateData.verifiedBy = verifiedBy ?? null
        updateData.verifiedAt = verifiedAt ? new Date(verifiedAt) : new Date()
      } else {
        updateData.verifiedBy = null
        updateData.verifiedAt = null
      }
    }

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
          },
        },
      },
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error("Error updating activity:", error)
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 })
  }
}

// DELETE - Faaliyet sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Yetki kontrolü
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }

  try {
    const params = await context.params
    await prisma.activity.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting activity:", error)
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 })
  }
}

