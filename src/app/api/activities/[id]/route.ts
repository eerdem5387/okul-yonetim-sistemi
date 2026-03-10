import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ActivityType, ActivityVerificationStatus, Prisma } from "@prisma/client"
import { checkIbAccess } from "@/lib/access-control"

const VALID_STATUS_TRANSITIONS: Record<ActivityVerificationStatus, ActivityVerificationStatus[]> = {
  IMZA_SURECINDE: ["ONAY_BEKLIYOR"], // Sadece imzalı belge yüklendiğinde
  ONAY_BEKLIYOR: ["ONAYLANDI", "IMZA_SURECINDE"], // Onayla veya geri al
  ONAYLANDI: ["ONAY_BEKLIYOR"], // Onayı kaldır (opsiyonel)
}

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
      certificateData,
      category,
      subtype,
      participationPhotoUrl,
      verificationStatus: newStatus,
      signedDocumentUrls,
    } = body

    // Mevcut faaliyeti kontrol et
    const existingActivity = await prisma.activity.findUnique({
      where: { id: params.id },
    })

    if (!existingActivity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    const currentStatus = (existingActivity as { verificationStatus?: ActivityVerificationStatus }).verificationStatus ?? "IMZA_SURECINDE"

    // activityDate asla güncellenemez - body'den gelen activityDate'ı yok say
    const updateData: Prisma.ActivityUpdateInput = {
      ...(type !== undefined && { type: type as ActivityType }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description: description ?? null }),
      ...(location !== undefined && { location: location ?? null }),
      ...(organizer !== undefined && { organizer: organizer ?? null }),
      ...(duration !== undefined && { duration: duration ? parseInt(String(duration)) : null }),
      ...(participants !== undefined && { participants: participants ? parseInt(String(participants)) : null }),
      ...(outcome !== undefined && { outcome: outcome ?? null }),
      ...(evidence !== undefined && { evidence }),
      ...(notes !== undefined && { notes: notes ?? null }),
      ...(certificateData !== undefined && { certificateData: certificateData as object }),
      ...(category !== undefined && { category }),
      ...(subtype !== undefined && { subtype }),
      ...(participationPhotoUrl !== undefined && { participationPhotoUrl }),
    }

    // Doğrulama protokolü: verificationStatus ve signedDocumentUrls
    if (newStatus !== undefined) {
      const allowed = VALID_STATUS_TRANSITIONS[currentStatus as ActivityVerificationStatus]
      if (!allowed?.includes(newStatus as ActivityVerificationStatus)) {
        return NextResponse.json(
          { error: `Geçiş izni yok: ${currentStatus} → ${newStatus}` },
          { status: 400 }
        )
      }
      if (newStatus === "ONAY_BEKLIYOR") {
        const urls = Array.isArray(signedDocumentUrls) ? signedDocumentUrls.filter((u): u is string => typeof u === "string" && u.length > 0)
          : signedDocumentUrls
        if (!urls?.length) {
          return NextResponse.json(
            { error: "Onay bekliyor durumuna geçmek için en az bir imzalı belge URL'si gerekir" },
            { status: 400 }
          )
        }
        updateData.signedDocumentUrls = urls
      }
      if (newStatus === "ONAYLANDI") {
        updateData.isVerified = true
        updateData.verifiedBy = verifiedBy ?? null
        updateData.verifiedAt = verifiedAt ? new Date(verifiedAt) : new Date()
      } else {
        updateData.isVerified = false
        if (newStatus === "IMZA_SURECINDE") {
          updateData.verifiedBy = null
          updateData.verifiedAt = null
          updateData.signedDocumentUrls = []
        }
      }
      updateData.verificationStatus = newStatus as ActivityVerificationStatus
    }

    // Eski isVerified güncellemesi (sadece verificationStatus gönderilmediyse)
    if (newStatus === undefined && isVerified !== undefined) {
      updateData.isVerified = isVerified
      if (isVerified) {
        updateData.verifiedBy = verifiedBy ?? null
        updateData.verifiedAt = verifiedAt ? new Date(verifiedAt) : new Date()
        updateData.verificationStatus = "ONAYLANDI"
      } else {
        updateData.verifiedBy = null
        updateData.verifiedAt = null
        updateData.verificationStatus = "IMZA_SURECINDE"
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

