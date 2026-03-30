"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Loader2,
  FileText,
  FileDown,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Pencil,
  Trash2,
  User,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PdfPreviewModal } from "@/components/ui/pdf-preview-modal"

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

interface ActivityRecord {
  id: string
  title: string
  type: string
  category: string | null
  description: string | null
  activityDate: string
  location: string | null
  organizer: string | null
  outcome: string | null
  verificationStatus: string
  signedDocumentUrls: string[]
  participationPhotoUrl: string | null
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber: string
  }
}

const STATUS_LABELS: Record<string, string> = {
  IMZA_SURECINDE: "İmza sürecinde",
  ONAY_BEKLIYOR: "Onay bekliyor",
  ONAYLANDI: "Onaylandı",
}

interface LegacyActivityKayitDetayProps {
  activityId: string
  backHref?: string
  backLabel?: string
}

export function LegacyActivityKayitDetay({
  activityId,
  backHref,
  backLabel = "Geri",
}: LegacyActivityKayitDetayProps) {
  const [data, setData] = useState<ActivityRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<{ path: string; title: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/activities/${activityId}`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Yüklenemedi")
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [activityId])

  useEffect(() => {
    load()
  }, [load])

  const defaultBack = `/activities/student/${data?.student.id ?? ""}`

  const handleUploadSigned = async (files: FileList | null) => {
    if (!files?.length || !data) return
    setActionLoading(true)
    try {
      const urls: string[] = []
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        const res = await fetch("/api/activities/upload?type=signed_document", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j.error || "Yükleme başarısız")
        if (j.url) urls.push(j.url)
      }
      const putRes = await fetch(`/api/activities/${activityId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verificationStatus: "ONAY_BEKLIYOR",
          signedDocumentUrls: [...(data.signedDocumentUrls ?? []), ...urls],
        }),
      })
      if (!putRes.ok) {
        const j = await putRes.json().catch(() => ({}))
        throw new Error(j.error || "Güncellenemedi")
      }
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hata")
    } finally {
      setActionLoading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleVerify = async (approved: boolean) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verificationStatus: approved ? "ONAYLANDI" : "ONAY_BEKLIYOR",
          verifiedAt: approved ? new Date().toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "İşlem başarısız")
      }
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hata")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Bu öğrenci kaydını silmek istediğinize emin misiniz?")) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/activities/${activityId}`, { method: "DELETE", headers: getAuthHeaders() })
      if (!res.ok) throw new Error("Silinemedi")
      window.location.href = backHref || "/activities"
    } catch {
      alert("Silme başarısız")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center text-red-600">
        <p>{error || "Kayıt yok"}</p>
        <Link href="/activities" className="mt-4 inline-block text-indigo-600 underline text-sm">
          IB Faaliyet Yönetimi
        </Link>
      </div>
    )
  }

  const hrefBack = backHref ?? defaultBack

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <PdfPreviewModal
        open={!!pdfPreview}
        onClose={() => setPdfPreview(null)}
        apiPath={pdfPreview?.path ?? null}
        title={pdfPreview?.title ?? "PDF önizleme"}
      />
      <Link href={hrefBack} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Öğrenci kaydı (klasik IB)</p>
        <div className="flex items-start gap-4">
          {data.participationPhotoUrl ? (
            <img
              src={data.participationPhotoUrl}
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
              {data.student.firstName} {data.student.lastName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {data.student.grade} · TC: {data.student.tcNumber}
            </p>
            <p className="text-sm text-gray-700 mt-3 font-medium">{data.title}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(data.activityDate).toLocaleDateString("tr-TR")}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              data.verificationStatus === "ONAYLANDI"
                ? "bg-emerald-100 text-emerald-800"
                : data.verificationStatus === "ONAY_BEKLIYOR"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {data.verificationStatus === "ONAYLANDI" && <CheckCircle className="h-3.5 w-3.5" />}
            {data.verificationStatus === "ONAY_BEKLIYOR" && <Clock className="h-3.5 w-3.5" />}
            {data.verificationStatus === "IMZA_SURECINDE" && <FileText className="h-3.5 w-3.5" />}
            {STATUS_LABELS[data.verificationStatus] ?? data.verificationStatus}
          </span>
        </div>

        {(data.description || data.location || data.organizer || data.outcome) && (
          <div className="mt-6 space-y-3 text-sm text-gray-700 border-t border-gray-100 pt-6">
            {data.description && <p>{data.description}</p>}
            {data.location && <p className="text-gray-500">Konum: {data.location}</p>}
            {data.organizer && <p className="text-gray-500">Organizatör: {data.organizer}</p>}
            {data.outcome && <p className="text-gray-600">Sonuç: {data.outcome}</p>}
          </div>
        )}

        {data.signedDocumentUrls?.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">İmzalı belgeler</h3>
            <ul className="space-y-2">
              {data.signedDocumentUrls.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Belge {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2 border-t border-gray-100 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPdfPreview({
                path: `/api/activities/${activityId}/pdf`,
                title: `${data.title} — önizleme`,
              })
            }
          >
            <Eye className="h-4 w-4 mr-2" />
            PDF önizle
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={async () => {
              setActionLoading(true)
              try {
                const res = await fetch(`/api/activities/${activityId}/pdf`, { headers: getAuthHeaders() })
                if (!res.ok) throw new Error("PDF alınamadı")
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `faaliyet-${activityId.slice(0, 8)}.pdf`
                a.click()
                URL.revokeObjectURL(url)
              } catch {
                alert("PDF indirilemedi")
              } finally {
                setActionLoading(false)
              }
            }}
          >
            <FileDown className="h-4 w-4 mr-2" />
            PDF indir
          </Button>
          <Link
            href={`/faaliyet-duzenle/${activityId}`}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 h-9"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Düzenle
          </Link>
          {data.verificationStatus === "IMZA_SURECINDE" && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUploadSigned(e.target.files)}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                İmzalı belge yükle
              </Button>
            </>
          )}
          {data.verificationStatus === "ONAY_BEKLIYOR" && (
            <>
              <Button size="sm" className="bg-emerald-600" disabled={actionLoading} onClick={() => handleVerify(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Onayla
              </Button>
            </>
          )}
          {data.verificationStatus === "ONAYLANDI" && (
            <Button variant="outline" size="sm" disabled={actionLoading} onClick={() => handleVerify(false)}>
              <XCircle className="h-4 w-4 mr-2" />
              Onayı geri al
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-red-600" disabled={actionLoading} onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Kaydı sil
          </Button>
        </div>
      </div>
    </div>
  )
}
