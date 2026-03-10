"use client"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Trash2, Upload, Loader2, ImageIcon } from "lucide-react"

const PARTICIPATION_PHOTO_MAX_MB = 5
import {
  CATEGORY_LABELS,
  getPrincipalByGrade,
  getAchievementLevel,
  formatAchievementText,
} from "@/lib/ib-activity-config"
import type { CategoryId } from "@/lib/ib-activity-config"
import type { FaaliyetCommon, ParticipantRow } from "@/types/ib-activity-form"

interface ParticipantsStepProps {
  category: CategoryId
  common: FaaliyetCommon
  teacherId: string
  teacherName: string
  participants: ParticipantRow[]
  teacherOptions: Array<{ id: string; label: string }>
  studentOptions: Array<{ id: string; label: string; grade: string; tcNumber: string }>
  onCommonChange: (common: FaaliyetCommon) => void
  onTeacherChange: (id: string, name: string) => void
  onParticipantsChange: (participants: ParticipantRow[]) => void
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  /** Düzenleme modu: tek katılımcı, tarih salt okunur, katılımcı ekleme/çıkarma gizli */
  editMode?: boolean
  /** Gönder butonu metni (editMode için "Güncelle") */
  submitLabel?: string
}

export function ParticipantsStep({
  category,
  common,
  teacherId,
  teacherName,
  participants,
  teacherOptions,
  studentOptions,
  onCommonChange,
  onTeacherChange,
  onParticipantsChange,
  onBack,
  onSubmit,
  submitting,
  editMode = false,
  submitLabel,
}: ParticipantsStepProps) {
  const [participantSearch, setParticipantSearch] = useState("")

  const setParticipant = (index: number, row: Partial<ParticipantRow>) => {
    const next = [...participants]
    next[index] = { ...next[index], ...row }
    onParticipantsChange(next)
  }

  const removeParticipant = (index: number) => {
    if (editMode && participants.length <= 1) return
    onParticipantsChange(participants.filter((_, i) => i !== index))
  }

  const addedIds = useMemo(() => new Set(participants.map((p) => p.studentId).filter(Boolean)), [participants])
  const filteredStudents = useMemo(() => {
    const q = participantSearch.trim().toLowerCase()
    return studentOptions.filter(
      (s) => !addedIds.has(s.id) && (q === "" || s.label.toLowerCase().includes(q))
    )
  }, [studentOptions, addedIds, participantSearch])

  const addStudent = (id: string) => {
    const s = studentOptions.find((o) => o.id === id)
    if (!s || addedIds.has(id)) return
    onParticipantsChange([
      ...participants,
      {
        studentId: s.id,
        studentName: s.label,
        tcNumber: s.tcNumber,
        grade: s.grade,
        successScore: "",
        achievementLevel: "",
        personalDescription: "",
      },
    ])
    setParticipantSearch("")
  }

  const [uploadingForIndex, setUploadingForIndex] = useState<number | null>(null)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const evidenceFileInputRef = useRef<HTMLInputElement | null>(null)

  const isImageUrl = (url: string) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) || /blob\.vercel-storage\.com.*\.(jpe?g|png|gif|webp)/i.test(url)

  const handleEvidenceFile = async (file: File) => {
    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      alert("Dosya en fazla 10 MB olabilir.")
      return
    }
    setUploadingEvidence(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const res = await fetch("/api/activities/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Yükleme başarısız")
      if (data.url) onCommonChange({ ...common, evidence: data.url })
    } catch (e) {
      alert(e instanceof Error ? e.message : "Kanıt yüklenirken hata oluştu.")
    } finally {
      setUploadingEvidence(false)
      if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = ""
    }
  }

  const handleParticipationPhoto = async (index: number, file: File) => {
    const maxBytes = PARTICIPATION_PHOTO_MAX_MB * 1024 * 1024
    if (file.size > maxBytes) {
      alert(`Fotoğraf en fazla ${PARTICIPATION_PHOTO_MAX_MB} MB olabilir.`)
      return
    }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowed.includes(file.type)) {
      alert("Sadece resim dosyası (JPG, PNG, GIF, WebP) yükleyebilirsiniz.")
      return
    }
    setUploadingForIndex(index)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const res = await fetch("/api/activities/upload?type=participation", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Yükleme başarısız")
      if (data.url) {
        setParticipant(index, { participationPhotoUrl: data.url })
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Fotoğraf yüklenirken hata oluştu.")
    } finally {
      setUploadingForIndex(null)
    }
  }

  const needsScore = category === "egitim" || category === "yarisma"

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="self-start sm:self-center -ml-2 min-h-[44px] min-w-[44px] touch-manipulation">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Geri
        </Button>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
          Katılımcılar ve ortak bilgiler · {CATEGORY_LABELS[category]}
        </h2>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div>
            <Label>Başlık *</Label>
            <Input
              value={common.title}
              onChange={(e) => onCommonChange({ ...common, title: e.target.value })}
              placeholder="Faaliyet başlığı"
              className="mt-1.5 min-h-[44px] touch-manipulation"
            />
          </div>
          {!editMode && (
            <>
              <div>
                <Label>Katılımcı Seçimi *</Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  Arama kutusuna yazarak öğrenci arayın; listeden tıklayarak birden fazla katılımcı ekleyin.
                </p>
                <Input
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Öğrenci ara (klavye ile)"
                  className="mb-2 min-h-[44px] touch-manipulation"
                />
                {filteredStudents.length > 0 && (
                  <ul className="border border-gray-200 rounded-lg max-h-52 sm:max-h-48 overflow-y-auto divide-y divide-gray-100 overscroll-contain">
                    {filteredStudents.slice(0, 50).map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 sm:py-2.5 text-sm hover:bg-gray-50 focus:bg-gray-50 active:bg-gray-100 touch-manipulation min-h-[48px] sm:min-h-0"
                          onClick={() => addStudent(s.id)}
                        >
                          {s.label}
                          {s.grade && <span className="text-gray-500 ml-2">({s.grade})</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {participantSearch.trim() && filteredStudents.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">Eşleşen öğrenci yok veya zaten eklendi.</p>
                )}
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <Label>Başlangıç Tarihi * (dd.mm.yyyy)</Label>
                  <Input
                    type="date"
                    value={common.startDate}
                    onChange={(e) => onCommonChange({ ...common, startDate: e.target.value })}
                    className="mt-1.5 min-h-[44px] touch-manipulation"
                  />
                </div>
                <div>
                  <Label>Bitiş Tarihi * (dd.mm.yyyy)</Label>
                  <Input
                    type="date"
                    value={common.endDate}
                    onChange={(e) => onCommonChange({ ...common, endDate: e.target.value })}
                    className="mt-1.5 min-h-[44px] touch-manipulation"
                  />
                </div>
              </div>
            </>
          )}
          {editMode && (
            <>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <Label>Faaliyet tarihi</Label>
                  <Input type="date" value={common.startDate} readOnly className="mt-1.5 min-h-[44px] bg-gray-50" />
                </div>
                <div className="sm:col-span-1" />
              </div>
              <div>
                <Label>Konum</Label>
                <Input
                  value={common.location ?? ""}
                  onChange={(e) => onCommonChange({ ...common, location: e.target.value })}
                  placeholder="Faaliyet konumu"
                  className="mt-1.5 min-h-[44px]"
                />
              </div>
              <div>
                <Label>Süre (dakika)</Label>
                <Input
                  type="number"
                  min={0}
                  value={common.duration ?? ""}
                  onChange={(e) => onCommonChange({ ...common, duration: e.target.value })}
                  placeholder="Örn: 90"
                  className="mt-1.5 min-h-[44px]"
                />
              </div>
              <div>
                <Label>Sonuç / Kazanım</Label>
                <Input
                  value={common.outcome ?? ""}
                  onChange={(e) => onCommonChange({ ...common, outcome: e.target.value })}
                  placeholder="Faaliyet sonucu veya kazanım"
                  className="mt-1.5 min-h-[44px]"
                />
              </div>
              <div>
                <Label>Kanıt (link veya dosya)</Label>
                {common.evidence ? (
                  <div className="mt-1.5 space-y-2">
                    {isImageUrl(common.evidence) ? (
                      <div className="flex flex-wrap items-start gap-3">
                        <a
                          href={common.evidence}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg border border-gray-200 overflow-hidden bg-gray-50 shrink-0"
                        >
                          <img
                            src={common.evidence}
                            alt="Kanıt önizleme"
                            className="h-28 w-28 sm:h-36 sm:w-36 object-cover"
                          />
                        </a>
                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                          <p className="text-xs text-gray-500 truncate max-w-full" title={common.evidence}>
                            {common.evidence}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => onCommonChange({ ...common, evidence: "" })}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Sil
                            </Button>
                            <input
                              ref={evidenceFileInputRef}
                              type="file"
                              accept=".pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleEvidenceFile(f)
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingEvidence}
                              onClick={() => evidenceFileInputRef.current?.click()}
                            >
                              {uploadingEvidence ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                              {uploadingEvidence ? "Yükleniyor…" : "Yenisi yükle"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          value={common.evidence}
                          onChange={(e) => onCommonChange({ ...common, evidence: e.target.value })}
                          placeholder="https://..."
                          className="min-h-[44px]"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => onCommonChange({ ...common, evidence: "" })}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Sil
                          </Button>
                          <input
                            ref={evidenceFileInputRef}
                            type="file"
                            accept=".pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleEvidenceFile(f)
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingEvidence}
                            onClick={() => evidenceFileInputRef.current?.click()}
                          >
                            {uploadingEvidence ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                            {uploadingEvidence ? "Yükleniyor…" : "Dosya yükle"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    <Input
                      value={common.evidence ?? ""}
                      onChange={(e) => onCommonChange({ ...common, evidence: e.target.value })}
                      placeholder="URL yapıştırın veya aşağıdan dosya yükleyin"
                      className="min-h-[44px]"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        ref={evidenceFileInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleEvidenceFile(f)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingEvidence}
                        onClick={() => evidenceFileInputRef.current?.click()}
                      >
                        {uploadingEvidence ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                        {uploadingEvidence ? "Yükleniyor…" : "Dosya yükle"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          <div>
            <Label>Organizatör / Eğitmen</Label>
            <Input
              value={common.organizer}
              onChange={(e) => onCommonChange({ ...common, organizer: e.target.value })}
              placeholder="Ad Soyad"
              className="mt-1.5 min-h-[44px] touch-manipulation"
            />
          </div>
          <div>
            <Label>Açıklama, Sonuç ve Kazanım</Label>
            <textarea
              className="mt-1.5 w-full min-h-[100px] sm:min-h-[80px] rounded-md border border-gray-200 px-3 py-2.5 text-sm touch-manipulation"
              value={common.description}
              onChange={(e) => onCommonChange({ ...common, description: e.target.value })}
              placeholder="Kısa açıklama"
            />
          </div>
          {(category === "egitim" || category === "yarisma") && (
            <div>
              <Label>Öğretmen (belgelerde imza){teacherName ? `: ${teacherName}` : ""}</Label>
              <select
                className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm min-h-[44px] touch-manipulation"
                value={teacherId}
                onChange={(e) => {
                  const opt = teacherOptions.find((o) => o.id === e.target.value)
                  onTeacherChange(e.target.value, opt?.label ?? "")
                }}
              >
                <option value="">Seçiniz...</option>
                {teacherOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {participants.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Seçilen katılımcılar ({participants.length})</h3>
          <p className="text-xs text-gray-500 mb-3">
            Her öğrenci için faaliyete katılımı kanıtlayan bir fotoğraf yükleyin (maks. {PARTICIPATION_PHOTO_MAX_MB} MB, JPG/PNG/GIF/WebP).
          </p>
          <div className="space-y-2 sm:space-y-3">
            {participants.map((row, index) => (
              <Card key={row.studentId} className="overflow-hidden">
                <CardContent className="p-4 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="font-medium text-gray-900 break-words">{row.studentName}</p>
                      {row.grade && (
                        <p className="text-gray-500 text-xs sm:text-sm">
                          Müdür: {getPrincipalByGrade(row.grade)}
                        </p>
                      )}
                      {needsScore && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Başarı puanı (1–100)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              className="w-20 h-10 sm:h-8 text-sm touch-manipulation"
                              value={row.successScore === "" ? "" : row.successScore}
                              onChange={(e) => {
                                const v = e.target.value === "" ? "" : parseInt(e.target.value, 10)
                                const score = v === "" ? "" : Math.min(100, Math.max(0, Number(v) || 0))
                                setParticipant(index, {
                                  successScore: score,
                                  achievementLevel: score !== "" ? getAchievementLevel(score) : "",
                                })
                              }}
                            />
                          </div>
                          {row.successScore !== "" && (
                            <span className="text-xs sm:text-sm text-gray-600 block sm:inline">
                              {formatAchievementText(Number(row.successScore))}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Katılım kanıt fotoğrafı (tüm faaliyet türleri) */}
                      <div className="pt-2 border-t border-gray-100">
                        <Label className="text-xs text-gray-500">Katılım kanıt fotoğrafı (max {PARTICIPATION_PHOTO_MAX_MB} MB)</Label>
                        <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                          <input
                            ref={(el) => { fileInputRefs.current[index] = el }}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleParticipationPhoto(index, f)
                              e.target.value = ""
                            }}
                          />
                          {row.participationPhotoUrl ? (
                            <>
                              <a
                                href={row.participationPhotoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                              >
                                <ImageIcon className="h-4 w-4" />
                                Fotoğraf yüklendi
                              </a>
                              <img
                                src={row.participationPhotoUrl}
                                alt="Katılım"
                                className="h-14 w-14 object-cover rounded border border-gray-200"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 h-8"
                                onClick={() => setParticipant(index, { participationPhotoUrl: undefined })}
                              >
                                Kaldır
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-[36px]"
                              disabled={uploadingForIndex === index}
                              onClick={() => fileInputRefs.current[index]?.click()}
                            >
                              {uploadingForIndex === index ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                              ) : (
                                <Upload className="h-4 w-4 mr-1.5" />
                              )}
                              {uploadingForIndex === index ? "Yükleniyor…" : "Fotoğraf yükle"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {(!editMode || participants.length > 1) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 shrink-0 self-start sm:self-center min-h-[44px] min-w-[44px] touch-manipulation"
                        onClick={() => removeParticipant(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {participants.length === 0 && (
        <p className="text-sm text-gray-500">Öğrenci arama kutusundan en az bir katılımcı ekleyin.</p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 pt-4 sticky sm:static bottom-0 left-0 right-0 bg-white/95 backdrop-blur py-3 sm:py-0 -mx-4 px-4 sm:mx-0 sm:px-0 border-t border-gray-200 sm:border-0">
        <Button
          onClick={onSubmit}
          disabled={submitting || participants.length === 0}
          className="w-full sm:w-auto min-h-[48px] touch-manipulation"
        >
          {submitting ? (editMode ? "Güncelleniyor…" : "Kaydediliyor…") : (submitLabel ?? "Kaydet")}
        </Button>
        <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto min-h-[48px] touch-manipulation">
          Geri
        </Button>
      </div>
    </div>
  )
}
