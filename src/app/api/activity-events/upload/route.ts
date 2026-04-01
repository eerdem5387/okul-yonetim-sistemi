import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { checkActivityAccess } from "@/lib/access-control"

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const ALLOWED_DOC_TYPES = ["application/pdf"]

const MAX_PHOTO_SIZE = 3 * 1024 * 1024 // 3 MB
/** Vercel / proxy genelde ~4,5 MB gövde — daha büyük video 413 verir (JSON olmayan yanıt) */
const MAX_VIDEO_SIZE = 4 * 1024 * 1024
const MAX_IMAGE_SIZE = 3 * 1024 * 1024
const MAX_DOC_SIZE = 4 * 1024 * 1024

export async function POST(request: NextRequest) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    // type: participation_photo | evidence | extra_doc | signed_document | signed_curriculum
    const uploadType = searchParams.get("type") || "participation_photo"

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 })
    }

    const mimeType = file.type
    const fileSize = file.size

    if (uploadType === "participation_photo") {
      if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        return NextResponse.json(
          { error: "Sadece görsel dosyalar kabul edilir (JPEG, PNG, WEBP, GIF, HEIC)" },
          { status: 400 }
        )
      }
      if (fileSize > MAX_PHOTO_SIZE) {
        return NextResponse.json({ error: "Katılım fotoğrafı maksimum 3 MB olabilir" }, { status: 400 })
      }
    } else if (uploadType === "evidence") {
      if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
        if (fileSize > MAX_VIDEO_SIZE) {
          return NextResponse.json({ error: "Video kanıtı maksimum 4 MB olabilir (barındırma sınırı)" }, { status: 400 })
        }
      } else if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        if (fileSize > MAX_IMAGE_SIZE) {
          return NextResponse.json({ error: "Görsel kanıt maksimum 3 MB olabilir" }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: "Kanıt olarak görsel veya video yüklenebilir" }, { status: 400 })
      }
    } else if (uploadType === "extra_doc") {
      if (!ALLOWED_DOC_TYPES.includes(mimeType)) {
        return NextResponse.json({ error: "Sadece PDF dosyası yüklenebilir" }, { status: 400 })
      }
      if (fileSize > MAX_DOC_SIZE) {
        return NextResponse.json({ error: "Ek belge maksimum 4 MB olabilir" }, { status: 400 })
      }
    } else if (uploadType === "signed_document" || uploadType === "signed_curriculum") {
      const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]
      if (!allowed.includes(mimeType)) {
        return NextResponse.json({ error: "İmzalı belge olarak PDF veya görsel yüklenebilir" }, { status: 400 })
      }
      if (fileSize > MAX_DOC_SIZE) {
        return NextResponse.json({ error: "İmzalı belge maksimum 4 MB olabilir" }, { status: 400 })
      }
    }

    const ext = file.name.split(".").pop() || "bin"
    const filename = `activity-events/${uploadType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const blob = await put(filename, file, { access: "public" })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Dosya yüklenirken hata oluştu" }, { status: 500 })
  }
}
