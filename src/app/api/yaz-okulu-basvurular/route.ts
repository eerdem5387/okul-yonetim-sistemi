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
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const contactStatus = searchParams.get("contactStatus") || ""

    const skip = (page - 1) * limit
    const whereConditions: Array<Record<string, unknown>> = []

    if (search) {
      whereConditions.push({
        OR: [
          { ogrenciAd: { contains: search, mode: "insensitive" as const } },
          { ogrenciSoyad: { contains: search, mode: "insensitive" as const } },
          { veliAd: { contains: search, mode: "insensitive" as const } },
          { veliSoyad: { contains: search, mode: "insensitive" as const } },
          { veliTelefon: { contains: search } },
          { okul: { contains: search, mode: "insensitive" as const } },
        ],
      })
    }

    if (sinif) {
      whereConditions.push({
        ogrenciSinifi: { equals: sinif, mode: "insensitive" as const },
      })
    }

    if (okul) {
      whereConditions.push({
        okul: { contains: okul, mode: "insensitive" as const },
      })
    }

    if (contactStatus === "ILETISIME_GECILDI") {
      whereConditions.push({ contactStatus: "ILETISIME_GECILDI" })
    } else if (contactStatus === "ILETISIME_GECILMEDI") {
      whereConditions.push({ contactStatus: "ILETISIME_GECILMEDI" })
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      whereConditions.push({ createdAt: dateFilter })
    }

    const where =
      whereConditions.length > 0 ? { AND: whereConditions } : {}

    const [basvurular, total] = await Promise.all([
      prisma.yazOkuluBasvuru.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.yazOkuluBasvuru.count({ where }),
    ])

    return NextResponse.json({
      basvurular,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (error) {
    console.error("[Yaz Okulu] List hatası:", error)
    return NextResponse.json(
      { error: "Başvurular alınamadı" },
      { status: 500 }
    )
  }
}
