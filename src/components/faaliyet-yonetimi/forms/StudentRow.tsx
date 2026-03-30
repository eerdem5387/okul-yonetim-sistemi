"use client"

import { useRef, useState } from "react"
import { Upload, X, Loader2, ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LANGUAGE_LEVELS } from "@/lib/activity-types-config"
import {
  assertFileMaxSize,
  CLIENT_MAX_PARTICIPATION_PHOTO_BYTES,
  CLIENT_MAX_PDF_BYTES,
  parseUploadResponse,
} from "@/lib/upload-client"

export interface ParticipantData {
  studentId: string
  studentName: string
  studentGrade: string
  participationPhotoUrl: string
  score: string
  languageLevel: string
  extraDocumentUrl: string
  artworkDescription: string
  /** Turnuva başarı belgesi — derece metni (serbest) */
  tournamentPlacement: string
  /** Proje içerik belgesi — katılımcının rolü */
  projectRole: string
}

interface StudentRowProps {
  participant: ParticipantData
  index: number
  requiresScore: boolean
  requiresLanguageLevel: boolean
  requiresExtraDocument: boolean
  /** Zorunlu olmayan ek belge (PDF) */
  optionalExtraDocument?: boolean
  requiresArtworkDescription?: boolean
  showTournamentPlacement?: boolean
  showParticipantProjectRole?: boolean
  /** false iken katılım fotoğrafı alanı gösterilmez (örn. Proje) */
  requiresParticipationPhoto?: boolean
  /** requiresArtworkDescription iken yükleme alanı etiketi */
  participationPhotoFieldLabel?: string
  /** requiresExtraDocument iken PDF alanı etiketi */
  extraDocumentFieldLabel?: string
  onChange: (updated: ParticipantData) => void
  onRemove: () => void
}

