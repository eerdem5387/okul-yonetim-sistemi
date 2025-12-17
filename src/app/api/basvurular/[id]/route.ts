import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Başvuruyu sil
    await prisma.basvuru.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: "Başvuru başarıyla silindi"
    })
  } catch (error) {
    console.error("Error deleting basvuru:", error)
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: "Başvuru bulunamadı" },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Başvuru silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const status = body.status as string | undefined
    const note = body.note as string | undefined
    const user = body.user as string | undefined
    const contactedBy = body.contactedBy as string | undefined

    if (status !== 'ILETISIME_GECILDI' && status !== 'ILETISIME_GECILMEDI') {
      return NextResponse.json(
        { error: "Geçersiz iletişim durumu" },
        { status: 400 }
      )
    }

    const updated = await prisma.basvuru.update({
      where: { id },
      data: {
        contactStatus: status,
        contactNote: note ?? null,
        lastContactedAt: new Date(),
        lastContactedBy: contactedBy || user || null,
      }
    })

    return NextResponse.json({
      success: true,
      basvuru: updated,
    })
  } catch (error) {
    console.error("Error updating basvuru contact status:", error)

    if (error && typeof error === 'object' && 'code' in error) {
      if ((error as any).code === 'P2025') {
        return NextResponse.json(
          { error: "Başvuru bulunamadı" },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: "İletişim durumu güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

