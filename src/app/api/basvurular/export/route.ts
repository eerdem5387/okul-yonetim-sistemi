import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sinif = searchParams.get('sinif') || ''
    const sube = searchParams.get('sube') || ''
    const okul = searchParams.get('okul') || ''
    const babaMeslek = searchParams.get('babaMeslek') || ''
    const anneMeslek = searchParams.get('anneMeslek') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const contactStatus = searchParams.get('contactStatus') || ''

    // Filtreleme koşulları (API ile aynı)
    const whereConditions: Array<Record<string, unknown>> = []
    
    if (search) {
      whereConditions.push({
        OR: [
          { ogrenciAdSoyad: { contains: search, mode: 'insensitive' as const } },
          { ogrenciTc: { contains: search } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { okul: { contains: search, mode: 'insensitive' as const } },
          { babaAdSoyad: { contains: search, mode: 'insensitive' as const } },
          { anneAdSoyad: { contains: search, mode: 'insensitive' as const } },
        ]
      })
    }
    
    if (sinif) {
      whereConditions.push({ ogrenciSinifi: { equals: sinif, mode: 'insensitive' as const } })
    }
    
    if (sube) {
      whereConditions.push({ ogrenciSube: { equals: sube, mode: 'insensitive' as const } })
    }
    
    if (okul) {
      whereConditions.push({ okul: { contains: okul, mode: 'insensitive' as const } })
    }
    
    if (babaMeslek) {
      whereConditions.push({ babaMeslek: { contains: babaMeslek, mode: 'insensitive' as const } })
    }
    
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
        endDateTime.setHours(23, 59, 59, 999)
        dateFilter.lte = endDateTime
      }
      whereConditions.push({ createdAt: dateFilter })
    }
    
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {}

    // Tüm başvuruları çek (pagination yok, hepsi)
    const basvurular = await prisma.basvuru.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      }
    })

    // Excel için veri hazırlama
    const XLSX = await import("xlsx")
    
    const rows = basvurular.map((basvuru, index) => ({
      "Sıra No": index + 1,
      "Öğrenci Ad Soyad": basvuru.ogrenciAdSoyad,
      "TC Kimlik No": basvuru.ogrenciTc,
      "Okul": basvuru.okul,
      "Sınıf": basvuru.ogrenciSinifi,
      "Şube": basvuru.ogrenciSube,
      "Sınav Günü": basvuru.sinavGunu || "Belirtilmedi",
      "Baba Ad Soyad": basvuru.babaAdSoyad,
      "Baba Meslek": basvuru.babaMeslek,
      "Baba İş Adresi": basvuru.babaIsAdresi || "",
      "Baba Cep Telefonu": basvuru.babaCepTel,
      "Anne Ad Soyad": basvuru.anneAdSoyad,
      "Anne Meslek": basvuru.anneMeslek,
      "Anne İş Adresi": basvuru.anneIsAdresi || "",
      "Anne Cep Telefonu": basvuru.anneCepTel,
      "E-posta": basvuru.email,
      "İletişim Durumu": basvuru.contactStatus === "ILETISIME_GECILDI" 
        ? "İletişime Geçildi" 
        : basvuru.contactStatus === "ILETISIME_GECILMEDI" && basvuru.lastContactedAt
        ? "İletişime Geçilemedi"
        : "İletişime Geçilmedi",
      "İletişim Notu": basvuru.contactNote || "",
      "Son İletişim Tarihi": basvuru.lastContactedAt ? new Date(basvuru.lastContactedAt).toLocaleString('tr-TR') : "",
      "Başvuru Tarihi": new Date(basvuru.createdAt).toLocaleString('tr-TR'),
      "Senkronizasyon Tarihi": new Date(basvuru.syncedAt).toLocaleString('tr-TR'),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    
    // Kolon genişliklerini ayarla
    const colWidths = [
      { wch: 8 },   // Sıra No
      { wch: 25 },  // Öğrenci Ad Soyad
      { wch: 12 },  // TC Kimlik No
      { wch: 50 },  // Okul
      { wch: 10 },  // Sınıf
      { wch: 8 },   // Şube
      { wch: 12 },  // Sınav Günü
      { wch: 25 },  // Baba Ad Soyad
      { wch: 30 },  // Baba Meslek
      { wch: 40 },  // Baba İş Adresi
      { wch: 15 },  // Baba Cep Telefonu
      { wch: 25 },  // Anne Ad Soyad
      { wch: 30 },  // Anne Meslek
      { wch: 40 },  // Anne İş Adresi
      { wch: 15 },  // Anne Cep Telefonu
      { wch: 30 },  // E-posta
      { wch: 18 },  // İletişim Durumu
      { wch: 40 },  // İletişim Notu
      { wch: 22 },  // Son İletişim Tarihi
      { wch: 20 },  // Başvuru Tarihi
      { wch: 20 },  // Senkronizasyon Tarihi
    ]
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Başvurular")
    
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" })
    const buffer = Buffer.from(wbout)
    
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `basvurular_${dateStr}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting basvurular:", error)
    return NextResponse.json({ error: "Failed to export basvurular" }, { status: 500 })
  }
}