export function StudentRow({
  participant,
  index,
  requiresScore,
  requiresLanguageLevel,
  requiresExtraDocument,
  optionalExtraDocument,
  requiresArtworkDescription,
  showTournamentPlacement,
  showParticipantProjectRole,
  requiresParticipationPhoto = true,
  participationPhotoFieldLabel,
  extraDocumentFieldLabel,
  onChange,
  onRemove,
}: StudentRowProps) {
  const photoRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  function set(field: keyof ParticipantData, value: string) {
    onChange({ ...participant, [field]: value })
  }

  function getHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    const h: Record<string, string> = {}
    if (token) h["Authorization"] = `Bearer ${token}`
    return h
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeErr = assertFileMaxSize(file, CLIENT_MAX_PARTICIPATION_PHOTO_BYTES, "Katılım fotoğrafı")
    if (sizeErr) {
      alert(sizeErr)
      return
    }
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/activity-events/upload?type=participation_photo", {
        method: "POST",
        headers: getHeaders(),
        body: formData,
      })
      const parsed = await parseUploadResponse(res)
      if (parsed.ok && parsed.url) set("participationPhotoUrl", parsed.url)
      else alert(parsed.error || "Fotoğraf yüklenemedi")
    } finally {
      setUploadingPhoto(false)
      if (photoRef.current) photoRef.current.value = ""
    }
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeErr = assertFileMaxSize(file, CLIENT_MAX_PDF_BYTES, "Ek belge")
    if (sizeErr) {
      alert(sizeErr)
      return
    }
    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/activity-events/upload?type=extra_doc", {
        method: "POST",
        headers: getHeaders(),
        body: formData,
      })
      const parsed = await parseUploadResponse(res)
      if (parsed.ok && parsed.url) set("extraDocumentUrl", parsed.url)
      else alert(parsed.error || "Belge yüklenemedi")
    } finally {
      setUploadingDoc(false)
      if (docRef.current) docRef.current.value = ""
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Öğrenci Başlık */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
            {index + 1}
          </span>
          <div>
            <p className="font-semibold text-gray-900">{participant.studentName}</p>
            <p className="text-xs text-gray-400">{participant.studentGrade}</p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Katılımcıyı çıkar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Katılım Fotoğrafı / Eser görseli */}
        {requiresParticipationPhoto && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              {requiresArtworkDescription
                ? participationPhotoFieldLabel ?? "Eser Görseli"
                : "Katılım Fotoğrafı"}{" "}
              <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal"> (maks 3 MB)</span>
            </p>
            {participant.participationPhotoUrl ? (
              <div className="relative group">
                <img
                  src={participant.participationPhotoUrl}
                  alt="Katılım"
                  className="h-24 w-full rounded-lg object-cover border border-gray-200"
                />
                <button
                  onClick={() => set("participationPhotoUrl", "")}
                  className="absolute top-1 right-1 rounded-full bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => photoRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-xs">Fotoğraf yükle</span>
                  </>
                )}
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
        )}

        {/* Puan */}
        {requiresScore && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              Puan (0–100) <span className="text-red-500">*</span>
            </p>
            <Input
              type="number"
              min={0}
              max={100}
              value={participant.score}
              onChange={(e) => set("score", e.target.value)}
              placeholder="örn: 85"
              className="h-10"
            />
          </div>
        )}

        {/* Dil Seviyesi */}
        {requiresLanguageLevel && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              Dil Yeterlilik Seviyesi <span className="text-red-500">*</span>
            </p>
            <select
              value={participant.languageLevel}
              onChange={(e) => set("languageLevel", e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">Seviye seçin</option>
              {LANGUAGE_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        )}

        {/* Eser açıklaması (Görsel Sanatlar Etkinlik) */}
        {requiresArtworkDescription && (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              Artwork Description <span className="text-red-500">*</span>
            </p>
            <Textarea
              value={participant.artworkDescription}
              onChange={(e) => set("artworkDescription", e.target.value)}
              placeholder="Describe the artwork (medium, theme, technique...)"
              rows={3}
              className="resize-y min-h-[72px]"
            />
          </div>
        )}

        {/* Proje — katılımcı rolü */}
        {showParticipantProjectRole && (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              Participant&apos;s Role <span className="text-red-500">*</span>
            </p>
            <Input
              value={participant.projectRole}
              onChange={(e) => set("projectRole", e.target.value)}
              placeholder="örn: Research lead, Presentation designer, Data analyst"
              className="h-10"
            />
          </div>
        )}

        {/* Turnuva derece / sıralama metni */}
        {showTournamentPlacement && (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              Derece / sıralama (Tournament Achievement belgesi için)
              <span className="text-gray-400 font-normal ml-1">— isteğe bağlı; doldurulan öğrenciler için başarı PDF’i üretilir</span>
            </p>
            <Textarea
              value={participant.tournamentPlacement}
              onChange={(e) => set("tournamentPlacement", e.target.value)}
              placeholder='örn: "1st place", "Semi-finalist", "Gold medal — U14 category"'
              rows={2}
              className="resize-y min-h-[56px]"
            />
          </div>
        )}

        {/* Ek Belge */}
        {(requiresExtraDocument || optionalExtraDocument) && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              {extraDocumentFieldLabel ?? "Ek Belge (PDF)"}
              {requiresExtraDocument && <span className="text-red-500"> *</span>}
              {optionalExtraDocument && !requiresExtraDocument && (
                <span className="text-gray-400 font-normal"> (isteğe bağlı)</span>
              )}
            </p>
            {participant.extraDocumentUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="flex-1 truncate text-xs text-gray-600">
                  {participant.extraDocumentUrl.split("/").pop()}
                </span>
                <button onClick={() => set("extraDocumentUrl", "")} className="text-gray-400 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => docRef.current?.click()}
                disabled={uploadingDoc}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> PDF yükle</>}
              </button>
            )}
            <input ref={docRef} type="file" accept=".pdf" className="hidden" onChange={handleDocUpload} />
          </div>
        )}
      </div>
    </div>
  )
}
