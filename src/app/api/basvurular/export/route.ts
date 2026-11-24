import { isoDateTR } from "@/lib/dates"
import { requireStaff } from "@/lib/auth/api-guard"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { basvuruGecmisleri, donemEtiketi, donemKosullari } from "@/lib/bursluluk"

export async function GET(request: NextRequest) {
  const authGuard = await requireStaff(request)
  if (!authGuard.ok) return authGuard.response
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
    const whereConditions: Array<Record<string, unknown>> = [
      ...(await donemKosullari(prisma, searchParams)),
    ]
    
    // Arama filtresi - Sadece öğrenci adı ve soyadı ile arama
    if (search) {
      whereConditions.push({
        ogrenciAdSoyad: { contains: search, mode: 'insensitive' as const }
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

    const gecmis = await basvuruGecmisleri(prisma, basvurular.map((b) => b.ogrenciTc))

    // Excel için veri hazırlama
    const XLSX = await import("xlsx")
    
    const rows = basvurular.map((basvuru, index) => ({
      "Sıra No": index + 1,
      "Öğrenci Ad Soyad": basvuru.ogrenciAdSoyad,
      "TC Kimlik No": basvuru.ogrenciTc,
      "Dönem": donemEtiketi(basvuru.donem),
      "Toplam Başvuru Sayısı": gecmis.get(basvuru.ogrenciTc)?.basvuruSayisi ?? 1,
      "Başvurduğu Dönemler": (gecmis.get(basvuru.ogrenciTc)?.donemler ?? [basvuru.donem]).map(donemEtiketi).join(", "),
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
      "İl": basvuru.adresIl || "",
      "İlçe": basvuru.adresIlce || "",
      "Mahalle / Köy": basvuru.adresMahalle || "",
      "Adres Detayı": basvuru.adresDetay || "",
      "E-posta": basvuru.email || "",
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
    
    // Kolon genişlikleri: başlık ve içerik uzunluğuna göre (en fazla 50 karakter)
    const headers = rows.length > 0 ? Object.keys(rows[0]) : []
    const colWidths = headers.map((h) => ({
      wch: Math.min(
        50,
        Math.max(h.length, ...rows.slice(0, 500).map((r) => String(r[h as keyof typeof r] ?? "").length)) + 2
      ),
    }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Başvurular")
    
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" })
    const buffer = Buffer.from(wbout)
    
    const dateStr = isoDateTR()
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
