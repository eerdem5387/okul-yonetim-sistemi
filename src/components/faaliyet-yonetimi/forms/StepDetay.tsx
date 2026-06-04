"use client"

import { useRef, useState } from "react"
import { Upload, X, BookOpen, ChevronDown, ChevronUp, FileText, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DURATION_OPTIONS,
  getPrincipalByGrade,
  type MufredatHafta,
  type FormVariant,
} from "@/lib/activity-types-config"
import { formatMufredatWeekLabel } from "@/lib/mufredat-pdf"
import {
  PROJE_DOCUMENT_STATEMENT,
  PROJE_PROGRAMME_DURATION_WEEKS,
} from "@/lib/mufredatlar/proje-icerik"
import {
  assertFileMaxSize,
  CLIENT_MAX_EVIDENCE_IMAGE_BYTES,
  CLIENT_MAX_EVIDENCE_VIDEO_BYTES,
  parseUploadResponse,
} from "@/lib/upload-client"

export interface StepDetayData {
  title: string
  description: string
  outcome: string
  startDate: string
  endDate: string
  location: string
  organizerName: string
  durationHours: string
  durationDays: string
  durationMonths: string
  durationYears: string
  evidenceUrls: string[]
  teacherId: string
  // Gezi'ye özgü ek alanlar
  geziTuru: string
  geziProgrami: string
  ulasimTuru: string
  // Görsel Sanatlar'a özgü ek alanlar
  numberOfArtworks: string
  vicePrincipalName: string
  /** Turnuva: toplam yarışmacı sayısı (başarı belgesi metni) */
  tournamentTotalParticipants: string
  /** Proje içerik belgesi — Project Purpose */
  projectPurpose: string
  /** Proje sertifikası — başarı düzeyi ifadesi (örn. Excellent, Proficient) */
  projectAchievementLevel: string
}

interface Teacher {
  id: string
  firstName: string
  lastName: string
}

interface StepDetayProps {
  data: StepDetayData
  onChange: (data: StepDetayData) => void
  teachers: Teacher[]
  subtypeLabel: string
  mufredat?: MufredatHafta[]
  mufredatBaslik?: string
  formVariant?: FormVariant
  showGeziTuru?: boolean
  showGeziProgrami?: boolean
  showUlasimTuru?: boolean
  showNumberOfArtworks?: boolean
  showVicePrincipal?: boolean
  showTournamentTotalParticipants?: boolean
  activityTitleLabel?: string
  activityTitlePlaceholder?: string
  descriptionFieldLabel?: string
  descriptionPlaceholder?: string
  projectDocumentPreview?: boolean
  showProjectPurpose?: boolean
  showProjectAchievementLevel?: boolean
  requireProjectOutcome?: boolean
  outcomeFieldLabel?: string
  outcomePlaceholder?: string
  /** Proje belgesi önizlemesi — 2. adımdan gelen katılımcılar */
  projectPreviewParticipants?: { name: string; tcNumber: string; projectRole: string; grade: string }[]
  onNext: () => void
}

