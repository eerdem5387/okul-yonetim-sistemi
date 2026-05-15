import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { resolveChatActor } from "@/lib/chat/identity"

export const dynamic = "force-dynamic"

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024 // 10MB

function maxBytes(): number {
  const raw = process.env.CHAT_MAX_BYTES
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES
}

export async function POST(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 })

    const mime = file.type || ""
    const size = file.size || 0

    const isImage = ALLOWED_IMAGE_TYPES.includes(mime)
    const isDoc = ALLOWED_DOC_TYPES.includes(mime)
    if (!isImage && !isDoc) {
      return NextResponse.json(
        { error: "Sadece görsel veya doküman dosyaları yüklenebilir" },
        { status: 400 }
      )
    }
    if (size > maxBytes()) {
      const mb = (maxBytes() / (1024 * 1024)).toFixed(0)
      return NextResponse.json(
        { error: `Dosya boyutu en fazla ${mb} MB olabilir` },
        { status: 400 }
      )
    }

    const ext = (file.name.split(".").pop() || "bin").toLowerCase()
    const ownerKey =
      actor.kind === "staff" ? `staff-${actor.staffId}` : `parent-${actor.parentId}`
    const filename = `chat/${ownerKey}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const blob = await put(filename, file, { access: "public" })
    return NextResponse.json({
      url: blob.url,
      type: isImage ? "IMAGE" : "DOCUMENT",
      mime,
      size,
      filename: file.name,
    })
  } catch (err) {
    console.error("[chat upload] error:", err)
    return NextResponse.json({ error: "Dosya yüklenirken hata oluştu" }, { status: 500 })
  }
}
