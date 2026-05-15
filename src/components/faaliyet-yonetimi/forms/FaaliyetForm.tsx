"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { StepDetay, type StepDetayData } from "./StepDetay"
import { StepKatilimcilar } from "./StepKatilimcilar"
import { PdfOnizlemeModal } from "./PdfOnizlemeModal"
import type { ParticipantData } from "./StudentRow"
import {
  MAIN_TYPE_LABELS,
  getSubtypeConfig,
  type ActivityMainType,
} from "@/lib/activity-types-config"

interface FaaliyetFormProps {
  mainType: ActivityMainType
  subtypeId: string
  /** Doluysa mevcut activity_events kaydı düzenlenir (aynı sihirbaz akışı) */
  editEventId?: string
}

interface StudentOption {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
}

interface Teacher {
  id: string
  firstName: string
  lastName: string
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

const INITIAL_DETAY: StepDetayData = {
  title: "",
  description: "",
  outcome: "",
  startDate: "",
  endDate: "",
  location: "",
  organizerName: "",
  durationHours: "",
  durationDays: "",
  durationMonths: "",
  durationYears: "",
  evidenceUrls: [],
  teacherId: "",
  geziTuru: "",
  geziProgrami: "",
  ulasimTuru: "",
  numberOfArtworks: "",
  vicePrincipalName: "",
  tournamentTotalParticipants: "",
  projectPurpose: "",
  projectAchievementLevel: "",
}

const STEPS = [
  { id: 1, label: "Faaliyet Detayları" },
  { id: 2, label: "Katılımcılar" },
  { id: 3, label: "PDF Önizleme & Kaydet" },
]

function dateInputFromIso(iso: string): string {
  if (!iso) return ""
  return iso.split("T")[0] ?? ""
}

export function FaaliyetForm({ mainType, subtypeId, editEventId }: FaaliyetFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [detay, setDetay] = useState<StepDetayData>(INITIAL_DETAY)
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [participantsLocked, setParticipantsLocked] = useState(false)
  const [editLoadError, setEditLoadError] = useState<string | null>(null)

  const subtypeConfig = getSubtypeConfig(mainType, subtypeId)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setEditLoadError(null)
      try {
        const [stRes, staffRes] = await Promise.all([
          fetch("/api/students?limit=2000", { headers: getAuthHeaders() }),
          fetch("/api/staff?limit=500", { headers: getAuthHeaders() }),
        ])
        const stData = await stRes.json()
        const staffData = await staffRes.json()
        if (cancelled) return
        setStudents(Array.isArray(stData) ? stData : stData?.students ?? [])
        const staffList = Array.isArray(staffData) ? staffData : staffData?.staff ?? []
        setTeachers(staffList.map((s: Teacher) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName })))

