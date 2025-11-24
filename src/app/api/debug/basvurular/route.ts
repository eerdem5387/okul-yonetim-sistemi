import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Debug endpoint - Veritabanında başvuru var mı kontrol etmek için
export async function GET() {
  try {
    const count = await prisma.basvuru.count()
    const basvurular = await prisma.basvuru.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    })

    // Test başvurularını işaretle
    const basvurularWithTestFlag = basvurular.map(b => ({
      ...b,
      isTest: b.ogrenciAdSoyad.includes('TEST') || 
              b.okul === 'Test Okulu' ||
              b.externalId.startsWith('test-')
    }))

    return NextResponse.json({
      count,
      basvurular: basvurularWithTestFlag,
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

// Test başvurularını silmek için
export async function DELETE() {
  try {
    // Test başvurularını bul
    const testBasvurular = await prisma.basvuru.findMany({
      where: {
        OR: [
          { ogrenciAdSoyad: { contains: 'TEST', mode: 'insensitive' } },
          { okul: 'Test Okulu' },
          { externalId: { startsWith: 'test-' } }
        ]
      }
    })

    if (testBasvurular.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Test başvurusu bulunamadı',
        deleted: 0
      })
    }

    // Test başvurularını sil
    const deleteResult = await prisma.basvuru.deleteMany({
      where: {
        OR: [
          { ogrenciAdSoyad: { contains: 'TEST', mode: 'insensitive' } },
          { okul: 'Test Okulu' },
          { externalId: { startsWith: 'test-' } }
        ]
      }
    })

    return NextResponse.json({
      success: true,
      message: `${deleteResult.count} test başvurusu silindi`,
      deleted: deleteResult.count
    })
  } catch (error) {
    console.error("Delete test basvuru error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

