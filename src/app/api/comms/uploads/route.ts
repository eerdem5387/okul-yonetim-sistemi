import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { put } from "@vercel/blob"
import { resolveCommsActor } from "@/lib/comms/identity"

export const dynamic = "force-dynamic"

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
])
/** Barındırma gövde sınırı (~4,5 MB) altında kalınır */
const MAX_SIZE = 4 * 1024 * 1024

/** Sınıf grubu sohbeti eki (fotoğraf / PDF) */
export async function POST(request: NextRequest) {
  const actor = await resolveCommsActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Yalnızca fotoğraf (JPEG, PNG, WEBP, HEIC) veya PDF eklenebilir" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Dosya en fazla 4 MB olabilir" }, { status: 400 })
  }

  const safe = (file.name || "dosya").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80)
  const blob = await put(`comms/${randomUUID()}-${safe}`, file, {
    access: "public",
    contentType: file.type,
  })
  return NextResponse.json({ url: blob.url, name: file.name || safe, type: file.type }, { status: 201 })
}
