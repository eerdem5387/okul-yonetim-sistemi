import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // 1. Secret doğrulama
    const headersList = await headers()
    const webhookSecret = headersList.get("x-webhook-secret")
    const expectedSecret = process.env.WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error("[Webhook] WEBHOOK_SECRET tanımlı değil")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    if (webhookSecret !== expectedSecret) {
      console.warn("[Webhook] Geçersiz secret - Yetkisiz erişim denemesi")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. Source doğrulama (opsiyonel ama önerilir)
    const source = headersList.get("x-webhook-source")
    if (source !== "basvuru-sistemi") {
      console.warn(`[Webhook] Beklenmeyen source: ${source}`)
      // İsterseniz burada da hata dönebilirsiniz, şimdilik sadece log
    }

    // 3. Request body'yi al
    const payload = await request.json()

    // 4. Veri validasyonu
    if (!payload.id || !payload.ogrenciTc || !payload.email) {
      return NextResponse.json(
        { error: "Invalid payload - missing required fields" },
        { status: 400 }
      )
    }

    // 5. Aynı externalId ile daha önce kayıt var mı kontrol et
    const existingBasvuru = await prisma.basvuru.findUnique({
      where: { externalId: payload.id }
    })

    if (existingBasvuru) {
      console.log(`[Webhook] Başvuru zaten mevcut: ${payload.id}`)
      return NextResponse.json(
        { 
          success: true, 
          message: "Başvuru zaten mevcut",
          id: existingBasvuru.id 
        },
        { status: 200 }
      )
    }

    // 6. Veritabanına kaydet
    const basvuru = await prisma.basvuru.create({
      data: {
        externalId: payload.id,
        ogrenciAdSoyad: payload.ogrenciAdSoyad,
        ogrenciTc: payload.ogrenciTc,
        okul: payload.okul,
        ogrenciSinifi: payload.ogrenciSinifi,
        ogrenciSube: payload.ogrenciSube || "Belirtilmedi",
        babaAdSoyad: payload.babaAdSoyad,
        babaMeslek: payload.babaMeslek,
        babaIsAdresi: payload.babaIsAdresi || "",
        babaCepTel: payload.babaCepTel,
        anneAdSoyad: payload.anneAdSoyad,
        anneMeslek: payload.anneMeslek,
        anneIsAdresi: payload.anneIsAdresi || "",
        anneCepTel: payload.anneCepTel,
        email: payload.email,
        createdAt: new Date(payload.createdAt),
        syncedAt: new Date(),
      }
    })

    // 7. Başarılı yanıt döndür
    console.log(`[Webhook] Başvuru başarıyla alındı: ${payload.id} -> ${basvuru.id}`)
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Başvuru alındı",
        id: basvuru.id 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("[Webhook] Hata:", error)
    
    // Prisma hatalarını kontrol et
    if (error && typeof error === 'object' && 'code' in error) {
      // Duplicate key hatası
      if (error.code === 'P2002') {
        return NextResponse.json(
          { 
            success: true, 
            message: "Başvuru zaten mevcut" 
          },
          { status: 200 }
        )
      }
      
      // Database connection error
      if (error.code === 'P1001' || error.code === 'P1002') {
        return NextResponse.json(
          { error: "Database connection error" },
          { status: 503 }
        )
      }
    }
    
    // Hata durumunda 500 döndür (retry için)
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

