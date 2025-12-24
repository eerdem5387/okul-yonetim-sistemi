import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const teklifGorusmesi = await prisma.teklifGorusmesi.findUnique({
      where: { id },
      include: {
        kayitlar: {
          orderBy: { gorusmeTarihi: 'desc' }
        }
      }
    })

    if (!teklifGorusmesi) {
      return NextResponse.json(
        { error: "Teklif görüşmesi bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ teklifGorusmesi })
  } catch (error) {
    console.error("Error fetching teklif görüşmesi:", error)
    return NextResponse.json(
      { error: "Teklif görüşmesi getirilirken bir hata oluştu" },
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
      veliEmail,
      veliMeslek,
      veliAdres,
      teklifEdilenFiyat,
      okulFiyati,
      // Yeni görüşme kaydı bilgileri
      gorusmeyiYapan,
      durum,
      durumNotu,
      genelNot,
      createdBy, // ✅ Otomatik kullanıcı adı için
    } = body

    // Mevcut teklif görüşmesini kontrol et
    const existingTeklif = await prisma.teklifGorusmesi.findUnique({
      where: { id }
    })

    if (!existingTeklif) {
      return NextResponse.json(
        { error: "Teklif görüşmesi bulunamadı" },
        { status: 404 }
      )
    }

    // Temel bilgileri güncelle
    await prisma.teklifGorusmesi.update({
      where: { id },
      data: {
        ogrenciAdSoyad: ogrenciAdSoyad || existingTeklif.ogrenciAdSoyad,
        okul: okul || existingTeklif.okul,
        sinif: sinif || existingTeklif.sinif,
        veliAdSoyad: veliAdSoyad || existingTeklif.veliAdSoyad,
        veliTelefon: veliTelefon || existingTeklif.veliTelefon,
        veliEmail: veliEmail !== undefined ? veliEmail : existingTeklif.veliEmail,
        veliMeslek: veliMeslek !== undefined ? veliMeslek : existingTeklif.veliMeslek,
        veliAdres: veliAdres !== undefined ? veliAdres : existingTeklif.veliAdres,
        teklifEdilenFiyat: teklifEdilenFiyat !== undefined 
          ? parseFloat(teklifEdilenFiyat) 
          : existingTeklif.teklifEdilenFiyat,
        okulFiyati: okulFiyati !== undefined 
          ? parseFloat(okulFiyati) 
          : existingTeklif.okulFiyati,
      }
    })

    // Eğer yeni görüşme kaydı bilgileri varsa, yeni kayıt oluştur
    if (durum) {
      if (!["OLUMLU", "OLUMSUZ", "BELIRSIZ"].includes(durum)) {
        return NextResponse.json(
          { error: "Geçersiz görüşme durumu" },
          { status: 400 }
        )
      }

      // ✅ Görüşmeyi yapan otomatik olarak createdBy'den alınır
      const gorusmeyiYapanFinal = gorusmeyiYapan || createdBy || "Sistem"

      await prisma.teklifGorusmeKaydi.create({
        data: {
          teklifGorusmesiId: id,
          gorusmeyiYapan: gorusmeyiYapanFinal,
          durum: durum as "OLUMLU" | "OLUMSUZ" | "BELIRSIZ",
          durumNotu: durumNotu || null,
          genelNot: genelNot || null,
        }
      })
    }

    // Güncellenmiş teklif görüşmesini kayıtlarıyla birlikte getir
    const teklifGorusmesi = await prisma.teklifGorusmesi.findUnique({
      where: { id },
      include: {
        kayitlar: {
          orderBy: { gorusmeTarihi: 'desc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      teklifGorusmesi,
    })
  } catch (error) {
    console.error("Error updating teklif görüşmesi:", error)
    return NextResponse.json(
      { error: "Teklif görüşmesi güncellenirken bir hata oluştu" },
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

    // Önce kayıtları sil (cascade olacak ama emin olmak için)
    await prisma.teklifGorusmeKaydi.deleteMany({
      where: { teklifGorusmesiId: id }
    })

    // Sonra teklif görüşmesini sil
    await prisma.teklifGorusmesi.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: "Teklif görüşmesi başarıyla silindi"
    })
  } catch (error) {
    console.error("Error deleting teklif görüşmesi:", error)
    
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string }
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: "Teklif görüşmesi bulunamadı" },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: "Teklif görüşmesi silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

