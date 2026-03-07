"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { ActivityTypeSelector } from "@/components/ib-activities/ActivityTypeSelector"
import { ActivityFormLayout } from "@/components/ib-activities/ActivityFormLayout"
import { PdfGenerator } from "@/components/ib-activities/PdfGenerator"
import { EducationForm } from "@/components/ib-activities/forms/EducationForm"
import { EventForm } from "@/components/ib-activities/forms/EventForm"
import { SportForm } from "@/components/ib-activities/forms/SportForm"
import { CompetitionForm } from "@/components/ib-activities/forms/CompetitionForm"
import {
  type IbActivityType,
  type IbActivityFormData,
  type IbEducationSpecific,
  type IbEventSpecific,
  type IbSportSpecific,
  type IbCompetitionSpecific,
  emptyCommon,
  emptyEducationSpecific,
  emptyEventSpecific,
  emptySportSpecific,
  emptyCompetitionSpecific,
} from "@/types/ib-activity"
import { validateActivityForm } from "@/lib/ib-activity-validation"

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

interface StudentOption {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
}

const ALLOWED_ROLES = ["admin", "principal", "student_affairs", "counselor", "head_counselor", "teacher"]

export interface FaaliyetEkleContentProps {
  /** Erişim yoksa yönlendirilecek path (örn. "/" ana panel, "/ogretmen" öğretmen paneli) */
  fallbackRedirect?: string
}

