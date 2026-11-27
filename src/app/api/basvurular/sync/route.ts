import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { payloadDonem } from "@/lib/bursluluk"

/**
 * Sync endpoint - Başvuru sistemindeki tüm başvuruları çekip senkronize eder
 */
export async function POST() {
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

    type IncomingBasvuru = {
      id: string
      ogrenciAdSoyad?: string
      ogrenciTc?: string
      donem?: string
      okul?: string
      ogrenciSinifi?: string
      ogrenciSube?: string
      sinavGunu?: string
      oturum?: string
      babaAdSoyad?: string
      babaMeslek?: string
      babaIsAdresi?: string
      babaCepTel?: string
      anneAdSoyad?: string
      anneMeslek?: string
      anneIsAdresi?: string
      anneCepTel?: string
      adresIl?: string
      adresIlce?: string
      adresMahalle?: string
      adresDetay?: string
      email?: string
      createdAt?: string
    }

    let synced = 0
    let skipped = 0
    let deleted = 0
    let errors = 0

    // 1) Mevcut kayıtları çek ve kaynakta artık olmayanları sil
    try {
      const existingBasvurular = await prisma.basvuru.findMany({
        select: {
          id: true,
          externalId: true,
        },
      })

      const incomingIds = new Set<string>(
        (basvurular as IncomingBasvuru[])
          .map((b) => b.id)
          .filter((id): id is string => typeof id === "string")
      )

      const toDeleteIds = existingBasvurular
        .filter((b) => !incomingIds.has(b.externalId))
        .map((b) => b.id)

      if (toDeleteIds.length > 0) {
        const deleteResult = await prisma.basvuru.deleteMany({
          where: {
            id: {
              in: toDeleteIds,
            },
          },
        })
        deleted = deleteResult.count
      }
    } catch (cleanupError) {
      console.error("[Sync] Eski başvurular temizlenirken hata oluştu:", cleanupError)
      // Temizlik hatası, insert akışını tamamen engellemesin
    }

    // 2) Her başvuruyu işle (yeni olanları ekle)
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
            donem: payloadDonem(payload.donem),
            okul: payload.okul,
            ogrenciSinifi: payload.ogrenciSinifi,
            ogrenciSube: payload.ogrenciSube || "Belirtilmedi",
            sinavGunu: payload.sinavGunu || "Belirtilmedi",
            oturum: typeof payload.oturum === "string" ? payload.oturum.slice(0, 100) : "",
            babaAdSoyad: payload.babaAdSoyad,
            babaMeslek: payload.babaMeslek,
            babaIsAdresi: payload.babaIsAdresi || "",
            babaCepTel: payload.babaCepTel,
            anneAdSoyad: payload.anneAdSoyad,
            anneMeslek: payload.anneMeslek,
            anneIsAdresi: payload.anneIsAdresi || "",
            anneCepTel: payload.anneCepTel,
            adresIl: payload.adresIl || "",
            adresIlce: payload.adresIlce || "",
            adresMahalle: payload.adresMahalle || "",
            adresDetay: payload.adresDetay || "",
            email: payload.email || "",
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
        deleted,
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

