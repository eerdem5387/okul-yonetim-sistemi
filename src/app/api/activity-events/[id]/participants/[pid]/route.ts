import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"
import { ActivityVerificationStatus, LanguageLevel } from "@prisma/client"

const VALID_TRANSITIONS: Record<ActivityVerificationStatus, ActivityVerificationStatus[]> = {
  IMZA_SURECINDE: ["ONAY_BEKLIYOR"],
  ONAY_BEKLIYOR: ["ONAYLANDI", "IMZA_SURECINDE"],
  ONAYLANDI: ["ONAY_BEKLIYOR"],
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> }
) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { id: activityId, pid } = await context.params
    const body = await request.json()
    const {
      score,
      languageLevel,
      participationPhotoUrl,
      extraDocumentUrl,
      artworkDescription,
      tournamentPlacement,
      projectRole,
      verificationStatus: newStatus,
      signedDocumentUrls,
      signedCurriculumUrls,
      verifiedBy,
    } = body

    const participant = await prisma.activityParticipant.findFirst({
      where: { id: pid, activityId },
    })

    if (!participant) {
      return NextResponse.json({ error: "Katılımcı bulunamadı" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (score !== undefined) updateData.score = score != null ? parseInt(String(score)) : null
    if (languageLevel !== undefined) updateData.languageLevel = languageLevel ? (languageLevel as LanguageLevel) : null
    if (participationPhotoUrl !== undefined) updateData.participationPhotoUrl = participationPhotoUrl || null
    if (extraDocumentUrl !== undefined) updateData.extraDocumentUrl = extraDocumentUrl || null
    if (artworkDescription !== undefined) {
      updateData.artworkDescription = artworkDescription?.trim() || null
    }
    if (tournamentPlacement !== undefined) {
      updateData.tournamentPlacement = tournamentPlacement?.trim() || null
    }
    if (projectRole !== undefined) {
      updateData.projectRole = projectRole?.trim() || null
    }

    if (newStatus !== undefined) {
      const currentStatus = participant.verificationStatus
      const allowed = VALID_TRANSITIONS[currentStatus]

      if (!allowed?.includes(newStatus as ActivityVerificationStatus)) {
        return NextResponse.json(
          { error: `Geçersiz durum geçişi: ${currentStatus} → ${newStatus}` },
          { status: 400 }
        )
      }

      if (newStatus === "ONAY_BEKLIYOR") {
        const urls = Array.isArray(signedDocumentUrls)
          ? signedDocumentUrls.filter((u: unknown) => typeof u === "string" && u.trim())
          : []
        if (!urls.length) {
          return NextResponse.json(
            { error: "Onay bekliyor durumu için en az bir imzalı belge gereklidir" },
            { status: 400 }
          )
        }
        updateData.signedDocumentUrls = urls
      }

      if (newStatus === "ONAYLANDI") {
        updateData.isVerified = true
        updateData.verifiedBy = verifiedBy || null
        updateData.verifiedAt = new Date()
      } else if (newStatus === "IMZA_SURECINDE") {
        updateData.isVerified = false
        updateData.verifiedBy = null
        updateData.verifiedAt = null
        updateData.signedDocumentUrls = []
      } else {
        updateData.isVerified = false
      }

      updateData.verificationStatus = newStatus
    }

    if (signedCurriculumUrls !== undefined) {
      updateData.signedCurriculumUrls = Array.isArray(signedCurriculumUrls)
        ? signedCurriculumUrls.filter((u: unknown) => typeof u === "string" && u.trim())
        : []
    }

    const updated = await prisma.activityParticipant.update({
      where: { id: pid },
      data: updateData,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, grade: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PUT /api/activity-events/[id]/participants/[pid] error:", error)
    return NextResponse.json({ error: "Katılımcı güncellenirken hata oluştu" }, { status: 500 })
  }
}
