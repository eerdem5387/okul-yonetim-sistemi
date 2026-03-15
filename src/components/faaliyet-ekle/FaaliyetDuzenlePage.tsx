"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"
import { CategoryStep } from "./CategoryStep"
import { SubtypeStep } from "./SubtypeStep"
import { ParticipantsStep } from "./ParticipantsStep"
import { PreviewPanel } from "./PreviewPanel"
import {
  initialFormState,
  initialCommon,
  type FaaliyetFormState,
  type ParticipantRow,
} from "@/types/ib-activity-form"
import {
  CATEGORY_TO_ACTIVITY_TYPE,
  getCategorySubtypeFromLegacyType,
  getAchievementLevel,
  type CategoryId,
} from "@/lib/ib-activity-config"

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

function formatDateForInput(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

interface ActivityForEdit {
  id: string
  studentId: string
  type: string
  title: string
  description: string | null
  activityDate: string
  location: string | null
  organizer: string | null
  duration: number | null
  participants: number | null
  outcome: string | null
  evidence: string | null
  notes: string | null
  isVerified: boolean
  category: string | null
  subtype: string | null
  participationPhotoUrl: string | null
  certificateData?: Record<string, unknown> | null
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber?: string
  }
}

export interface FaaliyetDuzenlePageProps {
  activityId: string
  backHref: string
  backLabel: string
  students?: Array<{ id: string; firstName: string; lastName: string; grade: string; tcNumber: string }>
  teachers?: Array<{ id: string; firstName: string; lastName: string }>
}

