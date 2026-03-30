"use client"

import { useEffect, useState } from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = {}
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

export interface PdfPreviewModalProps {
  open: boolean
  onClose: () => void
  /** Panel API yolu, örn. /api/activities/id/pdf */
  apiPath: string | null
  title?: string
}

/**
 * Bearer ile PDF çekip blob URL ile iframe’de gösterir; indirme gerekmez.
 */
export function PdfPreviewModal({ open, onClose, apiPath, title = "PDF önizleme" }: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !apiPath) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let created: string | null = null

    setLoading(true)
    setError(null)
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })

    fetch(apiPath, { headers: getAuthHeaders() })
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(typeof j.error === "string" ? j.error : "PDF alınamadı")
        }
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setBlobUrl(created)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Önizleme açılamadı")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [open, apiPath])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-4 py-3 text-white shrink-0">
        <h2 className="text-sm font-semibold truncate pr-4">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 shrink-0"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Kapat</span>
        </Button>
      </div>
      <div className="flex-1 min-h-0 bg-slate-800 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-red-200 text-sm z-10">
            {error}
          </div>
        )}
        {blobUrl && !error && (
          <iframe
            title={title}
            src={blobUrl}
            className="w-full h-full min-h-[70vh] border-0 bg-white"
          />
        )}
      </div>
    </div>
  )
}
