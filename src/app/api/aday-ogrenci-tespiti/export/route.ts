import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const sinif = searchParams.get("sinif") || ""
    const okul = searchParams.get("okul") || ""
    const durum = searchParams.get("durum") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""

    const whereConditions: Array<Record<string, unknown>> = []

    if (search) {
      whereConditions.push({
        OR: [
          { ogrenciAdSoyad: { contains: search, mode: "insensitive" as const } },
          { okul: { contains: search, mode: "insensitive" as const } },
          { veliAdSoyad: { contains: search, mode: "insensitive" as const } },
          { veliTelefon: { contains: search } },
          { referansAdSoyad: { contains: search, mode: "insensitive" as const } },
          { referansKanali: { contains: search, mode: "insensitive" as const } },
        ],
      })
    }

    if (sinif) {
      whereConditions.push({ sinif: { equals: sinif, mode: "insensitive" as const } })
    }

    if (okul) {
      whereConditions.push({ okul: { contains: okul, mode: "insensitive" as const } })
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        dateFilter.lte = endDateTime
      }
      whereConditions.push({ createdAt: dateFilter })
    }

    let durumFilter: Record<string, unknown> | null = null
    if (durum) {
      durumFilter = {
        kayitlar: {
          some: {
            durum: durum as "OLUMLU" | "OLUMSUZ" | "BELIRSIZ",
          },
        },
      }
    }

    const where =
      whereConditions.length > 0 || durumFilter
        ? {
            AND: [...whereConditions, ...(durumFilter ? [durumFilter] : [])],
          }
        : {}

    const rowsRaw = await prisma.adayOgrenciTespiti.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        kayitlar: {
          orderBy: { gorusmeTarihi: "desc" },
        },
      },
    })

    const XLSX = await import("xlsx")

    const rows = rowsRaw.map((item, index) => {
      const sonKayit = item.kayitlar[0]
      const durumText =
        sonKayit?.durum === "OLUMLU"
          ? "Olumlu"
          : sonKayit?.durum === "OLUMSUZ"
            ? "Olumsuz"
            : sonKayit?.durum === "BELIRSIZ"
              ? "Belirsiz"
              : "Belirtilmedi"

      return {
        "Sıra No": index + 1,
        "Öğrenci Ad Soyad": item.ogrenciAdSoyad,
        Okul: item.okul,
        Sınıf: item.sinif,
        "Veli Ad Soyad": item.veliAdSoyad,
        "Veli Telefon": item.veliTelefon,
        "Veli Meslek": item.veliMeslek || "",
        "Referans Ad Soyad": item.referansAdSoyad,
        "Referans Telefon": item.referansTelefon,
        "Referans Kanalı": item.referansKanali,
        "Referans Not": item.referansNot || "",
        "Son Görüşme Tarihi": sonKayit
          ? new Date(sonKayit.gorusmeTarihi).toLocaleString("tr-TR")
          : "",
        "Son Görüşmeyi Yapan": sonKayit?.gorusmeyiYapan || "",
        "Son Durum": durumText,
        "Son Durum Notu": sonKayit?.durumNotu || "",
        Açıklama: sonKayit?.genelNot || "",
        "Toplam Görüşme Sayısı": item.kayitlar.length,
        "Oluşturulma Tarihi": new Date(item.createdAt).toLocaleString("tr-TR"),
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 40 },
      { wch: 10 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 40 },
      { wch: 22 },
      { wch: 25 },
      { wch: 12 },
      { wch: 40 },
      { wch: 40 },
      { wch: 20 },
      { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, "Aday Öğrenci Tespiti")

    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" })
    const buffer = Buffer.from(wbout)
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `aday_ogrenci_tespiti_${dateStr}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting aday öğrenci tespitleri:", error)
    return NextResponse.json(
      { error: "Failed to export aday öğrenci tespitleri" },
      { status: 500 }
    )
  }
}
