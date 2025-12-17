import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sinif = searchParams.get('sinif') || ''
    const okul = searchParams.get('okul') || ''
    const durum = searchParams.get('durum') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // Filtreleme koşulları (API ile aynı)
    const whereConditions: Array<Record<string, unknown>> = []
    
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
    
    if (sinif) {
      whereConditions.push({ sinif: { equals: sinif, mode: 'insensitive' as const } })
    }
    
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
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        dateFilter.lte = endDateTime
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

    // Tüm teklif görüşmelerini çek (pagination yok, hepsi)
    const teklifGorusmeleri = await prisma.teklifGorusmesi.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        kayitlar: {
          orderBy: { gorusmeTarihi: 'desc' }
        }
      }
    })

    // Excel için veri hazırlama
    const XLSX = await import("xlsx")
    
    const rows = teklifGorusmeleri.map((teklif, index) => {
      const sonKayit = teklif.kayitlar[0] // En son kayıt
      const durumText = sonKayit?.durum === "OLUMLU" 
        ? "Olumlu" 
        : sonKayit?.durum === "OLUMSUZ"
        ? "Olumsuz"
        : sonKayit?.durum === "BELIRSIZ"
        ? "Belirsiz"
        : "Belirtilmedi"
      
      return {
        "Sıra No": index + 1,
        "Öğrenci Ad Soyad": teklif.ogrenciAdSoyad,
        "Okul": teklif.okul,
        "Sınıf": teklif.sinif,
        "Veli Ad Soyad": teklif.veliAdSoyad,
        "Veli Telefon": teklif.veliTelefon,
        "Veli Email": teklif.veliEmail || "",
        "Veli Meslek": teklif.veliMeslek || "",
        "Veli Adres": teklif.veliAdres || "",
        "Teklif Edilen Fiyat": teklif.teklifEdilenFiyat,
        "Okul Fiyatı": teklif.okulFiyati,
        "Son Görüşme Tarihi": sonKayit ? new Date(sonKayit.gorusmeTarihi).toLocaleString('tr-TR') : "",
        "Son Görüşmeyi Yapan": sonKayit?.gorusmeyiYapan || "",
        "Son Durum": durumText,
        "Son Durum Notu": sonKayit?.durumNotu || "",
        "Son Genel Not": sonKayit?.genelNot || "",
        "Toplam Görüşme Sayısı": teklif.kayitlar.length,
        "Oluşturulma Tarihi": new Date(teklif.createdAt).toLocaleString('tr-TR'),
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    
    // Kolon genişliklerini ayarla
    const colWidths = [
      { wch: 8 },   // Sıra No
      { wch: 25 },  // Öğrenci Ad Soyad
      { wch: 50 },  // Okul
      { wch: 10 },  // Sınıf
      { wch: 25 },  // Veli Ad Soyad
      { wch: 15 },  // Veli Telefon
      { wch: 30 },  // Veli Email
      { wch: 30 },  // Veli Meslek
      { wch: 40 },  // Veli Adres
      { wch: 18 },  // Teklif Edilen Fiyat
      { wch: 15 },  // Okul Fiyatı
      { wch: 22 },  // Son Görüşme Tarihi
      { wch: 25 },  // Son Görüşmeyi Yapan
      { wch: 12 },  // Son Durum
      { wch: 40 },  // Son Durum Notu
      { wch: 40 },  // Son Genel Not
      { wch: 20 },  // Toplam Görüşme Sayısı
      { wch: 20 },  // Oluşturulma Tarihi
    ]
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Teklif Görüşmeleri")
    
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" })
    const buffer = Buffer.from(wbout)
    
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `teklif_gorusmeleri_${dateStr}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting teklif görüşmeleri:", error)
    return NextResponse.json({ error: "Failed to export teklif görüşmeleri" }, { status: 500 })
  }
}