export function StepDetay({
  data,
  onChange,
  teachers,
  subtypeLabel,
  mufredat,
  mufredatBaslik,
  formVariant,
  showGeziTuru,
  showGeziProgrami,
  showUlasimTuru,
  showNumberOfArtworks,
  showVicePrincipal,
  showTournamentTotalParticipants,
  activityTitleLabel,
  activityTitlePlaceholder,
  descriptionFieldLabel,
  descriptionPlaceholder,
  projectDocumentPreview,
  showProjectPurpose,
  showProjectAchievementLevel,
  requireProjectOutcome,
  outcomeFieldLabel,
  outcomePlaceholder,
  projectPreviewParticipants,
  onNext,
}: StepDetayProps) {
  const isGezi = formVariant === "gezi"
  const titleFieldLabel = isGezi ? "Gezi Başlığı" : activityTitleLabel ?? "Eğitim Başlığı"
  const titleFieldPlaceholder = isGezi
    ? "örn: Ankara Bilim Merkezi Gezisi 2025"
    : activityTitlePlaceholder ?? `${subtypeLabel} Eğitimi — örn: 2024-2025 Bahar Dönemi`
  const evidenceRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [mufredatAcik, setMufredatAcik] = useState(false)
  const [projeDocAcik, setProjeDocAcik] = useState(false)

  const principalForPreview =
    projectPreviewParticipants && projectPreviewParticipants.length > 0
      ? getPrincipalByGrade(projectPreviewParticipants[0].grade)
      : "—"

  const selectedTeacher = teachers.find((t) => t.id === data.teacherId)
  const teacherPreviewName = selectedTeacher
    ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
    : "—"

  function formatPreviewDate(d: string): string {
    if (!d?.trim()) return "—"
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return d
    }
  }

  function set(field: keyof StepDetayData, value: string | string[]) {
    onChange({ ...data, [field]: value })
  }

  async function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    const headers: Record<string, string> = {}
    if (token) headers["Authorization"] = `Bearer ${token}`

    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const isVideo = f.type.startsWith("video/")
        const maxB = isVideo ? CLIENT_MAX_EVIDENCE_VIDEO_BYTES : CLIENT_MAX_EVIDENCE_IMAGE_BYTES
        const label = isVideo ? "Video kanıtı" : "Görsel kanıt"
        const sizeErr = assertFileMaxSize(f, maxB, label)
        if (sizeErr) {
          alert(sizeErr)
          continue
        }
        const formData = new FormData()
        formData.append("file", f)
        const res = await fetch("/api/activity-events/upload?type=evidence", {
          method: "POST",
          headers,
          body: formData,
        })
        const parsed = await parseUploadResponse(res)
        if (parsed.ok && parsed.url) newUrls.push(parsed.url)
        else alert(parsed.error || "Yükleme başarısız")
      }
      set("evidenceUrls", [...data.evidenceUrls, ...newUrls])
    } finally {
      setUploading(false)
      if (evidenceRef.current) evidenceRef.current.value = ""
    }
  }

  function removeEvidence(url: string) {
    set("evidenceUrls", data.evidenceUrls.filter((u) => u !== url))
  }

  const isValid =
    data.title.trim() &&
    data.description.trim() &&
    data.organizerName.trim() &&
    data.startDate &&
    data.endDate &&
    data.location.trim() &&
    data.teacherId &&
    (!isGezi || !showGeziTuru || data.geziTuru.trim()) &&
    (!showVicePrincipal || data.vicePrincipalName.trim()) &&
    (!showTournamentTotalParticipants ||
      (data.tournamentTotalParticipants.trim() !== "" &&
        !isNaN(parseInt(data.tournamentTotalParticipants, 10)) &&
        parseInt(data.tournamentTotalParticipants, 10) > 0)) &&
    (!showProjectPurpose || data.projectPurpose.trim()) &&
    (!showProjectAchievementLevel || data.projectAchievementLevel.trim()) &&
    (!requireProjectOutcome || data.outcome.trim()) &&
    (!showNumberOfArtworks ||
      (data.numberOfArtworks.trim() !== "" &&
        !isNaN(parseInt(data.numberOfArtworks, 10)) &&
        parseInt(data.numberOfArtworks, 10) > 0))

  return (
    <div className="space-y-6">
      {/* Müfredat Önizleme */}
      {mufredat && mufredat.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
          {/* Başlık + Aç/Kapat */}
          <button
            type="button"
            onClick={() => setMufredatAcik((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-100/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700">Müfredat Önizlemesi</span>
              <span className="rounded-full bg-indigo-200 text-indigo-700 text-xs px-2 py-0.5 font-medium">
                {mufredat.length} Hafta
              </span>
            </div>
            {mufredatAcik
              ? <ChevronUp className="h-4 w-4 text-indigo-500" />
              : <ChevronDown className="h-4 w-4 text-indigo-500" />
            }
          </button>

          {mufredatAcik && (
            <div className="border-t border-indigo-200">
              {/* Başlık Satırı */}
              {mufredatBaslik && (
                <div className="px-4 py-2 bg-indigo-700 text-white text-xs font-semibold tracking-wide text-center">
                  {mufredatBaslik}
                </div>
              )}
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-indigo-100 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-indigo-700 w-14">Hafta</th>
                      <th className="px-3 py-2 text-left font-semibold text-indigo-700 w-36">Konu</th>
                      <th className="px-3 py-2 text-left font-semibold text-indigo-700 w-52">İçerik</th>
                      <th className="px-3 py-2 text-left font-semibold text-indigo-700">Hedef</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mufredat.map((row, i) => (
                      <>
                        {row.ay && (
                          <tr key={`ay-${i}`}>
                            <td colSpan={4} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider">
                              {row.ay}
                            </td>
                          </tr>
                        )}
                        <tr key={`row-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/40"}>
                          <td className="px-3 py-2 font-semibold text-indigo-700 align-top whitespace-nowrap">
                            {formatMufredatWeekLabel(row.hafta)}
                          </td>
                          <td className="px-3 py-2 text-gray-800 align-top font-medium">{row.konu}</td>
                          <td className="px-3 py-2 text-gray-700 align-top">{row.icerik}</td>
                          <td className="px-3 py-2 text-gray-600 align-top leading-relaxed">{row.hedef}</td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {projectDocumentPreview && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setProjeDocAcik((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-800" />
              <span className="text-sm font-semibold text-amber-950">
                Proje İçerik Belgesi Önizlemesi
              </span>
              <span className="rounded-full bg-amber-200/80 text-amber-900 text-xs px-2 py-0.5 font-medium">
                docx ile uyumlu
              </span>
            </div>
            {projeDocAcik ? (
              <ChevronUp className="h-4 w-4 text-amber-700" />
            ) : (
              <ChevronDown className="h-4 w-4 text-amber-700" />
            )}
          </button>

          {projeDocAcik && (
            <div className="border-t border-amber-200 bg-white px-4 py-4 text-xs text-slate-800 max-h-[520px] overflow-y-auto space-y-4 leading-relaxed">
              <div className="text-center space-y-1">
                <div className="font-bold tracking-wide text-amber-950 uppercase text-[11px]">
                  Levent College IB Programme
                </div>
                <div className="font-semibold text-amber-900">Project Document</div>
              </div>

              <dl className="grid gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Programme Name
                  </dt>
                  <dd>IB Diploma Programme / Career-related Programme</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Programme Duration
                  </dt>
                  <dd>{PROJE_PROGRAMME_DURATION_WEEKS} weeks</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Project Period
                  </dt>
                  <dd>
                    {formatPreviewDate(data.startDate)} — {formatPreviewDate(data.endDate)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Project Title
                  </dt>
                  <dd className="font-medium">{data.title.trim() || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Requested By / Organizing Body
                  </dt>
                  <dd>{data.organizerName.trim() || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Project Leader (Teacher)
                  </dt>
                  <dd>{teacherPreviewName}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Principal
                  </dt>
                  <dd>{principalForPreview}</dd>
                </div>
                {showVicePrincipal && (
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                      Vice Principal
                    </dt>
                    <dd>{data.vicePrincipalName.trim() || "—"}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Project Purpose
                  </dt>
                  <dd className="whitespace-pre-wrap">{data.projectPurpose.trim() || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    Project Description
                  </dt>
                  <dd className="whitespace-pre-wrap">{data.description.trim() || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">
                    {outcomeFieldLabel ?? "Expected Outcomes"}
                  </dt>
                  <dd className="whitespace-pre-wrap">{data.outcome.trim() || "—"}</dd>
                </div>
              </dl>

              <div>
                <p className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide mb-2">
                  Participants
                </p>
                {projectPreviewParticipants && projectPreviewParticipants.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-amber-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-amber-50 text-[10px] uppercase text-amber-950">
                          <th className="px-2 py-2 font-semibold">Name &amp; Surname</th>
                          <th className="px-2 py-2 font-semibold">TR ID</th>
                          <th className="px-2 py-2 font-semibold">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectPreviewParticipants.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-amber-50/30"}>
                            <td className="px-2 py-2 border-t border-amber-100">{row.name || "—"}</td>
                            <td className="px-2 py-2 border-t border-amber-100 font-mono text-[11px]">
                              {row.tcNumber || "—"}
                            </td>
                            <td className="px-2 py-2 border-t border-amber-100">
                              {row.projectRole?.trim() || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic py-2">
                    Katılımcılar 2. adımda eklendikten sonra tablo burada güncellenir. Geri dönüp
                    kontrol edebilirsiniz.
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-amber-50/80 border border-amber-100 p-3 text-[11px] text-slate-700">
                <p className="font-semibold text-amber-900 mb-1">Project Document Statement</p>
                <p>{PROJE_DOCUMENT_STATEMENT}</p>
              </div>

              <div className="flex flex-wrap gap-8 pt-2 border-t border-dashed border-amber-200 text-[10px] text-slate-500">
                <div>
                  <div className="h-px w-32 bg-slate-300 mb-1" />
                  Principal signature
                </div>
                <div>
                  <div className="h-px w-32 bg-slate-300 mb-1" />
                  Vice Principal signature
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Başlık */}
        <div className="sm:col-span-2">
          <Label htmlFor="title" className="text-sm font-medium">
            {titleFieldLabel} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={titleFieldPlaceholder}
            className="mt-1.5"
          />
        </div>

        {/* Gezi Türü */}
        {showGeziTuru && (
          <div>
            <Label className="text-sm font-medium">
              Gezi Türü <span className="text-red-500">*</span>
            </Label>
            <select
              value={data.geziTuru}
              onChange={(e) => set("geziTuru", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Gezi türü seçin...</option>
              <option value="Müze">Müze</option>
              <option value="Bilim Merkezi">Bilim Merkezi</option>
              <option value="Doğa / Kamp">Doğa / Kamp</option>
              <option value="Kültürel Mekân">Kültürel Mekân</option>
              <option value="Fabrika / Atölye">Fabrika / Atölye</option>
              <option value="Spor Tesisi">Spor Tesisi</option>
              <option value="Yurt Dışı">Yurt Dışı</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
        )}

        {/* Ulaşım Türü */}
        {showUlasimTuru && (
          <div>
            <Label className="text-sm font-medium">Ulaşım Türü</Label>
            <select
              value={data.ulasimTuru}
              onChange={(e) => set("ulasimTuru", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Seçiniz</option>
              <option value="Otobüs">Otobüs</option>
              <option value="Tren">Tren</option>
              <option value="Uçak">Uçak</option>
              <option value="Yürüyüş">Yürüyüş</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
        )}

        {/* Başlangıç Tarihi */}
        <div>
          <Label className="text-sm font-medium">
            Başlangıç Tarihi <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            value={data.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className="mt-1.5"
          />
        </div>

        {/* Bitiş Tarihi */}
        <div>
          <Label className="text-sm font-medium">
            Bitiş Tarihi <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            value={data.endDate}
            onChange={(e) => set("endDate", e.target.value)}
            className="mt-1.5"
          />
        </div>

        {/* Konum */}
        <div>
          <Label className="text-sm font-medium">
            {isGezi ? "Gidilen Yer / Konum" : "Konum"} <span className="text-red-500">*</span>
          </Label>
          <Input
            value={data.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder={isGezi ? "örn: Ankara Bilim Merkezi" : "örn: Levent Koleji, B Blok Derslik 3"}
            className="mt-1.5"
          />
        </div>

        {/* Organizatör */}
        <div>
          <Label className="text-sm font-medium">
            Organizatör / Kurum <span className="text-red-500">*</span>
          </Label>
          <Input
            value={data.organizerName}
            onChange={(e) => set("organizerName", e.target.value)}
            placeholder="Faaliyeti düzenleyen kurum adı"
            className="mt-1.5"
          />
        </div>

        {/* Süre */}
        <div className="sm:col-span-2">
          <Label className="text-sm font-medium">Süre</Label>
          {isGezi ? (
            // Gezi için sadece Gün
            <div className="grid grid-cols-2 gap-2 mt-1.5 sm:grid-cols-4">
              <select
                value={data.durationDays}
                onChange={(e) => set("durationDays", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Gün</option>
                {DURATION_OPTIONS.days.map((d) => (
                  <option key={d} value={d}>{d} Gün</option>
                ))}
              </select>
            </div>
          ) : (
            // Eğitim için 4 dropdown
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              <div>
                <select
                  value={data.durationHours}
                  onChange={(e) => set("durationHours", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Saat</option>
                  {DURATION_OPTIONS.hours.map((h) => (
                    <option key={h} value={h}>{h} Saat</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={data.durationDays}
                  onChange={(e) => set("durationDays", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Gün</option>
                  {DURATION_OPTIONS.days.map((d) => (
                    <option key={d} value={d}>{d} Gün</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={data.durationMonths}
                  onChange={(e) => set("durationMonths", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Ay</option>
                  {DURATION_OPTIONS.months.map((m) => (
                    <option key={m} value={m}>{m} Ay</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={data.durationYears}
                  onChange={(e) => set("durationYears", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Yıl</option>
                  {DURATION_OPTIONS.years.map((y) => (
                    <option key={y} value={y}>{y} Yıl</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Turnuva: toplam yarışmacı */}
        {showTournamentTotalParticipants && (
          <div className="sm:col-span-2">
            <Label className="text-sm font-medium">
              Turnuvadaki toplam yarışmacı sayısı{" "}
              <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal text-xs ml-1">
                (Certificate of Achievement metninde kullanılır)
              </span>
            </Label>
            <Input
              type="number"
              min={1}
              value={data.tournamentTotalParticipants}
              onChange={(e) => set("tournamentTotalParticipants", e.target.value)}
              placeholder="örn: 24"
              className="mt-1.5 max-w-xs"
            />
          </div>
        )}

        {/* Açıklama */}
        <div className="sm:col-span-2">
          <Label className="text-sm font-medium">
            {descriptionFieldLabel
              ? descriptionFieldLabel
              : isGezi
                ? "Gezi Açıklaması"
                : "Açıklama / Eğitim İçeriği"}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={data.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={
              descriptionPlaceholder
                ? descriptionPlaceholder
                : isGezi
                  ? "Gezinin amacını ve kapsamını kısaca açıklayın..."
                  : "Eğitimin içeriğini, amacını ve kapsamını açıklayın..."
            }
            rows={3}
            className="mt-1.5"
          />
        </div>

        {showProjectPurpose && (
          <div className="sm:col-span-2">
            <Label htmlFor="projectPurpose" className="text-sm font-medium">
              Project Purpose <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="projectPurpose"
              value={data.projectPurpose}
              onChange={(e) => set("projectPurpose", e.target.value)}
              placeholder="Why this project; alignment with IB aims and learner profile…"
              rows={3}
              className="mt-1.5"
            />
          </div>
        )}

        {/* Gezi Programı */}
        {showGeziProgrami && (
          <div className="sm:col-span-2">
            <Label className="text-sm font-medium">Gezi Programı / Gündem</Label>
            <Textarea
              value={data.geziProgrami}
              onChange={(e) => set("geziProgrami", e.target.value)}
              placeholder="Örn:&#10;09:00 — Okul çıkışı&#10;10:30 — Müze girişi&#10;12:00 — Öğle molası&#10;14:00 — Rehberli tur&#10;16:00 — Dönüş"
              rows={5}
              className="mt-1.5 font-mono text-sm"
            />
          </div>
        )}

        {/* Sonuç / Kazanım — proje: Expected Outcomes */}
        <div className="sm:col-span-2">
          <Label htmlFor="outcome" className="text-sm font-medium">
            {outcomeFieldLabel
              ? outcomeFieldLabel
              : isGezi
                ? "Amaç / Kazanım"
                : "Sonuç / Kazanım"}
            {requireProjectOutcome && <span className="text-red-500"> *</span>}
          </Label>
          {requireProjectOutcome ? (
            <Textarea
              id="outcome"
              value={data.outcome}
              onChange={(e) => set("outcome", e.target.value)}
              placeholder={
                outcomePlaceholder ??
                (isGezi
                  ? "Bu geziden öğrencilerin ne kazanması bekleniyor?"
                  : "Bu eğitimden beklenen sonuç veya kazanım...")
              }
              rows={4}
              className="mt-1.5"
            />
          ) : (
            <Input
              id="outcome"
              value={data.outcome}
              onChange={(e) => set("outcome", e.target.value)}
              placeholder={
                outcomePlaceholder ??
                (isGezi
                  ? "Bu geziden öğrencilerin ne kazanması bekleniyor?"
                  : "Bu eğitimden beklenen sonuç veya kazanım...")
              }
              className="mt-1.5"
            />
          )}
        </div>

        {showProjectAchievementLevel && (
          <div className="sm:col-span-2">
            <Label htmlFor="projectAchievementLevel" className="text-sm font-medium">
              Achievement level (sertifika metninde kullanılır){" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="projectAchievementLevel"
              value={data.projectAchievementLevel}
              onChange={(e) => set("projectAchievementLevel", e.target.value)}
              placeholder="örn: Excellent, Proficient, Standard Achieved"
              className="mt-1.5 max-w-md"
            />
            <p className="text-xs text-slate-500 mt-1">
              İngilizce kısa ifade; sertifikadaki “rated as ___” cümlesine yazılır.
            </p>
          </div>
        )}

        {/* Eser Sayısı (Görsel Sanatlar) */}
        {showNumberOfArtworks && (
          <div>
            <Label className="text-sm font-medium">
              Number of Artworks <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              value={data.numberOfArtworks}
              onChange={(e) => set("numberOfArtworks", e.target.value)}
              placeholder="örn: 40"
              className="mt-1.5"
            />
          </div>
        )}

        {/* Müdür Yardımcısı (Görsel Sanatlar) */}
        {showVicePrincipal && (
          <div>
            <Label className="text-sm font-medium">
              Vice Principal Name Surname <span className="text-red-500">*</span>
            </Label>
            <Input
              value={data.vicePrincipalName}
              onChange={(e) => set("vicePrincipalName", e.target.value)}
              placeholder="Müdür yardımcısının adı soyadı"
              className="mt-1.5"
            />
          </div>
        )}

        {/* Sorumlu Öğretmen */}
        <div className="sm:col-span-2">
          <Label className="text-sm font-medium">
            Sorumlu Öğretmen <span className="text-red-500">*</span>
          </Label>
          <select
            value={data.teacherId}
            onChange={(e) => set("teacherId", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Öğretmen seçin...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Kanıt Yükleme */}
        <div className="sm:col-span-2">
          <Label className="text-sm font-medium">Kanıt (Görsel veya Video)</Label>
          <p className="text-xs text-gray-400 mt-0.5 mb-2">
            Görsel en fazla 3 MB · video en fazla 4 MB (barındırma sınırı). iPhone HEIC desteklenir.
          </p>
          <div
            className={`flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 transition-colors ${
              uploading ? "opacity-60 pointer-events-none" : "cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}
            onClick={() => !uploading && evidenceRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2 text-gray-400">
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
              ) : (
                <Upload className="h-7 w-7" />
              )}
              <p className="text-sm">{uploading ? "Yükleniyor…" : "Kanıt dosyası yükle"}</p>
              {!uploading && <p className="text-xs">Tıklayın veya sürükleyin</p>}
            </div>
          </div>
          <input
            ref={evidenceRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={handleEvidenceUpload}
          />

          {data.evidenceUrls.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {data.evidenceUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  <span className="flex-1 truncate text-gray-600">{url.split("/").pop()}</span>
                  <button onClick={() => removeEvidence(url)} className="text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
        >
          Devam: Katılımcılar →
        </Button>
      </div>
    </div>
  )
}
