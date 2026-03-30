"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
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
  type CategoryId,
} from "@/lib/ib-activity-config"

const ALLOWED_ROLES = [
  "admin",
  "principal",
  "student_affairs",
  "counselor",
  "head_counselor",
  "teacher",
]

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

export interface FaaliyetEklePageProps {
  fallbackRedirect?: string
  /** Kayıt sonrası "Listeye git" derse yönlendirilecek sayfa (örn. /ogretmen/ib-yonetimi veya /rehberlik/activities) */
  successRedirect?: string
}

export function FaaliyetEklePage({ fallbackRedirect = "/", successRedirect }: FaaliyetEklePageProps) {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [state, setState] = useState<FaaliyetFormState>(initialFormState)
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string; grade: string; tcNumber: string }>>([])
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null
    setHasAccess(role !== null && ALLOWED_ROLES.includes(role))
  }, [])

  useEffect(() => {
    if (hasAccess === false) {
      router.push(fallbackRedirect)
      return
    }
    if (!hasAccess) return
    const fetchData = async () => {
      try {
        const [stRes, staffRes] = await Promise.all([
          fetch("/api/students?limit=1000", { headers: getAuthHeaders() }),
          fetch("/api/staff?limit=200", { headers: getAuthHeaders() }),
        ])
        const stData = await stRes.json()
        const staffData = await staffRes.json()
        const stList = Array.isArray(stData) ? stData : stData?.students ?? []
        const staffList = Array.isArray(staffData) ? staffData : staffData?.staff ?? []
        setStudents(stList)
        setTeachers(
          staffList.map((s: { id: string; firstName: string; lastName: string }) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
          }))
        )
      } catch {
        setStudents([])
        setTeachers([])
      }
    }
    fetchData()
  }, [hasAccess, fallbackRedirect, router])

  const setCategory = useCallback((category: CategoryId) => {
    setState({
      ...initialFormState,
      step: 2,
      category,
      common: initialCommon,
    })
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
    if (!state.category) return
    const valid = state.participants.filter((p) => p.studentId)
    if (valid.length === 0) {
      alert("En az bir katılımcı ekleyin.")
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
    if (!state.common.startDate) {
      alert("Başlangıç tarihi zorunludur.")
      return
    }
    if (!state.common.endDate) {
      alert("Bitiş tarihi zorunludur.")
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
    const missingPhoto = valid.find((p) => !p.participationPhotoUrl?.trim())
    if (missingPhoto) {
      alert("Her katılımcı için katılım kanıt fotoğrafı zorunludur.")
      return
    }
    const activityDate = state.common.startDate || state.common.endDate
    setSubmitting(true)
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentIds: valid.map((p) => p.studentId),
          type: CATEGORY_TO_ACTIVITY_TYPE[state.category],
          title: state.common.title,
          description: state.common.description,
          activityDate,
          organizer: state.common.organizer,
          location: state.common.location || null,
          duration: state.common.duration ? parseInt(state.common.duration, 10) : null,
          participants: valid.length,
          outcome: state.common.outcome || state.common.description || undefined,
          evidence: state.common.evidence ?? "",
          notes: "",
          category: state.category,
          subtype: state.subtype || undefined,
          participantPhotoUrls: valid.map((p) => p.participationPhotoUrl || ""),
          certificateContents: valid.map((p) => {
            const score = p.successScore === "" ? undefined : Number(p.successScore)
            return {
              category: state.category,
              subtype: state.subtype || undefined,
              teacherName: state.teacherName || state.common.organizer || undefined,
              educationDescription: state.common.description || state.common.title || undefined,
              educationStartEndDateStart: state.common.startDate || undefined,
              educationStartEndDateEnd: state.common.endDate || undefined,
              successScore: score !== undefined && !Number.isNaN(score) ? score : undefined,
            }
          }),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Kayıt başarısız")
      const count = data.count ?? valid.length
      setState(initialFormState)
      if (successRedirect && window.confirm(`${count} faaliyet kaydedildi. Faaliyet listesine gitmek ister misiniz?`)) {
        router.push(successRedirect)
      } else if (!successRedirect) {
        alert(`${count} faaliyet kaydedildi.`)
      }
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Kayıt sırasında hata oluştu.")
    } finally {
      setSubmitting(false)
    }
  }, [state, router, successRedirect])

  const studentOptions = students.map((s) => ({
    id: s.id,
    label: `${s.firstName} ${s.lastName}`,
    grade: s.grade,
    tcNumber: s.tcNumber ?? "",
  }))
  const teacherOptions = teachers.map((t) => ({
    id: t.id,
    label: `${t.firstName} ${t.lastName}`.trim(),
  }))

  if (hasAccess === null) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Yükleniyor...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasAccess === false) return null

  const steps = [
    { step: 1 as const, label: "Faaliyet türü" },
    { step: 2 as const, label: "Alt tür" },
    { step: 3 as const, label: "Katılımcılar" },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row md:min-h-0 md:h-[calc(100vh-4rem)]">
      {/* Mobil: Üst adım göstergesi */}
      <div className="md:hidden flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3 safe-area-pb">
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1">
          {steps.map(({ step, label }) => (
            <button
              key={step}
              type="button"
              onClick={() => (step === 1 || state.category) && goToStep(step)}
              disabled={step > 1 && !state.category}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                state.step === step
                  ? "bg-blue-600 text-white"
                  : state.category || step === 1
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-gray-50 text-gray-400 cursor-not-allowed"
              }`}
            >
              {step}. {label}
            </button>
          ))}
        </div>
      </div>

      {/* Masaüstü: Sol adım menüsü */}
      <aside className="w-48 flex-shrink-0 hidden md:block border-r border-gray-200 bg-gray-50/50 overflow-y-auto">
        <nav className="p-4 space-y-1 sticky top-0">
          {steps.map(({ step, label }) => (
            <button
              key={step}
              type="button"
              onClick={() => (step === 1 || state.category) && goToStep(step)}
              disabled={step > 1 && !state.category}
              className={`w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                state.step === step ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-gray-600 hover:bg-white"
              } ${step > 1 && !state.category ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {step}. {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Form alanı - yatayda geniş kullanım */}
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <div className="w-full max-w-5xl space-y-6">
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-white shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Sertifika modülü</p>
                <p className="text-xs text-gray-600 mt-1 max-w-xl">
                  Eğitim, gezi, spor, müzik vb. türlerde PDF sertifikası üretilen faaliyet için tür seçerek başlayın.
                </p>
              </div>
              <Button
                type="button"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => router.push("/faaliyet-yonetimi/yeni")}
              >
                Sertifika faaliyeti oluştur
              </Button>
            </CardContent>
          </Card>
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
            />
          )}
        </div>
      </main>

      {/* Önizleme: md ve üzeri */}
      <aside className="hidden md:flex flex-shrink-0 flex-col border-l border-gray-200 bg-gray-50/30 w-full lg:w-72 xl:w-80">
        <div className="p-4 sticky top-0 overflow-y-auto max-h-[100vh]">
          <PreviewPanel state={state} />
        </div>
      </aside>
    </div>
  )
}
