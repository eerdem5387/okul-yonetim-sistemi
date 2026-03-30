"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Download, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TurnuvaAchievementPreview {
  certificateType: string
  certData: unknown
}

interface PdfOnizlemeModalProps {
  certificateType: string
  certData: unknown
  /** Turnuva: ikinci PDF (başarı) önizlemesi */
  turnuvaAchievementPreview?: TurnuvaAchievementPreview
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

export function PdfOnizlemeModal({
  certificateType,
  certData,
  turnuvaAchievementPreview,
  onClose,
  onConfirm,
  saving,
}: PdfOnizlemeModalProps) {
  const [tab, setTab] = useState<"participation" | "achievement">("participation")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeType =
    tab === "achievement" && turnuvaAchievementPreview
      ? turnuvaAchievementPreview.certificateType
      : certificateType
  const activeData =
    tab === "achievement" && turnuvaAchievementPreview
      ? turnuvaAchievementPreview.certData
      : certData

  const certDataKey = JSON.stringify(activeData ?? {})

  useEffect(() => {
    let objectUrl: string | null = null

    const fetchPreview = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/activity-events/preview-pdf", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ certificateType: activeType, certData: activeData }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || "PDF önizlemesi alınamadı")
        }
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        setPdfUrl(objectUrl)
      } catch (e) {
        setPdfUrl(null)
        setError(e instanceof Error ? e.message : "Önizleme yüklenemedi")
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // certDataKey = JSON.stringify(activeData) — derin değişiklikleri yakalar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, certDataKey])

  const handleDownload = () => {
    if (!pdfUrl) return
    const a = document.createElement("a")
    a.href = pdfUrl
    a.download =
      tab === "achievement" && turnuvaAchievementPreview
        ? "onizleme-turnuva-basari.pdf"
        : "onizleme-sertifika.pdf"
    a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ height: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">PDF Önizleme</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Sertifikayı inceleyin. Onayladıktan sonra faaliyet kaydedilir.
            </p>
            {turnuvaAchievementPreview && (
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setTab("participation")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === "participation"
                      ? "bg-cyan-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Katılım (Participation)
                </button>
                <button
                  type="button"
                  onClick={() => setTab("achievement")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === "achievement"
                      ? "bg-sky-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Başarı (Achievement)
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100 px-2 py-2">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                <p className="text-sm">Sertifika hazırlanıyor...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-red-500 p-8 max-w-md">
                <p className="font-medium mb-2">Önizleme yüklenemedi</p>
                <p className="text-sm text-gray-500">{error}</p>
                {tab === "achievement" && turnuvaAchievementPreview && (
                  <p className="text-xs text-gray-400 mt-3">
                    Başarı belgesi için en az bir öğrenciye derece metni yazın ve toplam yarışmacı sayısını kontrol edin.
                  </p>
                )}
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0`}
              className="w-full h-full rounded-lg border border-gray-200"
              title="Sertifika Önizleme"
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              ← Geri Dön
            </Button>
            {pdfUrl && (
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={saving}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-2" />
                İndir
              </Button>
            )}
          </div>
          <Button
            onClick={onConfirm}
            disabled={saving || loading || !!error || !pdfUrl}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Onayla ve Kaydet
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
