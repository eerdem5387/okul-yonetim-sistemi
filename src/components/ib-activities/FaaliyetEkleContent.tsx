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
  emptyCommon,
  emptyEducationSpecific,
  emptyEventSpecific,
  emptySportSpecific,
  emptyCompetitionSpecific,
  IB_ACTIVITY_TYPE_LABELS,
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
  const [loadingStudents, setLoadingStudents] = useState(false)

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

  const updateEducationSpecific = (specific: IbActivityFormData extends { type: "education" } ? IbActivityFormData["specific"] : never) => {
    if (!formData || formData.type !== "education") return
    setFormData({ ...formData, specific })
  }
  const updateEventSpecific = (specific: IbActivityFormData extends { type: "event" } ? IbActivityFormData["specific"] : never) => {
    if (!formData || formData.type !== "event") return
    setFormData({ ...formData, specific })
  }
  const updateSportSpecific = (specific: IbActivityFormData extends { type: "sport" } ? IbActivityFormData["specific"] : never) => {
    if (!formData || formData.type !== "sport") return
    setFormData({ ...formData, specific })
  }
  const updateCompetitionSpecific = (specific: IbActivityFormData extends { type: "competition" } ? IbActivityFormData["specific"] : never) => {
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
        }
      })
    : []

  const handleSubmit = () => {
    const result = validateActivityForm(formData)
    if (!result.valid) {
      alert("Lütfen formu kontrol edin:\n\n" + result.errors.join("\n"))
      return
    }
    alert(
      "Form doğrulandı. Kaydetme ve PDF üretimi için API entegrasyonu sonraki adımda eklenecek.\n\n" +
        `Tür: ${formData ? IB_ACTIVITY_TYPE_LABELS[formData.type] : ""}\n` +
        `Katılımcı sayısı: ${formData?.common.participantIds.length ?? 0}`
    )
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
                onGeneratePerParticipant={(participantId) => {
                  // Her katılımcı için ayrı PDF – API entegrasyonunda bu id ile tekil PDF isteği atılacak
                  const p = participantsForPdf.find((x) => x.id === participantId)
                  if (p) alert(`PDF üretimi: ${p.name} (${p.tcNumber})\n\nAPI entegrasyonu sonrasında bu katılımcı için PDF indirilecek.`)
                }}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSubmit}>Kaydet</Button>
            <Button type="button" variant="outline" onClick={handleBack}>
              İptal
            </Button>
          </div>
        </ActivityFormLayout>
      )}
    </div>
  )
}
