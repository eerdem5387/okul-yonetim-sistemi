/** Barındırma (Vercel vb.) çoğu zaman ~4,5 MB gövde sınırı koyar; tek yüklemede bunun altında kalın. */
export const CLIENT_MAX_PARTICIPATION_PHOTO_BYTES = 3 * 1024 * 1024
export const CLIENT_MAX_EVIDENCE_IMAGE_BYTES = 3 * 1024 * 1024
export const CLIENT_MAX_EVIDENCE_VIDEO_BYTES = 4 * 1024 * 1024
export const CLIENT_MAX_PDF_BYTES = 4 * 1024 * 1024

export function formatMaxSizeLabel(maxBytes: number): string {
  if (maxBytes >= 1024 * 1024) {
    const mb = maxBytes / (1024 * 1024)
    return mb % 1 === 0 ? `${mb} MB` : `${mb.toFixed(1)} MB`
  }
  return `${Math.round(maxBytes / 1024)} KB`
}

/** Sunucu JSON veya düz metin (413 “Request Entity Too Large” vb.) dönebilir */
export async function parseUploadResponse(res: Response): Promise<{
  ok: boolean
  url?: string
  error?: string
}> {
  const text = await res.text()
  let json: { url?: string; error?: string } = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    const lower = text.toLowerCase()
    if (res.status === 413 || lower.includes("entity too large") || lower.includes("request entity")) {
      return {
        ok: false,
        error: `Dosya çok büyük. Barındırma sınırı nedeniyle tek dosya en fazla ${formatMaxSizeLabel(CLIENT_MAX_EVIDENCE_VIDEO_BYTES)} olmalı; görsel için ${formatMaxSizeLabel(CLIENT_MAX_PARTICIPATION_PHOTO_BYTES)}.`,
      }
    }
    return {
      ok: false,
      error: text.trim().slice(0, 200) || `Yükleme başarısız (${res.status})`,
    }
  }
  if (res.ok && json.url) return { ok: true, url: json.url }
  return { ok: false, error: json.error || `Yükleme başarısız (${res.status})` }
}

export function assertFileMaxSize(file: File, maxBytes: number, label: string): string | null {
  if (file.size > maxBytes) {
    return `${label}: dosya boyutu ${formatMaxSizeLabel(maxBytes)} sınırını aşıyor.`
  }
  return null
}
