import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { contactStatus, contactNote, lastContactedBy } = body

    if (
      contactStatus &&
      contactStatus !== "ILETISIME_GECILDI" &&
      contactStatus !== "ILETISIME_GECILMEDI"
    ) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 })
    }

    const basvuru = await prisma.yazOkuluBasvuru.update({
      where: { id },
      data: {
        ...(contactStatus ? { contactStatus } : {}),
        ...(contactNote !== undefined ? { contactNote } : {}),
        lastContactedAt: new Date(),
        ...(lastContactedBy ? { lastContactedBy } : {}),
      },
    })

    return NextResponse.json({ success: true, basvuru })
  } catch (error) {
    console.error("[Yaz Okulu] PATCH hatası:", error)
    return NextResponse.json(
      { error: "Güncelleme başarısız" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.yazOkuluBasvuru.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Başvuru silindi",
    })
  } catch (error) {
    console.error("[Yaz Okulu] DELETE hatası:", error)

    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2025") {
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