        if (editEventId) {
          const evRes = await fetch(`/api/activity-events/${editEventId}`, { headers: getAuthHeaders() })
          if (!evRes.ok) {
            const j = await evRes.json().catch(() => ({}))
            throw new Error(j.error || "Faaliyet yüklenemedi")
          }
          const ev = await evRes.json()
          if (cancelled) return
          const locked = Array.isArray(ev.participants)
            ? ev.participants.some(
                (p: { verificationStatus: string }) => p.verificationStatus !== "IMZA_SURECINDE"
              )
            : false
          setParticipantsLocked(locked)
          const meta =
            ev.metadata && typeof ev.metadata === "object" && !Array.isArray(ev.metadata)
              ? (ev.metadata as Record<string, unknown>)
              : {}
          setDetay({
            ...INITIAL_DETAY,
            title: ev.title ?? "",
            description: ev.description ?? "",
            outcome: ev.outcome ?? "",
            startDate: dateInputFromIso(ev.startDate),
            endDate: dateInputFromIso(ev.endDate),
            location: ev.location ?? "",
            organizerName: ev.organizerName ?? "",
            durationHours: ev.durationHours != null ? String(ev.durationHours) : "",
            durationDays: ev.durationDays != null ? String(ev.durationDays) : "",
            durationMonths: ev.durationMonths != null ? String(ev.durationMonths) : "",
            durationYears: ev.durationYears != null ? String(ev.durationYears) : "",
            evidenceUrls: Array.isArray(ev.evidenceUrls) ? ev.evidenceUrls : [],
            teacherId: ev.teacher?.id ?? "",
            geziTuru: String(meta.geziTuru ?? ""),
            geziProgrami: String(meta.geziProgrami ?? ""),
            ulasimTuru: String(meta.ulasimTuru ?? ""),
            numberOfArtworks: meta.numberOfArtworks != null ? String(meta.numberOfArtworks) : "",
            vicePrincipalName: String(meta.vicePrincipalName ?? ""),
            tournamentTotalParticipants:
              meta.tournamentTotalParticipants != null ? String(meta.tournamentTotalParticipants) : "",
            projectPurpose: String(meta.projectPurpose ?? ""),
            projectAchievementLevel: String(meta.projectAchievementLevel ?? ""),
          })
          setParticipants(
            (ev.participants || []).map(
              (p: {
                studentId: string
                student: { firstName: string; lastName: string; grade: string }
                score: number | null
                languageLevel: string | null
                extraDocumentUrl: string | null
                artworkDescription?: string | null
                tournamentPlacement?: string | null
                projectRole?: string | null
              }) => ({
                studentId: p.studentId,
                studentName: `${p.student.firstName} ${p.student.lastName}`.trim(),
                studentGrade: p.student.grade ?? "",
                score: p.score != null ? String(p.score) : "",
                languageLevel: p.languageLevel ?? "",
                extraDocumentUrl: p.extraDocumentUrl ?? "",
                artworkDescription: p.artworkDescription ?? "",
                tournamentPlacement: p.tournamentPlacement ?? "",
                projectRole: p.projectRole ?? "",
              })
            )
          )
        }
      } catch (e) {
        if (!cancelled) {
          setEditLoadError(e instanceof Error ? e.message : "Yükleme hatası")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editEventId])

  if (!subtypeConfig) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Bilinmeyen alt tür: {subtypeId}</p>
      </div>
    )
  }

  // PDF önizleme verisi oluştur — tüm sertifika tipleri için ortak
  function buildCertData() {
    const selectedTeacher = teachers.find((t) => t.id === detay.teacherId)
    const teacherName = selectedTeacher
      ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
      : detay.organizerName

    const base = {
      title: detay.title,
      educationDescription: detay.description,
      startDate: detay.startDate,
      endDate: detay.endDate,
      teacherName,
      organizerName: detay.organizerName,
      createdAt: new Date().toISOString(),
    }

    if (subtypeConfig!.certificateType === "PROJE_KATILIM") {
      return {
        projectDescription: detay.description?.trim() || detay.title,
        startDate: detay.startDate,
        endDate: detay.endDate,
        teacherName,
        achievementLevel: detay.projectAchievementLevel,
        createdAt: new Date().toISOString(),
        participants: participants.map((p) => ({
          firstName: p.studentName.split(" ")[0] ?? "",
          lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
          tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
          grade: p.studentGrade,
        })),
      }
    }

    if (subtypeConfig!.certificateType === "TURNUVA_KATILIM") {
      return {
        tournamentDescription: detay.description?.trim() || detay.title,
        startDate: detay.startDate,
        endDate: detay.endDate,
        teacherName,
        createdAt: new Date().toISOString(),
        participants: participants.map((p) => ({
          firstName: p.studentName.split(" ")[0] ?? "",
          lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
          tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
          grade: p.studentGrade,
        })),
      }
    }

    if (subtypeConfig!.certificateType === "GEZI_KATILIM") {
      return {
        title: detay.title,
        description: detay.description,
        startDate: detay.startDate,
        endDate: detay.endDate,
        teacherName,
        createdAt: new Date().toISOString(),
        participants: participants.map((p) => ({
          firstName: p.studentName.split(" ")[0] ?? "",
          lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
          tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
          grade: p.studentGrade,
        })),
      }
    }

    if (
      subtypeConfig!.certificateType === "MUZIK_EGITIM" ||
      subtypeConfig!.certificateType === "GASTRONOMI_EGITIM"
    ) {
      return {
        title: detay.title,
        startDate: detay.startDate,
        endDate: detay.endDate,
        teacherName,
        organizerName: detay.organizerName,
        createdAt: new Date().toISOString(),
        participants: participants.map((p) => ({
          firstName: p.studentName.split(" ")[0] ?? "",
          lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
          tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
          grade: p.studentGrade,
        })),
      }
    }

    if (subtypeConfig!.certificateType === "GORSEL_SANATLAR_EGITIM") {
      return {
        title: detay.title,
        description: detay.description,
        startDate: detay.startDate,
        endDate: detay.endDate,
        teacherName,
        organizerName: detay.organizerName,
        createdAt: new Date().toISOString(),
        numberOfArtworks: parseInt(detay.numberOfArtworks) || 0,
        vicePrincipalName: detay.vicePrincipalName,
        participants: participants.map((p) => ({
          firstName: p.studentName.split(" ")[0] ?? "",
          lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
          tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
          grade: p.studentGrade,
        })),
      }
    }

    if (
      subtypeConfig!.certificateType === "GORSEL_SANATLAR_ETKINLIK" ||
      subtypeConfig!.certificateType === "MUZIK_ESER_ICRA" ||
      subtypeConfig!.certificateType === "GASTRONOMI_ETKINLIK"
    ) {
      return {
        title: detay.title,
        startDate: detay.startDate,
        endDate: detay.endDate,
        teacherName,
        createdAt: new Date().toISOString(),
        participants: participants.map((p) => ({
          firstName: p.studentName.split(" ")[0] ?? "",
          lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
          tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
          grade: p.studentGrade,
          artworkDescription: p.artworkDescription,
        })),
      }
    }

    if (subtypeConfig!.certificateType === "DIL_EGITIMI_KATILIM") {
      return {
        ...base,
        participants: participants.map((p) => ({
          firstName: p.studentName.split(" ")[0] ?? "",
          lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
          tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
          grade: p.studentGrade,
          score: parseInt(p.score) || 0,
          languageLevel: p.languageLevel || "A1",
        })),
      }
    }

    // INGILIZCE_FEN_SERTIFIKA, ROBOTIK, YAPAY_ZEKA ve diğerleri (sadece score)
    return {
      ...base,
      participants: participants.map((p) => ({
        firstName: p.studentName.split(" ")[0] ?? "",
        lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
        tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
        grade: p.studentGrade,
        score: parseInt(p.score) || 0,
      })),
    }
  }

  function buildTurnuvaAchievementCertData() {
    const selectedTeacher = teachers.find((t) => t.id === detay.teacherId)
    const teacherName = selectedTeacher
      ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
      : detay.organizerName
    const total = parseInt(detay.tournamentTotalParticipants, 10) || 0
    const placed = participants.filter((p) => p.tournamentPlacement?.trim())
    return {
      tournamentDescription: detay.description?.trim() || detay.title,
      totalParticipants: total,
      startDate: detay.startDate,
      endDate: detay.endDate,
      teacherName,
      createdAt: new Date().toISOString(),
      participants: placed.map((p) => ({
        firstName: p.studentName.split(" ")[0] ?? "",
        lastName: p.studentName.split(" ").slice(1).join(" ") ?? "",
        tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
        grade: p.studentGrade,
        placement: p.tournamentPlacement.trim(),
      })),
    }
  }

  function buildMetadataPayload(): Record<string, unknown> | null {
    const m: Record<string, unknown> = {}
    if (subtypeConfig!.formVariant === "gezi") {
      m.geziTuru = detay.geziTuru || null
      m.geziProgrami = detay.geziProgrami || null
      m.ulasimTuru = detay.ulasimTuru || null
    }
    if (subtypeConfig!.showNumberOfArtworks) {
      m.numberOfArtworks = detay.numberOfArtworks ? parseInt(detay.numberOfArtworks, 10) : null
      m.vicePrincipalName = detay.vicePrincipalName || null
    }
    if (subtypeConfig!.showTournamentTotalParticipants) {
      m.tournamentTotalParticipants = detay.tournamentTotalParticipants
        ? parseInt(detay.tournamentTotalParticipants, 10)
        : null
    }
    if (subtypeConfig!.showProjectPurpose) {
      m.projectPurpose = detay.projectPurpose?.trim() || null
      m.projectAchievementLevel = detay.projectAchievementLevel?.trim() || null
    }
    if (subtypeConfig!.showVicePrincipal && !subtypeConfig!.showNumberOfArtworks) {
      m.vicePrincipalName = detay.vicePrincipalName?.trim() || null
    }
    return Object.keys(m).length > 0 ? m : null
  }

  async function handleSave() {
    setSaving(true)
    try {
      const metadata = buildMetadataPayload()
      const participantPayload = participants.map((p) => ({
        studentId: p.studentId,
        score: p.score ? parseInt(p.score, 10) : null,
        languageLevel: p.languageLevel || null,
        extraDocumentUrl: p.extraDocumentUrl || null,
        artworkDescription: p.artworkDescription?.trim() || null,
        tournamentPlacement: p.tournamentPlacement?.trim() || null,
        projectRole: p.projectRole?.trim() || null,
      }))

      if (editEventId) {
        const base: Record<string, unknown> = {
          title: detay.title,
          description: detay.description,
          outcome: detay.outcome,
          startDate: detay.startDate,
          endDate: detay.endDate,
          location: detay.location,
          organizerName: detay.organizerName,
          durationHours: detay.durationHours || null,
          durationDays: detay.durationDays || null,
          durationMonths: detay.durationMonths || null,
          durationYears: detay.durationYears || null,
          evidenceUrls: detay.evidenceUrls,
          teacherId: detay.teacherId,
          metadata,
        }
        if (!participantsLocked) {
          base.participants = participantPayload
        }
        const res = await fetch(`/api/activity-events/${editEventId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(base),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({} as { error?: string; detail?: string; code?: string }))
          const parts = [data.error, data.detail].filter(Boolean)
          throw new Error(parts.length ? parts.join("\n") : "Güncelleme başarısız")
        }
        setShowPdfModal(false)
        router.push(`/faaliyet-yonetimi/${editEventId}`)
        return
      }

      const body = {
        mainType,
        subtype: subtypeId,
        certificateType: subtypeConfig!.certificateType,
        title: detay.title,
        description: detay.description,
        outcome: detay.outcome,
        startDate: detay.startDate,
        endDate: detay.endDate,
        location: detay.location,
        organizerName: detay.organizerName,
        durationHours: detay.durationHours || null,
        durationDays: detay.durationDays || null,
        durationMonths: detay.durationMonths || null,
        durationYears: detay.durationYears || null,
        evidenceUrls: detay.evidenceUrls,
        teacherId: detay.teacherId,
        metadata,
        participants: participantPayload,
      }

      const res = await fetch("/api/activity-events", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string; detail?: string }))
        const parts = [data.error, data.detail].filter(Boolean)
        throw new Error(parts.length ? parts.join("\n") : "Kayıt başarısız")
      }

      const created = await res.json()
      setShowPdfModal(false)
      router.push(`/faaliyet-yonetimi/${created.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Kayıt sırasında hata oluştu")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (editLoadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <p className="text-red-600 text-center max-w-md">{editLoadError}</p>
        <button
          type="button"
          className="mt-4 text-sm text-indigo-600 underline"
          onClick={() => router.push("/faaliyet-yonetimi")}
        >
          Faaliyet yönetimine dön
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Form Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <span>Faaliyet Yönetimi</span>
            <span>›</span>
            <span>{MAIN_TYPE_LABELS[mainType]}</span>
            <span>›</span>
            <span className="text-gray-700 font-medium">{subtypeConfig.label}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {editEventId ? "Faaliyet Düzenle" : "Yeni Faaliyet Ekle"} — {subtypeConfig.label}
          </h1>

          {/* Adım göstergesi */}
          <div className="flex items-center gap-0 mt-4">
            {STEPS.map((s, i) => {
              const label =
                s.id === 3 && editEventId ? "PDF Önizleme & Güncelle" : s.label
              return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 ${step === s.id ? "text-indigo-600" : step > s.id ? "text-emerald-600" : "text-gray-400"}`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                      ${step === s.id ? "bg-indigo-600 text-white" : step > s.id ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    {step > s.id ? "✓" : s.id}
                  </span>
                  <span className="text-sm font-medium hidden sm:inline">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-8 mx-2 ${step > s.id ? "bg-emerald-300" : "bg-gray-200"}`} />
                )}
              </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {step === 1 && (
          <StepDetay
            data={detay}
            onChange={setDetay}
            teachers={teachers}
            subtypeLabel={subtypeConfig.label}
            mufredat={subtypeConfig.mufredat}
            mufredatBaslik={subtypeConfig.mufredatBaslik}
            formVariant={subtypeConfig.formVariant}
            showGeziTuru={subtypeConfig.showGeziTuru}
            showGeziProgrami={subtypeConfig.showGeziProgrami}
            showUlasimTuru={subtypeConfig.showUlasimTuru}
            showNumberOfArtworks={subtypeConfig.showNumberOfArtworks}
            showVicePrincipal={subtypeConfig.showVicePrincipal}
            showTournamentTotalParticipants={subtypeConfig.showTournamentTotalParticipants}
            activityTitleLabel={subtypeConfig.activityTitleLabel}
            activityTitlePlaceholder={subtypeConfig.activityTitlePlaceholder}
            descriptionFieldLabel={subtypeConfig.descriptionFieldLabel}
            descriptionPlaceholder={subtypeConfig.descriptionPlaceholder}
            projectDocumentPreview={subtypeConfig.projectDocumentPreview}
            showProjectPurpose={subtypeConfig.showProjectPurpose}
            showProjectAchievementLevel={subtypeConfig.showProjectAchievementLevel}
            requireProjectOutcome={subtypeConfig.requireProjectOutcome}
            outcomeFieldLabel={subtypeConfig.outcomeFieldLabel}
            outcomePlaceholder={subtypeConfig.outcomePlaceholder}
            projectPreviewParticipants={participants.map((p) => ({
              name: p.studentName,
              tcNumber: students.find((s) => s.id === p.studentId)?.tcNumber ?? "",
              projectRole: p.projectRole ?? "",
              grade: p.studentGrade,
            }))}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepKatilimcilar
            participants={participants}
            studentOptions={students}
            subtypeConfig={subtypeConfig}
            onChange={setParticipants}
            onBack={() => setStep(1)}
            onNext={() => setShowPdfModal(true)}
            readOnly={!!participantsLocked}
          />
        )}
      </div>

      {/* PDF Önizleme Modal */}
      {showPdfModal && (
        <PdfOnizlemeModal
          certificateType={subtypeConfig.certificateType}
          certData={buildCertData()}
          turnuvaAchievementPreview={
            subtypeConfig.certificateType === "TURNUVA_KATILIM"
              ? {
                  certificateType: "TURNUVA_BASARI",
                  certData: buildTurnuvaAchievementCertData(),
                }
              : undefined
          }
          onClose={() => setShowPdfModal(false)}
          onConfirm={handleSave}
          saving={saving}
          confirmLabel={editEventId ? "Güncelle" : undefined}
        />
      )}
    </div>
  )
}
