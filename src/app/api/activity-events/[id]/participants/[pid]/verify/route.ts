import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> }
) {
  const { hasAccess, staffId } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { id: activityId, pid } = await context.params
    const body = await request.json()
    const { approve } = body // true = onayla, false = onayı geri al

    const participant = await prisma.activityParticipant.findFirst({
      where: { id: pid, activityId },
    })

    if (!participant) {
      return NextResponse.json({ error: "Katılımcı bulunamadı" }, { status: 404 })
    }

    if (approve) {
      if (participant.verificationStatus !== "ONAY_BEKLIYOR") {
        return NextResponse.json(
          { error: "Sadece 'Onay Bekliyor' durumundaki katılımcılar onaylanabilir" },
          { status: 400 }
        )
      }
      const staff = staffId
        ? await prisma.staff.findUnique({
            where: { id: staffId },
            select: { firstName: true, lastName: true },
          })
        : null

      const updated = await prisma.activityParticipant.update({
        where: { id: pid },
        data: {
          verificationStatus: "ONAYLANDI",
          isVerified: true,
          verifiedBy: staff ? `${staff.firstName} ${staff.lastName}` : staffId,
          verifiedAt: new Date(),
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, grade: true } },
        },
      })
      return NextResponse.json(updated)
    } else {
      if (participant.verificationStatus !== "ONAYLANDI") {
        return NextResponse.json(
          { error: "Sadece onaylanmış katılımcının onayı kaldırılabilir" },
          { status: 400 }
        )
      }
      const updated = await prisma.activityParticipant.update({
        where: { id: pid },
        data: {
          verificationStatus: "ONAY_BEKLIYOR",
          isVerified: false,
          verifiedBy: null,
          verifiedAt: null,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, grade: true } },
        },
      })
      return NextResponse.json(updated)
    }
  } catch (error) {
    console.error("PUT /verify error:", error)
    return NextResponse.json({ error: "Onay işlemi sırasında hata oluştu" }, { status: 500 })
  }
}
