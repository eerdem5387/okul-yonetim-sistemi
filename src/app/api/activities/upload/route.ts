import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { checkIbAccess } from "@/lib/access-control"

// POST - Dosya yükle
export async function POST(request: NextRequest) {
  try {
    // Yetki kontrolü
    const { hasAccess } = await checkIbAccess(request)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz bulunmamaktadır" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const { searchParams } = new URL(request.url)
    const uploadType = searchParams.get("type") || ""
    const isParticipationPhoto = uploadType === "participation"
    const isSignedDocument = uploadType === "signed_document"

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 })
    }

    // Katılım kanıt: 5MB resim. İmzalı belge: 10MB PDF/resim. Diğer: 10MB
    const maxSize = isParticipationPhoto ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      const msg = isParticipationPhoto
        ? "Katılım fotoğrafı en fazla 5MB olabilir"
        : isSignedDocument
          ? "İmzalı belge en fazla 10MB olabilir"
          : "Dosya boyutu 10MB'dan büyük olamaz"
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    const pdfType = "application/pdf"
    const allowedTypes = isParticipationPhoto
      ? imageTypes
      : isSignedDocument
        ? [...imageTypes, pdfType]
        : [
            ...imageTypes,
            pdfType,
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "video/mp4",
            "video/quicktime",
          ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: isSignedDocument ? "İmzalı belge için sadece PDF veya resim (JPG, PNG, vb.) yükleyebilirsiniz" : "Desteklenmeyen dosya tipi" },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const prefix = isParticipationPhoto ? "participation-photo" : isSignedDocument ? "signed-document" : "activity-evidence"
    const fileName = `${prefix}-${timestamp}-${file.name}`

    // Vercel Blob'a yükle
    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Dosya yüklenirken hata oluştu" },
      { status: 500 }
    )
  }
}

