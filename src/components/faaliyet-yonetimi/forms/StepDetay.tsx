"use client"

import { useRef, useState } from "react"
import { Upload, X, Loader2, BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DURATION_OPTIONS, type MufredatHafta, type FormVariant } from "@/lib/activity-types-config"

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
  void uploading

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
        const formData = new FormData()
        formData.append("file", files[i])
        const res = await fetch("/api/activity-events/upload?type=evidence", {
          method: "POST",
          headers,
          body: formData,
        })
        const json = await res.json()
        if (res.ok && json.url) newUrls.push(json.url)
        else alert(json.error || "Yükleme başarısız")
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
        parseInt(data.tournamentTotalParticipants, 10) > 0))

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
                            {typeof row.hafta === "number" ? `${row.hafta}. Hafta` : `${row.hafta}. Hafta`}
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

        {/* Sonuç / Kazanım */}
        <div className="sm:col-span-2">
          <Label className="text-sm font-medium">
            {isGezi ? "Amaç / Kazanım" : "Sonuç / Kazanım"}
          </Label>
          <Input
            value={data.outcome}
            onChange={(e) => set("outcome", e.target.value)}
            placeholder={
              isGezi
                ? "Bu geziden öğrencilerin ne kazanması bekleniyor?"
                : "Bu eğitimden beklenen sonuç veya kazanım..."
            }
            className="mt-1.5"
          />
        </div>

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
            Görsel maks 3 MB · Video maks 10 MB
          </p>
          <div
            className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
            onClick={() => evidenceRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload className="h-7 w-7" />
              <p className="text-sm">Kanıt dosyası yükle</p>
              <p className="text-xs">Tıklayın veya sürükleyin</p>
            </div>
          </div>
          <input
            ref={evidenceRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
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
