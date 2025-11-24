import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    
    const skip = (page - 1) * limit

    // Arama filtresi
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

