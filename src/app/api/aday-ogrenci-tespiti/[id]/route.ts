import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const adayOgrenciTespiti = await prisma.adayOgrenciTespiti.findUnique({
      where: { id },
      include: {
        kayitlar: {
          orderBy: { gorusmeTarihi: "desc" },
        },
      },
    })

    if (!adayOgrenciTespiti) {
      return NextResponse.json(
        { error: "Aday öğrenci tespiti bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ adayOgrenciTespiti })
  } catch (error) {
    console.error("Error fetching aday öğrenci tespiti:", error)
    return NextResponse.json(
      { error: "Aday öğrenci tespiti getirilirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      ogrenciAdSoyad,
      okul,
      sinif,
      veliAdSoyad,
      veliTelefon,
      veliMeslek,
      referansAdSoyad,
      referansTelefon,
      referansKanali,
      referansNot,
      gorusmeTarihi,
      gorusmeyiYapan,
      durum,
      durumNotu,
      genelNot,
      createdBy,
      sonlandir,
    } = body

    const existing = await prisma.adayOgrenciTespiti.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Aday öğrenci tespiti bulunamadı" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {
      ogrenciAdSoyad: ogrenciAdSoyad || existing.ogrenciAdSoyad,
      okul: okul || existing.okul,
      sinif: sinif || existing.sinif,
      veliAdSoyad: veliAdSoyad || existing.veliAdSoyad,
      veliTelefon: veliTelefon || existing.veliTelefon,
      veliMeslek: veliMeslek !== undefined ? veliMeslek : existing.veliMeslek,
      referansAdSoyad: referansAdSoyad || existing.referansAdSoyad,
      referansTelefon: referansTelefon || existing.referansTelefon,
      referansKanali: referansKanali || existing.referansKanali,
      referansNot: referansNot !== undefined ? referansNot : existing.referansNot,
    }

    if (sonlandir === true) {
      updateData.sonlandirildi = true
    }

    await prisma.adayOgrenciTespiti.update({
      where: { id },
      data: updateData,
    })

    if (durum) {
      if (!["OLUMLU", "OLUMSUZ", "BELIRSIZ"].includes(durum)) {
        return NextResponse.json({ error: "Geçersiz görüşme durumu" }, { status: 400 })
      }

      if (!gorusmeTarihi) {
        return NextResponse.json({ error: "Görüşme tarihi zorunludur" }, { status: 400 })
      }

      const gorusmeTarihiDate = new Date(gorusmeTarihi)
      if (isNaN(gorusmeTarihiDate.getTime())) {
        return NextResponse.json(
          { error: "Geçersiz görüşme tarihi formatı" },
          { status: 400 }
        )
      }

      const gorusmeyiYapanFinal = gorusmeyiYapan || createdBy || "Sistem"

      await prisma.adayOgrenciTespitKaydi.create({
        data: {
          adayOgrenciTespitiId: id,
          gorusmeTarihi: gorusmeTarihiDate,
          gorusmeyiYapan: gorusmeyiYapanFinal,
          durum: durum as "OLUMLU" | "OLUMSUZ" | "BELIRSIZ",
          durumNotu: durumNotu || null,
          genelNot: genelNot || null,
        },
      })
    }

    const adayOgrenciTespiti = await prisma.adayOgrenciTespiti.findUnique({
      where: { id },
      include: {
        kayitlar: {
          orderBy: { gorusmeTarihi: "desc" },
        },
      },
    })

    return NextResponse.json({
      success: true,
      adayOgrenciTespiti,
    })
  } catch (error) {
    console.error("Error updating aday öğrenci tespiti:", error)
    return NextResponse.json(
      { error: "Aday öğrenci tespiti güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.adayOgrenciTespitKaydi.deleteMany({
      where: { adayOgrenciTespitiId: id },
    })

    await prisma.adayOgrenciTespiti.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Aday öğrenci tespiti başarıyla silindi",
    })
  } catch (error) {
    console.error("Error deleting aday öğrenci tespiti:", error)

    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code?: string }
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "Aday öğrenci tespiti bulunamadı" },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: "Aday öğrenci tespiti silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}
