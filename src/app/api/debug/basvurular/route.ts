import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Debug endpoint - Veritabanında başvuru var mı kontrol etmek için
export async function GET() {
  try {
    const count = await prisma.basvuru.count()
    const basvurular = await prisma.basvuru.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      count,
      basvurular,
      message: count > 0 ? `${count} başvuru bulundu` : 'Veritabanında başvuru yok'
    })
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0,
      basvurular: []
    }, { status: 500 })
  }
}

