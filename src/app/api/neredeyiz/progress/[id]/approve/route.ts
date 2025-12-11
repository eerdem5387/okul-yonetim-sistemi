import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProgressStatus } from "@prisma/client"

// POST - Progress kaydını onayla
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { approvedBy } = body

    if (!approvedBy) {
      return NextResponse.json(
        { error: "Onaylayan kullanıcı ID'si zorunludur" },
        { status: 400 }
      )
    }

    // Progress kaydını bul
    const progress = await prisma.progress.findUnique({
      where: { id: params.id },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "İlerleme kaydı bulunamadı" },
        { status: 404 }
      )
    }

    if (progress.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Bu kayıt onay bekliyor durumunda değil" },
        { status: 400 }
      )
    }

    // Onayla
    const updatedProgress = await prisma.progress.update({
      where: { id: params.id },
      data: {
        status: "TAMAMLANDI",
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        topic: {
          include: {
            unit: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedProgress)
  } catch (error) {
    console.error("Error approving progress:", error)
    return NextResponse.json(
      { error: "Onay işlemi sırasında hata oluştu" },
      { status: 500 }
    )
  }
}

