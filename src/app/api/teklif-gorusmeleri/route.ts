import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sinif = searchParams.get('sinif') || ''
    const okul = searchParams.get('okul') || ''
    const durum = searchParams.get('durum') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    
    const skip = (page - 1) * limit

    // Arama ve filtreleme koşulları
    const whereConditions: Array<Record<string, unknown>> = []
    
    // Arama filtresi
    if (search) {
      whereConditions.push({
        OR: [
          { ogrenciAdSoyad: { contains: search, mode: 'insensitive' as const } },
          { okul: { contains: search, mode: 'insensitive' as const } },
          { veliAdSoyad: { contains: search, mode: 'insensitive' as const } },
          { veliTelefon: { contains: search } },
        ]
      })
    }
    
    // Sınıf filtresi
    if (sinif) {
      whereConditions.push({ sinif: { equals: sinif, mode: 'insensitive' as const } })
    }
    
    // Okul filtresi
    if (okul) {
      whereConditions.push({ okul: { contains: okul, mode: 'insensitive' as const } })
    }
    
    // Tarih filtresi
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      whereConditions.push({ createdAt: dateFilter })
    }

    // Durum filtresi (en son kayıt durumuna göre)
    let durumFilter: Record<string, unknown> | null = null
    if (durum) {
      durumFilter = {
        kayitlar: {
          some: {
            durum: durum as "OLUMLU" | "OLUMSUZ" | "BELIRSIZ"
          }
        }
      }
    }

    const where = whereConditions.length > 0 || durumFilter
      ? {
          AND: [
            ...whereConditions,
            ...(durumFilter ? [durumFilter] : [])
          ]
        }
      : {}

    // Toplam kayıt sayısı
    const total = await prisma.teklifGorusmesi.count({ where })

    // Teklif görüşmelerini getir (en son kayıt + toplam görüşme sayısı)
    const teklifGorusmeleri = await prisma.teklifGorusmesi.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        kayitlar: {
          orderBy: { gorusmeTarihi: 'desc' },
          take: 1, // En son kayıt
        },
        _count: { select: { kayitlar: true } }
      }
    })

    return NextResponse.json({
      teklifGorusmeleri,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error("Error fetching teklif görüşmeleri:", error)
    return NextResponse.json(
      { error: "Teklif görüşmeleri getirilirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
      sonGecerlilikTarihi,
      gorusmeTarihi,
      gorusmeyiYapan,
      durum,
      durumNotu,
      genelNot,
      createdBy,
    } = body

    // Validasyon
    if (!ogrenciAdSoyad || !okul || !sinif || !veliAdSoyad || !veliTelefon || 
        teklifEdilenFiyat === undefined || okulFiyati === undefined || 
        !durum || !gorusmeTarihi) {
      return NextResponse.json(
        { error: "Tüm zorunlu alanlar doldurulmalıdır (Görüşme tarihi zorunludur)" },
        { status: 400 }
      )
    }
    
    // ✅ Görüşmeyi yapan otomatik olarak createdBy'den alınır
    const gorusmeyiYapanFinal = gorusmeyiYapan || createdBy || "Sistem"

    if (!["OLUMLU", "OLUMSUZ", "BELIRSIZ"].includes(durum)) {
      return NextResponse.json(
        { error: "Geçersiz görüşme durumu" },
        { status: 400 }
      )
    }

    // Tarih validasyonu
    const gorusmeTarihiDate = new Date(gorusmeTarihi)
    if (isNaN(gorusmeTarihiDate.getTime())) {
      return NextResponse.json(
        { error: "Geçersiz görüşme tarihi formatı" },
        { status: 400 }
      )
    }

    let sonGecerlilikTarihiDate: Date | null = null
    if (sonGecerlilikTarihi) {
      sonGecerlilikTarihiDate = new Date(sonGecerlilikTarihi)
      if (isNaN(sonGecerlilikTarihiDate.getTime())) {
        return NextResponse.json(
          { error: "Geçersiz son geçerlilik tarihi formatı" },
          { status: 400 }
        )
      }
    }

    // Teklif görüşmesi ve ilk kaydı oluştur
    const teklifGorusmesi = await prisma.teklifGorusmesi.create({
      data: {
        ogrenciAdSoyad,
        okul,
        sinif,
        veliAdSoyad,
        veliTelefon,
        veliEmail: veliEmail || null,
        veliMeslek: veliMeslek || null,
        veliAdres: veliAdres || null,
        teklifEdilenFiyat: parseFloat(teklifEdilenFiyat),
        okulFiyati: parseFloat(okulFiyati),
        sonGecerlilikTarihi: sonGecerlilikTarihiDate,
        createdBy: createdBy || null,
        kayitlar: {
          create: {
            gorusmeTarihi: gorusmeTarihiDate,
            gorusmeyiYapan: gorusmeyiYapanFinal,
            durum: durum as "OLUMLU" | "OLUMSUZ" | "BELIRSIZ",
            durumNotu: durumNotu || null,
            genelNot: genelNot || null,
          }
        }
      },
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
    console.error("Error creating teklif görüşmesi:", error)
    return NextResponse.json(
      { error: "Teklif görüşmesi oluşturulurken bir hata oluştu" },
      { status: 500 }
    )
  }
}

