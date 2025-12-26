import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sinif = searchParams.get('sinif') || ''
    const sube = searchParams.get('sube') || ''
    const okul = searchParams.get('okul') || ''
    const babaMeslek = searchParams.get('babaMeslek') || ''
    const anneMeslek = searchParams.get('anneMeslek') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const contactStatus = searchParams.get('contactStatus') || ''
    
    const skip = (page - 1) * limit

    // Arama ve filtreleme koşulları
    const whereConditions: Array<Record<string, unknown>> = []
    
    // Arama filtresi - Sadece öğrenci adı, soyadı ve TC ile arama
    if (search) {
      whereConditions.push({
        OR: [
          { ogrenciAdSoyad: { contains: search, mode: 'insensitive' as const } },
          { ogrenciTc: { contains: search } },
        ]
      })
    }
    
    // Sınıf filtresi
    if (sinif) {
      whereConditions.push({ ogrenciSinifi: { equals: sinif, mode: 'insensitive' as const } })
    }
    
    // Şube filtresi
    if (sube) {
      whereConditions.push({ ogrenciSube: { equals: sube, mode: 'insensitive' as const } })
    }
    
    // Okul filtresi
    if (okul) {
      whereConditions.push({ okul: { contains: okul, mode: 'insensitive' as const } })
    }
    
    // Baba meslek filtresi
    if (babaMeslek) {
      whereConditions.push({ babaMeslek: { contains: babaMeslek, mode: 'insensitive' as const } })
    }
    
    // Anne meslek filtresi
    if (anneMeslek) {
      whereConditions.push({ anneMeslek: { contains: anneMeslek, mode: 'insensitive' as const } })
    }

    // İletişim durumu filtresi
    if (contactStatus === 'ILETISIME_GECILDI') {
      whereConditions.push({ contactStatus: 'ILETISIME_GECILDI' })
    } else if (contactStatus === 'ILETISIME_GECILMEDI_NOT_CONTACTED') {
      // İletişime Geçilmedi - Henüz işlem yapılmamış (sarı)
      whereConditions.push({ 
        contactStatus: 'ILETISIME_GECILMEDI',
        lastContactedAt: null
      })
    } else if (contactStatus === 'ILETISIME_GECILMEDI_FAILED') {
      // İletişime Geçilemedi - İşlem yapılmış ama başarısız (kırmızı)
      whereConditions.push({ 
        contactStatus: 'ILETISIME_GECILMEDI',
        lastContactedAt: { not: null }
      })
    } else if (contactStatus === 'ILETISIME_GECILMEDI') {
      // Eski filtreleme için geriye dönük uyumluluk - tüm ILETISIME_GECILMEDI'leri getir
      whereConditions.push({ contactStatus: 'ILETISIME_GECILMEDI' })
    }
    
    // Tarih filtresi
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999) // Günün sonuna kadar
        dateFilter.lte = endDateTime
      }
      whereConditions.push({ createdAt: dateFilter })
    }
    
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {}

    // Toplam kayıt sayısı
    const total = await prisma.basvuru.count({ where })

    // Başvuruları çek
    const basvurular = await prisma.basvuru.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit
    })

    return NextResponse.json({
      basvurular,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching basvurular:", error)
    return NextResponse.json({ error: "Failed to fetch basvurular" }, { status: 500 })
  }
}

