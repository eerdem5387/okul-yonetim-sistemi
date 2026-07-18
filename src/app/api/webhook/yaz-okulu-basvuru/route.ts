import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const webhookSecret = headersList.get("x-webhook-secret")
    const expectedSecret = process.env.WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error("[Yaz Okulu Webhook] WEBHOOK_SECRET tanımlı değil")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    if (webhookSecret !== expectedSecret) {
      console.warn("[Yaz Okulu Webhook] Geçersiz secret")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const source = headersList.get("x-webhook-source")
    if (source && source !== "basvuru-sistemi") {
      console.warn(`[Yaz Okulu Webhook] Beklenmeyen source: ${source}`)
    }

    const payload = await request.json()

    if (
      !payload.id ||
      !payload.ogrenciAd ||
      !payload.ogrenciSoyad ||
      !payload.okul ||
      !payload.ogrenciSinifi ||
      !payload.veliAd ||
      !payload.veliSoyad ||
      !payload.veliTelefon
    ) {
      return NextResponse.json(
        { error: "Invalid payload - missing required fields" },
        { status: 400 }
      )
    }

    const existing = await prisma.yazOkuluBasvuru.findUnique({
      where: { externalId: payload.id },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          message: "Başvuru zaten mevcut",
          id: existing.id,
        },
        { status: 200 }
      )
    }

    const basvuru = await prisma.yazOkuluBasvuru.create({
      data: {
        externalId: payload.id,
        ogrenciAd: payload.ogrenciAd,
        ogrenciSoyad: payload.ogrenciSoyad,
        okul: payload.okul,
        ogrenciSinifi: payload.ogrenciSinifi,
        veliAd: payload.veliAd,
        veliSoyad: payload.veliSoyad,
        veliTelefon: payload.veliTelefon,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        syncedAt: new Date(),
      },
    })

    console.log(
      `[Yaz Okulu Webhook] Başvuru alındı: ${payload.id} -> ${basvuru.id}`
    )

    return NextResponse.json(
      {
        success: true,
        message: "Başvuru alındı",
        id: basvuru.id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Yaz Okulu Webhook] Hata:", error)

    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { success: true, message: "Başvuru zaten mevcut" },
          { status: 200 }
        )
      }

      if (error.code === "P1001" || error.code === "P1002") {
        return NextResponse.json(
          { error: "Database connection error" },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