export function FaaliyetEkleContent({ fallbackRedirect = "/" }: FaaliyetEkleContentProps) {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [selectedType, setSelectedType] = useState<IbActivityType | null>(null)
  const [formData, setFormData] = useState<IbActivityFormData | null>(null)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [, setLoadingStudents] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    if (role && ALLOWED_ROLES.includes(role)) {
      setHasAccess(true)
      return
    }
    setHasAccess(false)
  }, [])

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true)
    try {
      const res = await fetch("/api/students?limit=1000", {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.students || []
      setStudents(list)
    } catch {
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useEffect(() => {
    if (hasAccess === true) fetchStudents()
  }, [hasAccess, fetchStudents])

  const handleSelectType = (type: IbActivityType) => {
    setSelectedType(type)
    const common = emptyCommon()
    switch (type) {
      case "education":
        setFormData({
          type: "education",
          common,
          specific: emptyEducationSpecific(),
        })
        break
      case "event":
        setFormData({
          type: "event",
          common,
          specific: emptyEventSpecific(),
        })
        break
      case "sport":
        setFormData({
          type: "sport",
          common,
          specific: emptySportSpecific(),
        })
        break
      case "competition":
        setFormData({
          type: "competition",
          common,
          specific: emptyCompetitionSpecific(),
        })
        break
    }
  }

  const handleBack = () => {
    setSelectedType(null)
    setFormData(null)
  }

  const updateCommon = (common: IbActivityFormData["common"]) => {
    if (!formData) return
    setFormData({ ...formData, common })
  }

  const updateEducationSpecific = (specific: IbEducationSpecific) => {
    if (!formData || formData.type !== "education") return
    setFormData({ ...formData, specific })
  }
  const updateEventSpecific = (specific: IbEventSpecific) => {
    if (!formData || formData.type !== "event") return
    setFormData({ ...formData, specific })
  }
  const updateSportSpecific = (specific: IbSportSpecific) => {
    if (!formData || formData.type !== "sport") return
    setFormData({ ...formData, specific })
  }
  const updateCompetitionSpecific = (specific: IbCompetitionSpecific) => {
    if (!formData || formData.type !== "competition") return
    setFormData({ ...formData, specific })
  }

  const participantOptions = students.map((s) => ({
    id: s.id,
    label: `${s.firstName} ${s.lastName} – ${s.grade}`,
  }))

  const participantNames = formData
    ? formData.common.participantIds.map((id) => {
        const s = students.find((x) => x.id === id)
        return s ? `${s.firstName} ${s.lastName}` : id
      })
    : []

  const participantsForPdf = formData
    ? formData.common.participantIds.map((id) => {
        const s = students.find((x) => x.id === id)
        return {
          id,
          name: s ? `${s.firstName} ${s.lastName}` : "",
          tcNumber: s?.tcNumber ?? "",
          grade: s?.grade ?? "",
        }
      })
    : []

  const downloadEducationActivityPdf = async () => {
    if (!formData || formData.type !== "education") return
    if (participantsForPdf.length === 0) {
      alert("En az bir katılımcı seçin.")
      return
    }
    try {
      const res = await fetch("/api/ib/pdf/education-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          common: formData.common,
          specific: formData.specific,
          participants: participantsForPdf,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "PDF oluşturulamadı")
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "egitim-faaliyet-sertifika-ve-belgeler.pdf"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "PDF indirilemedi.")
    }
  }

  /** IB form türünü Prisma ActivityType enum değerine eşler */
  const mapToActivityType = (type: IbActivityType): string => {
    switch (type) {
      case "education":
        return "SEMINER"
      case "event":
        return "ETKINLIK"
      case "sport":
        return "SPORT"
      case "competition":
        return "YARISMA"
      default:
        return "DIGER"
    }
  }

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!formData) return
    const result = validateActivityForm(formData)
    if (!result.valid) {
      alert("Lütfen formu kontrol edin:\n\n" + result.errors.join("\n"))
      return
    }
    if (formData.common.participantIds.length === 0) {
      alert("En az bir katılımcı seçin.")
      return
    }
    const activityDate = formData.common.startDate || formData.common.endDate
    if (!activityDate) {
      alert("Başlangıç veya bitiş tarihi girin.")
      return
    }
    setSubmitting(true)
    try {
      let duration: number | null = null
      if (formData.type === "education") {
        const d = formData.specific.durationDays
        const h = formData.specific.durationHours
        const m = formData.specific.durationMinutes
        const days = typeof d === "string" ? parseInt(d, 10) || 0 : 0
        const hours = typeof h === "string" ? parseInt(h, 10) || 0 : 0
        const mins = typeof m === "string" ? parseInt(m, 10) || 0 : 0
        duration = days * 24 * 60 + hours * 60 + mins
      }
      const certificateContents: Record<string, unknown>[] = []
      if (formData.type === "education") {
        for (let i = 0; i < formData.common.participantIds.length; i++) {
          certificateContents.push(formData.specific.certificatePdfContent ?? {})
        }
      }
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentIds: formData.common.participantIds,
          type: mapToActivityType(formData.type),
          title: formData.common.title,
          description: formData.common.description,
          activityDate,
          organizer: formData.common.organizer,
          duration: duration ?? undefined,
          participants: formData.common.participantIds.length,
          outcome: formData.common.description || undefined,
          evidence: "",
          notes: "",
          certificateContents: certificateContents.length > 0 ? certificateContents : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Faaliyet kaydedilemedi")
      }
      const count = data.count ?? formData.common.participantIds.length
      alert(`${count} adet faaliyet başarıyla kaydedildi.`)
      handleBack()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Kayıt sırasında hata oluştu.")
    } finally {
      setSubmitting(false)
    }
  }

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

  if (hasAccess === false) {
    router.push(fallbackRedirect)
    return null
  }

  return (
    <div className="p-6">
      {!selectedType ? (
        <ActivityTypeSelector onSelect={handleSelectType} />
      ) : (
        <ActivityFormLayout
          onBack={handleBack}
          formData={formData}
          participantNames={participantNames}
        >
          {formData?.type === "education" && (
            <EducationForm
              common={formData.common}
              specific={formData.specific}
              onCommonChange={updateCommon}
              onSpecificChange={updateEducationSpecific}
              participantOptions={participantOptions}
            />
          )}
          {formData?.type === "event" && (
            <EventForm
              common={formData.common}
              specific={formData.specific}
              onCommonChange={updateCommon}
              onSpecificChange={updateEventSpecific}
              participantOptions={participantOptions}
            />
          )}
          {formData?.type === "sport" && (
            <SportForm
              common={formData.common}
              specific={formData.specific}
              onCommonChange={updateCommon}
              onSpecificChange={updateSportSpecific}
              participantOptions={participantOptions}
            />
          )}
          {formData?.type === "competition" && (
            <CompetitionForm
              common={formData.common}
              specific={formData.specific}
              onCommonChange={updateCommon}
              onSpecificChange={updateCompetitionSpecific}
              participantOptions={participantOptions}
            />
          )}

          <Card>
            <CardContent className="pt-6">
              <PdfGenerator
                formData={formData}
                participants={participantsForPdf}
                onGeneratePerParticipant={
                  formData?.type === "education"
                    ? () => downloadEducationActivityPdf()
                    : async (participantId) => {
                        const p = participantsForPdf.find((x) => x.id === participantId)
                        if (p) alert(`PDF: ${p.name}\n\nEğitim dışı türler için PDF üretimi planlanıyor.`)
                      }
                }
                onGenerateAll={
                  formData?.type === "education" ? () => downloadEducationActivityPdf() : undefined
                }
              />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleBack} disabled={submitting}>
              İptal
            </Button>
          </div>
        </ActivityFormLayout>
      )}
    </div>
  )
}
