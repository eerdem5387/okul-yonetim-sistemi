import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const sinif = searchParams.get("sinif") || ""
    const okul = searchParams.get("okul") || ""
    const durum = searchParams.get("durum") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const tamamlandi = searchParams.get("tamamlandi") || ""

    const skip = (page - 1) * limit
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
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
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

    const filterByTamamlandi = tamamlandi === "true" || tamamlandi === "false"
    const whereFinal = filterByTamamlandi
      ? ({ ...where, sonlandirildi: tamamlandi === "true" } as Record<string, unknown>)
      : where

    const total = await prisma.adayOgrenciTespiti.count({ where: whereFinal })
    const adayOgrenciTespitleri = await prisma.adayOgrenciTespiti.findMany({
      where: whereFinal,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        kayitlar: {
          orderBy: { gorusmeTarihi: "desc" },
          take: 1,
        },
        _count: { select: { kayitlar: true } },
      },
    })

    return NextResponse.json({
      adayOgrenciTespitleri,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (error) {
    console.error("Error fetching aday öğrenci tespitleri:", error)
    return NextResponse.json(
      { error: "Aday öğrenci tespitleri getirilirken bir hata oluştu" },
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
    } = body

    if (
      !ogrenciAdSoyad ||
      !okul ||
      !sinif ||
      !veliAdSoyad ||
      !veliTelefon ||
      !referansAdSoyad ||
      !referansTelefon ||
      !referansKanali ||
      !durum ||
      !gorusmeTarihi
    ) {
      return NextResponse.json(
        { error: "Tüm zorunlu alanlar doldurulmalıdır (Görüşme tarihi zorunludur)" },
        { status: 400 }
      )
    }

    const gorusmeyiYapanFinal = gorusmeyiYapan || createdBy || "Sistem"

    if (!["OLUMLU", "OLUMSUZ", "BELIRSIZ"].includes(durum)) {
      return NextResponse.json({ error: "Geçersiz görüşme durumu" }, { status: 400 })
    }

    const gorusmeTarihiDate = new Date(gorusmeTarihi)
    if (isNaN(gorusmeTarihiDate.getTime())) {
      return NextResponse.json(
        { error: "Geçersiz görüşme tarihi formatı" },
        { status: 400 }
      )
    }

    const adayOgrenciTespiti = await prisma.adayOgrenciTespiti.create({
      data: {
        ogrenciAdSoyad,
        okul,
        sinif,
        veliAdSoyad,
        veliTelefon,
        veliMeslek: veliMeslek || null,
        referansAdSoyad,
        referansTelefon,
        referansKanali,
        referansNot: referansNot || null,
        createdBy: createdBy || null,
        kayitlar: {
          create: {
            gorusmeTarihi: gorusmeTarihiDate,
            gorusmeyiYapan: gorusmeyiYapanFinal,
            durum: durum as "OLUMLU" | "OLUMSUZ" | "BELIRSIZ",
            durumNotu: durumNotu || null,
            genelNot: genelNot || null,
          },
        },
      },
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
    console.error("Error creating aday öğrenci tespiti:", error)
    return NextResponse.json(
      { error: "Aday öğrenci tespiti oluşturulurken bir hata oluştu" },
      { status: 500 }
    )
  }
}