export function FaaliyetDuzenlePage({
  activityId,
  backHref,
  backLabel,
  students = [],
  teachers = [],
}: FaaliyetDuzenlePageProps) {
  const router = useRouter()
  const [activity, setActivity] = useState<ActivityForEdit | null>(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<FaaliyetFormState>(initialFormState)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/activities/${activityId}`, {
          headers: getAuthHeaders(),
        })
        if (!res.ok) {
          if (res.status === 404) setActivity(null)
          return
        }
        const data = await res.json()
        if (cancelled) return
        setActivity(data)
        const act = data as ActivityForEdit
        const dateStr = formatDateForInput(act.activityDate)
        const resolved = act.category
          ? { category: act.category as CategoryId, subtype: act.subtype ?? "" }
          : getCategorySubtypeFromLegacyType(act.type)
        const subtypeStr = resolved.subtype ?? ""
        const cert = (act.certificateData || {}) as Record<string, unknown>
        const savedScore = cert.successScore != null ? Number(cert.successScore) : null
        const savedTeacherName = (cert.teacherName as string) || act.organizer || ""
        const teacherMatch = teachers.find(
          (t) =>
            savedTeacherName &&
            `${t.firstName} ${t.lastName}`.trim().toLowerCase() === savedTeacherName.trim().toLowerCase()
        )
        const participant: ParticipantRow = {
          studentId: act.student.id,
          studentName: `${act.student.firstName} ${act.student.lastName}`.trim(),
          tcNumber: act.student.tcNumber ?? "",
          grade: act.student.grade ?? "",
          successScore:
            savedScore != null && !Number.isNaN(savedScore) ? savedScore : "",
          achievementLevel:
            savedScore != null && !Number.isNaN(savedScore)
              ? getAchievementLevel(savedScore)
              : "",
          personalDescription: "",
          participationPhotoUrl: act.participationPhotoUrl ?? undefined,
        }
        setState({
          step: 3,
          category: resolved.category,
          subtype: subtypeStr,
          common: {
            ...initialCommon,
            title: act.title ?? "",
            startDate: dateStr,
            endDate: dateStr,
            organizer: act.organizer ?? "",
            description: act.description ?? "",
            location: act.location ?? undefined,
            duration: act.duration != null ? String(act.duration) : undefined,
            outcome: act.outcome ?? undefined,
            evidence: act.evidence ?? undefined,
          },
          teacherId: teacherMatch?.id ?? "",
          teacherName: teacherMatch ? `${teacherMatch.firstName} ${teacherMatch.lastName}`.trim() : savedTeacherName,
          participants: [participant],
          resultDocumentUrl: "",
        })
      } catch {
        if (!cancelled) setActivity(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activityId])

  const setCategory = useCallback((category: CategoryId) => {
    setState((prev) => ({
      ...initialFormState,
      step: 2,
      category,
      subtype: "",
      common: prev.common,
      teacherId: prev.teacherId,
      teacherName: prev.teacherName,
      participants: prev.participants,
      resultDocumentUrl: prev.resultDocumentUrl,
    }))
  }, [])

  const setSubtype = useCallback((subtype: string) => {
    setState((prev) => ({ ...prev, subtype }))
  }, [])

  const goToStep = useCallback((step: 1 | 2 | 3) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const setCommon = useCallback((common: FaaliyetFormState["common"]) => {
    setState((prev) => ({ ...prev, common }))
  }, [])

  const setTeacher = useCallback((teacherId: string, teacherName: string) => {
    setState((prev) => ({ ...prev, teacherId, teacherName }))
  }, [])

  const setParticipants = useCallback((participants: ParticipantRow[]) => {
    setState((prev) => ({ ...prev, participants }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!state.category || !activity) return
    const valid = state.participants.filter((p) => p.studentId)
    if (valid.length === 0) {
      alert("Katılımcı bilgisi eksik.")
      return
    }
    const title = state.common.title?.trim()
    if (!title) {
      alert("Başlık zorunludur.")
      return
    }
    if (!state.common.description?.trim()) {
      alert("Açıklama zorunludur.")
      return
    }
    if (!state.common.organizer?.trim()) {
      alert("Organizatör / Eğitmen zorunludur.")
      return
    }
    if (!state.common.location?.trim()) {
      alert("Konum zorunludur.")
      return
    }
    if (!state.common.duration?.trim() || Number.isNaN(parseInt(state.common.duration, 10))) {
      alert("Süre (dakika) zorunludur.")
      return
    }
    if (!state.common.outcome?.trim()) {
      alert("Sonuç / Kazanım zorunludur.")
      return
    }
    if (!state.common.evidence?.trim()) {
      alert("Kanıt (link veya dosya) zorunludur.")
      return
    }
    if ((state.category === "egitim" || state.category === "yarisma") && !state.teacherId) {
      alert("Öğretmen (belgelerde imza) seçimi zorunludur.")
      return
    }
    if ((state.category === "egitim" || state.category === "yarisma") && valid.some((p) => p.successScore === "")) {
      alert("Eğitim ve yarışma faaliyetlerinde her katılımcı için başarı puanı (1–100) zorunludur.")
      return
    }
    if (!valid[0]?.participationPhotoUrl?.trim()) {
      alert("Katılım kanıt fotoğrafı zorunludur.")
      return
    }
    const existingCert = (activity.certificateData || {}) as Record<string, unknown>
    const certificateData: Record<string, unknown> = {
      ...existingCert,
      category: state.category,
      subtype: state.subtype || null,
      teacherName: state.teacherName || state.common.organizer || null,
      educationDescription: state.common.description || title,
      educationStartEndDateStart: state.common.startDate || null,
      educationStartEndDateEnd: state.common.endDate || null,
      successScore: valid[0]?.successScore !== "" && valid[0]?.successScore !== undefined ? Number(valid[0].successScore) : null,
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: CATEGORY_TO_ACTIVITY_TYPE[state.category],
          title: state.common.title,
          description: state.common.description || null,
          location: state.common.location || null,
          organizer: state.common.organizer || null,
          duration: state.common.duration ? parseInt(state.common.duration, 10) : null,
          participants: valid.length,
          outcome: state.common.outcome || null,
          evidence: state.common.evidence || null,
          notes: activity.notes ?? null,
          category: state.category,
          subtype: state.subtype || null,
          participationPhotoUrl: valid[0]?.participationPhotoUrl || null,
          certificateData,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Güncelleme başarısız")
      alert("Faaliyet güncellendi.")
      router.push(backHref)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Güncelleme sırasında hata oluştu.")
    } finally {
      setSubmitting(false)
    }
  }, [state, activity, activityId, backHref, router])

  const studentOptions = students.length > 0
    ? students.map((s) => ({
        id: s.id,
        label: `${s.firstName} ${s.lastName}`,
        grade: s.grade,
        tcNumber: s.tcNumber ?? "",
      }))
    : activity
      ? [
          {
            id: activity.student.id,
            label: `${activity.student.firstName} ${activity.student.lastName}`.trim(),
            grade: activity.student.grade ?? "",
            tcNumber: activity.student.tcNumber ?? "",
          },
        ]
      : []

  const teacherOptions = teachers.map((t) => ({
    id: t.id,
    label: `${t.firstName} ${t.lastName}`.trim(),
  }))

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Yükleniyor…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Faaliyet bulunamadı.</p>
            <Link href={backHref}>
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {backLabel}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const steps = [
    { step: 1 as const, label: "Faaliyet türü" },
    { step: 2 as const, label: "Alt tür" },
    { step: 3 as const, label: "Detaylar" },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row md:min-h-0 md:h-[calc(100vh-4rem)]">
      <div className="md:hidden flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <Link href={backHref} className="inline-flex items-center text-sm text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {backLabel}
        </Link>
        <h1 className="text-lg font-semibold mt-2">Faaliyet düzenle</h1>
        <div className="flex gap-2 overflow-x-auto mt-3 scrollbar-none -mx-1">
          {steps.map(({ step, label }) => (
            <button
              key={step}
              type="button"
              onClick={() => (step === 1 || state.category) && goToStep(step)}
              disabled={step > 1 && !state.category}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                state.step === step ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {step}. {label}
            </button>
          ))}
        </div>
      </div>

      <aside className="w-48 flex-shrink-0 hidden md:block border-r border-gray-200 bg-gray-50/50 overflow-y-auto">
        <nav className="p-4 space-y-1 sticky top-0">
          <Link href={backHref} className="text-sm text-blue-600 hover:underline block mb-3">
            <ArrowLeft className="h-4 w-4 mr-1 inline" />
            {backLabel}
          </Link>
          <p className="text-sm font-semibold text-gray-700 mb-2">Faaliyet düzenle</p>
          {steps.map(({ step, label }) => (
            <button
              key={step}
              type="button"
              onClick={() => (step === 1 || state.category) && goToStep(step)}
              disabled={step > 1 && !state.category}
              className={`w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium ${
                state.step === step ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-gray-600 hover:bg-white"
              }`}
            >
              {step}. {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <div className="w-full max-w-5xl">
          {state.step === 1 && <CategoryStep onSelect={setCategory} />}
          {state.step === 2 && state.category && (
            <SubtypeStep
              category={state.category}
              subtype={state.subtype}
              onSubtypeChange={setSubtype}
              onBack={() => goToStep(1)}
              onNext={() => goToStep(3)}
            />
          )}
          {state.step === 3 && state.category && (
            <ParticipantsStep
              category={state.category}
              common={state.common}
              teacherId={state.teacherId}
              teacherName={state.teacherName}
              participants={state.participants}
              teacherOptions={teacherOptions}
              studentOptions={studentOptions}
              onCommonChange={setCommon}
              onTeacherChange={setTeacher}
              onParticipantsChange={setParticipants}
              onBack={() => goToStep(2)}
              onSubmit={handleSubmit}
              submitting={submitting}
              editMode
              submitLabel="Güncelle"
            />
          )}
        </div>
      </main>

      <aside className="hidden md:flex flex-shrink-0 flex-col border-l border-gray-200 bg-gray-50/30 w-full lg:w-72 xl:w-80">
        <div className="p-4 sticky top-0 overflow-y-auto max-h-[100vh]">
          <PreviewPanel state={state} />
        </div>
      </aside>
    </div>
  )
}
