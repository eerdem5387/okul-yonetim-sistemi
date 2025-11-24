import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Sync endpoint - Başvuru sistemindeki tüm başvuruları çekip senkronize eder
 */
export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET
    const basvuruSistemiUrl = process.env.BASVURU_SISTEMI_URL || 'https://basvuru-sistemi.vercel.app'

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "WEBHOOK_SECRET tanımlı değil" },
        { status: 500 }
      )
    }

    // Başvuru sisteminden tüm başvuruları çek
    const response = await fetch(`${basvuruSistemiUrl}/api/sync/basvurular`, {
      headers: {
        'Authorization': `Bearer ${webhookSecret}`
      }
    })

    if (!response.ok) {
      throw new Error(`Sync API error: ${response.status}`)
    }

    const data = await response.json()
    const basvurular = data.basvurular || []

    let synced = 0
    let skipped = 0
    let errors = 0

    // Her başvuruyu işle
    for (const payload of basvurular) {
      try {
        // Aynı externalId ile daha önce kayıt var mı kontrol et
        const existingBasvuru = await prisma.basvuru.findUnique({
          where: { externalId: payload.id }
        })

        if (existingBasvuru) {
          skipped++
          continue
        }

        // Veritabanına kaydet
        await prisma.basvuru.create({
          data: {
            externalId: payload.id,
            ogrenciAdSoyad: payload.ogrenciAdSoyad,
            ogrenciTc: payload.ogrenciTc,
            okul: payload.okul,
            ogrenciSinifi: payload.ogrenciSinifi,
            babaAdSoyad: payload.babaAdSoyad,
            babaMeslek: payload.babaMeslek,
            babaIsAdresi: payload.babaIsAdresi || null,
            babaCepTel: payload.babaCepTel,
            anneAdSoyad: payload.anneAdSoyad,
            anneMeslek: payload.anneMeslek,
            anneIsAdresi: payload.anneIsAdresi || null,
            anneCepTel: payload.anneCepTel,
            email: payload.email,
            createdAt: new Date(payload.createdAt),
            syncedAt: new Date(),
          }
        })

        synced++
      } catch (error) {
        console.error(`[Sync] Başvuru kaydedilemedi: ${payload.id}`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: "Senkronizasyon tamamlandı",
      stats: {
        total: basvurular.length,
        synced,
        skipped,
        errors
      }
    })
  } catch (error) {
    console.error("[Sync] Hata:", error)
    return NextResponse.json(
      { 
        error: "Senkronizasyon başarısız",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

