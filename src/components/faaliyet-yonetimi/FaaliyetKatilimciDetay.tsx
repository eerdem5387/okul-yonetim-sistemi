"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  User,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  Loader2,
  ExternalLink,
  Eye,
  FileDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PdfPreviewModal } from "@/components/ui/pdf-preview-modal"
import type { ActivityEventDetail } from "./FaaliyetDetay.shared"
import { assertFileMaxSize, CLIENT_MAX_PDF_BYTES, parseUploadResponse } from "@/lib/upload-client"

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

const STATUS_COLORS: Record<string, string> = {
  IMZA_SURECINDE: "bg-slate-100 text-slate-700",
  ONAY_BEKLIYOR: "bg-amber-100 text-amber-700",
  ONAYLANDI: "bg-emerald-100 text-emerald-700",
}

const STATUS_LABELS: Record<string, string> = {
  IMZA_SURECINDE: "İmza Sürecinde",
  ONAY_BEKLIYOR: "Onay Bekliyor",
  ONAYLANDI: "Onaylandı",
}

interface FaaliyetKatilimciDetayProps {
  eventId: string
  participantId: string
}

export function FaaliyetKatilimciDetay({ eventId, participantId }: FaaliyetKatilimciDetayProps) {
  const [event, setEvent] = useState<ActivityEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPid, setActionPid] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfPreviewPath, setPdfPreviewPath] = useState<string | null>(null)
  const signedRef = useRef<HTMLInputElement>(null)

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/activity-events/${eventId}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error((await res.json())?.error || "Yüklenemedi")
      setEvent(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const p = event?.participants.find((x) => x.id === participantId)
  const participantPdfPath = `/api/activity-events/${eventId}/pdf?participantId=${participantId}`

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      const res = await fetch(participantPdfPath, { headers: getAuthHeaders() })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "PDF alınamadı")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `katilimci-sertifika-${participantId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF indirilemedi")
    } finally {
      setPdfLoading(false)
    }
  }

  const handleVerify = async (approve: boolean) => {
    setActionPid(true)
    try {
      const res = await fetch(`/api/activity-events/${eventId}/participants/${participantId}/verify`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ approve }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "İşlem başarısız")
      }
      await fetchEvent()
    } catch (e) {
      alert(e instanceof Error ? e.message : "İşlem başarısız")
    } finally {
      setActionPid(false)
    }
  }

  const handleUploadSigned = async (file: File) => {
    setActionPid(true)
    try {
      const sizeErr = assertFileMaxSize(file, CLIENT_MAX_PDF_BYTES, "İmzalı belge")
      if (sizeErr) throw new Error(sizeErr)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = `Bearer ${token}`
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch("/api/activity-events/upload?type=signed_document", {
        method: "POST",
        headers,
        body: formData,
      })
      const parsed = await parseUploadResponse(uploadRes)
      if (!parsed.ok || !parsed.url) throw new Error(parsed.error || "Yükleme başarısız")
      const url = parsed.url

      const participant = event?.participants.find((x) => x.id === participantId)
      const existingUrls = participant?.signedDocumentUrls ?? []

      const updateRes = await fetch(`/api/activity-events/${eventId}/participants/${participantId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verificationStatus: "ONAY_BEKLIYOR",
          signedDocumentUrls: [...existingUrls, url],
        }),
      })
      if (!updateRes.ok) {
        const d = await updateRes.json().catch(() => ({}))
        throw new Error(d.error || "Güncelleme başarısız")
      }
      await fetchEvent()
    } catch (e) {
      alert(e instanceof Error ? e.message : "İşlem başarısız")
    } finally {
      setActionPid(false)
      if (signedRef.current) signedRef.current.value = ""
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error || !event || !p) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center text-red-600">
        <p>{error || "Katılımcı bulunamadı"}</p>
        <Link href={`/faaliyet-yonetimi/${eventId}`} className="mt-4 inline-block text-indigo-600 underline text-sm">
          Faaliyet detayına dön
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <PdfPreviewModal
        open={!!pdfPreviewPath}
        onClose={() => setPdfPreviewPath(null)}
        apiPath={pdfPreviewPath}
        title={`${p.student.firstName} ${p.student.lastName} — sertifika önizleme`}
      />
      <div className="flex flex-col gap-2">
        <Link
          href="/faaliyet-yonetimi"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Faaliyet Yönetimi
        </Link>
        <Link
          href={`/faaliyet-yonetimi/${eventId}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {event.title}
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-2">Katılımcı detayı</p>
        <div className="flex items-start gap-4">
          {p.participationPhotoUrl ? (
            <img
              src={p.participationPhotoUrl}
              alt=""
              className="h-24 w-24 rounded-xl object-cover border border-gray-200"
            />
          ) : (
            <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
              <User className="h-10 w-10 text-gray-300" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {p.student.firstName} {p.student.lastName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {p.student.grade} · TC: {p.student.tcNumber}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {p.score != null && (
            <span className="rounded-full bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5">Puan: {p.score}/100</span>
          )}
          {p.languageLevel && (
            <span className="rounded-full bg-purple-100 text-purple-700 text-xs px-2 py-0.5">
              Seviye: {p.languageLevel}
            </span>
          )}
          {p.tournamentPlacement?.trim() && (
            <span className="rounded-full bg-cyan-100 text-cyan-800 text-xs px-2 py-0.5">
              Derece: {p.tournamentPlacement}
            </span>
          )}
          {p.projectRole?.trim() && (
            <span className="rounded-full bg-amber-100 text-amber-900 text-xs px-2 py-0.5">
              Rol: {p.projectRole}
            </span>
          )}
        </div>

        {p.extraDocumentUrl && (
          <div className="mt-4">
            <a
              href={p.extraDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ek belge
            </a>
          </div>
        )}

        {p.artworkDescription?.trim() && (
          <div className="mt-4 text-sm text-gray-700 border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-800 mb-1">Eser / açıklama</p>
            <p className="whitespace-pre-wrap">{p.artworkDescription}</p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[p.verificationStatus]}`}>
            {p.verificationStatus === "ONAYLANDI" && <CheckCircle className="h-3.5 w-3.5" />}
            {p.verificationStatus === "ONAY_BEKLIYOR" && <Clock className="h-3.5 w-3.5" />}
            {p.verificationStatus === "IMZA_SURECINDE" && <FileText className="h-3.5 w-3.5" />}
            {STATUS_LABELS[p.verificationStatus]}
          </span>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPdfPreviewPath(participantPdfPath)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Eye className="h-4 w-4" />
            <span className="ml-2">PDF Önizle</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pdfLoading}
            onClick={handleDownloadPdf}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            <span className="ml-2">PDF İndir</span>
          </Button>
        </div>

        {p.signedDocumentUrls?.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-800">İmzalı belgeler</p>
            {p.signedDocumentUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:underline"
              >
                Belge {i + 1}
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2 border-t border-gray-100 pt-6">
          {p.verificationStatus === "IMZA_SURECINDE" && (
            <>
              <input
                ref={signedRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadSigned(file)
                }}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={actionPid}
                onClick={() => signedRef.current?.click()}
              >
                {actionPid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-2">İmzalı yükle</span>
              </Button>
            </>
          )}
          {p.verificationStatus === "ONAY_BEKLIYOR" && (
            <Button size="sm" className="bg-emerald-600" disabled={actionPid} onClick={() => handleVerify(true)}>
              {actionPid ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              <span className="ml-2">Onayla</span>
            </Button>
          )}
          {p.verificationStatus === "ONAYLANDI" && (
            <Button size="sm" variant="outline" disabled={actionPid} onClick={() => handleVerify(false)}>
              <Clock className="h-4 w-4" />
              <span className="ml-2">Onayı geri al</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
