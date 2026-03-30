"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  User,
  Users,
  Clock,
  CheckCircle,
  FileText,
  FileDown,
  Upload,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  MAIN_TYPE_LABELS,
  getSubtypeConfig,
  type ActivityMainType,
} from "@/lib/activity-types-config"
import type { ActivityEventDetail } from "./FaaliyetDetay.shared"

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

export function FaaliyetDetay({ id }: { id: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<ActivityEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPid, setActionPid] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const signedDocRefs: Record<string, HTMLInputElement | null> = {}

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/activity-events/${id}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error((await res.json())?.error || "Yüklenemedi")
      const data = await res.json()
      setEvent(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Faaliyet yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const handleVerify = async (pid: string, approve: boolean) => {
    setActionPid(pid)
    try {
      const res = await fetch(`/api/activity-events/${id}/participants/${pid}/verify`, {
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
      setActionPid(null)
    }
  }

  const handleUploadSigned = async (pid: string, file: File) => {
    setActionPid(pid)
    try {
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
      const { url } = await uploadRes.json()
      if (!url) throw new Error("Yükleme başarısız")

      const participant = event?.participants.find((p) => p.id === pid)
      const existingUrls = participant?.signedDocumentUrls ?? []

      const updateRes = await fetch(`/api/activity-events/${id}/participants/${pid}`, {
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
      setActionPid(null)
    }
  }

  const handleDeleteEvent = async () => {
    if (!confirm("Bu faaliyeti silmek istediğinizden emin misiniz?")) return
    try {
      const res = await fetch(`/api/activity-events/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Silinemedi")
      }
      router.push("/faaliyet-yonetimi")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Silme işlemi başarısız")
    }
  }

  const handleDownloadPdf = async (kind?: "participation" | "achievement") => {
    setPdfLoading(true)
    try {
      const q = kind === "achievement" ? "?kind=achievement" : ""
      const res = await fetch(`/api/activity-events/${id}/pdf${q}`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "PDF alınamadı")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const suffix = kind === "achievement" ? "-basari" : kind === "participation" ? "-katilim" : ""
      a.download = `sertifika-${event?.title?.slice(0, 30) ?? id}${suffix}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF indirilemedi")
    } finally {
      setPdfLoading(false)
    }
  }

  function formatDuration(ev: ActivityEventDetail): string {
    const parts = []
    if (ev.durationYears) parts.push(`${ev.durationYears} Yıl`)
    if (ev.durationMonths) parts.push(`${ev.durationMonths} Ay`)
    if (ev.durationDays) parts.push(`${ev.durationDays} Gün`)
    if (ev.durationHours) parts.push(`${ev.durationHours} Saat`)
    return parts.length ? parts.join(" ") : "—"
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p>{error || "Faaliyet bulunamadı"}</p>
        <Link href="/faaliyet-yonetimi" className="mt-4 text-sm text-indigo-600 underline">
          Geri Dön
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/faaliyet-yonetimi"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Faaliyet Yönetimi
        </Link>
        <div className="flex gap-2 flex-wrap">
          {event.certificateType === "TURNUVA_KATILIM" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPdf("participation")}
                disabled={pdfLoading}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">PDF — Katılım</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPdf("achievement")}
                disabled={pdfLoading}
                className="text-sky-600 border-sky-200 hover:bg-sky-50"
              >
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">PDF — Başarı</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadPdf()}
              disabled={pdfLoading}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">PDF İndir</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteEvent}
            className="text-red-500 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Sil</span>
          </Button>
        </div>
      </div>

      {/* Ana Bilgiler */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-indigo-200 text-sm font-medium mb-1">
              {MAIN_TYPE_LABELS[event.mainType as keyof typeof MAIN_TYPE_LABELS] ?? event.mainType}
              {event.subtype &&
                ` — ${getSubtypeConfig(event.mainType as ActivityMainType, event.subtype)?.label ?? event.subtype.replace(/_/g, " ")}`}
            </div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            {event.description && (
              <p className="mt-2 text-indigo-200 text-sm max-w-xl">{event.description}</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-1.5 text-indigo-200 text-xs mb-1">
              <Calendar className="h-3 w-3" /> Başlangıç
            </div>
            <p className="font-semibold text-sm">
              {new Date(event.startDate).toLocaleDateString("tr-TR")}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-1.5 text-indigo-200 text-xs mb-1">
              <Calendar className="h-3 w-3" /> Bitiş
            </div>
            <p className="font-semibold text-sm">
              {new Date(event.endDate).toLocaleDateString("tr-TR")}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-1.5 text-indigo-200 text-xs mb-1">
              <MapPin className="h-3 w-3" /> Konum
            </div>
            <p className="font-semibold text-sm">{event.location || "—"}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-1.5 text-indigo-200 text-xs mb-1">
              <Clock className="h-3 w-3" /> Süre
            </div>
            <p className="font-semibold text-sm">{formatDuration(event)}</p>
          </div>
        </div>
      </div>

      {/* Detay Kartlar */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" /> Organizatör
          </h3>
          <p className="text-gray-900">{event.organizerName}</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-500" /> Sorumlu Öğretmen
          </h3>
          <p className="text-gray-900">
            {event.teacher.firstName} {event.teacher.lastName}
          </p>
        </div>
        {event.certificateType === "TURNUVA_KATILIM" &&
        typeof (event.metadata as { tournamentTotalParticipants?: number } | null)?.tournamentTotalParticipants ===
          "number" ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Turnuva — Toplam yarışmacı</h3>
            <p className="text-gray-900 text-lg font-semibold">
              {(event.metadata as { tournamentTotalParticipants: number }).tournamentTotalParticipants}
            </p>
            <p className="text-xs text-gray-400 mt-1">Başarı belgesi metninde kullanılan toplam katılımcı sayısı</p>
          </div>
        ) : null}
        {event.outcome && (
          <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Sonuç / Kazanım</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{event.outcome}</p>
          </div>
        )}
        {event.evidenceUrls?.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Kanıtlar</h3>
            <div className="flex flex-wrap gap-2">
              {event.evidenceUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Kanıt {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Katılımcılar */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            Katılımcılar
            <span className="ml-auto rounded-full bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 font-medium">
              {event.participants.length} kişi
            </span>
          </h3>
        </div>

        {event.participants.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400">
            <p className="text-sm">Katılımcı bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {event.participants.map((p) => (
              <div key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    {/* Fotoğraf */}
                    {p.participationPhotoUrl ? (
                      <img
                        src={p.participationPhotoUrl}
                        alt={`${p.student.firstName} katılım`}
                        className="h-16 w-16 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {p.student.firstName} {p.student.lastName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.student.grade} · TC: {p.student.tcNumber}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {p.score != null && (
                          <span className="rounded-full bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5">
                            Puan: {p.score}/100
                          </span>
                        )}
                        {p.languageLevel && (
                          <span className="rounded-full bg-purple-100 text-purple-700 text-xs px-2 py-0.5">
                            Seviye: {p.languageLevel}
                          </span>
                        )}
                        {p.extraDocumentUrl && (
                          <a
                            href={p.extraDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-gray-100 text-gray-600 text-xs px-2 py-0.5 flex items-center gap-1 hover:bg-gray-200"
                          >
                            <ExternalLink className="h-2.5 w-2.5" /> Ek Belge
                          </a>
                        )}
                        {p.tournamentPlacement?.trim() && (
                          <span className="rounded-full bg-cyan-100 text-cyan-800 text-xs px-2 py-0.5 max-w-full line-clamp-2">
                            Derece: {p.tournamentPlacement}
                          </span>
                        )}
                        {p.projectRole?.trim() && (
                          <span className="rounded-full bg-amber-100 text-amber-900 text-xs px-2 py-0.5">
                            Rol: {p.projectRole}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Durum & Aksiyonlar */}
                  <div className="flex flex-col items-end gap-2 min-w-0">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[p.verificationStatus]}`}>
                      {p.verificationStatus === "ONAYLANDI" && <CheckCircle className="h-3 w-3" />}
                      {p.verificationStatus === "ONAY_BEKLIYOR" && <Clock className="h-3 w-3" />}
                      {p.verificationStatus === "IMZA_SURECINDE" && <FileText className="h-3 w-3" />}
                      {STATUS_LABELS[p.verificationStatus]}
                    </span>

                    {p.verifiedBy && (
                      <p className="text-xs text-gray-400">
                        Onaylayan: {p.verifiedBy}
                      </p>
                    )}

                    <div className="flex gap-2 flex-wrap justify-end">
                      <Link
                        href={`/faaliyet-yonetimi/${id}/katilimci/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50"
                      >
                        Katılımcı detayı
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      {p.verificationStatus === "IMZA_SURECINDE" && (
                        <div>
                          <input
                            id={`signed-${p.id}`}
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            ref={(el) => { signedDocRefs[p.id] = el }}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleUploadSigned(p.id, file)
                              e.target.value = ""
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionPid === p.id}
                            onClick={() => document.getElementById(`signed-${p.id}`)?.click()}
                            className="text-slate-600 border-slate-200"
                          >
                            {actionPid === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1.5 text-xs">İmzalı Yükle</span>
                          </Button>
                        </div>
                      )}

                      {p.verificationStatus === "ONAY_BEKLIYOR" && (
                        <Button
                          size="sm"
                          disabled={actionPid === p.id}
                          onClick={() => handleVerify(p.id, true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {actionPid === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1.5 text-xs">Onayla</span>
                        </Button>
                      )}

                      {p.verificationStatus === "ONAYLANDI" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionPid === p.id}
                          onClick={() => handleVerify(p.id, false)}
                          className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        >
                          {actionPid === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1.5 text-xs">Onayı Geri Al</span>
                        </Button>
                      )}
                    </div>

                    {/* İmzalı belgeler */}
                    {p.signedDocumentUrls?.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {p.signedDocumentUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                          >
                            <FileText className="h-3 w-3" /> İmzalı {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
