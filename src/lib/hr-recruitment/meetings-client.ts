import type { HrApplicationMeetingOutcome } from "@prisma/client"
import { staffAuthHeaders } from "@/lib/permissions/client"

export interface SaveApplicationMeetingInput {
  applicationId: string
  meetingAt: string
  outcome: HrApplicationMeetingOutcome
  notes?: string | null
}

export async function saveApplicationMeeting(input: SaveApplicationMeetingInput) {
  const res = await fetch(`/api/ik-basvurular/${input.applicationId}/meetings`, {
    method: "POST",
    headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      meetingAt: input.meetingAt,
      outcome: input.outcome,
      notes: input.notes ?? null,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Kayıt oluşturulamadı")
  return data
}

export async function updateApplicationMeeting(
  meetingId: string,
  input: Omit<SaveApplicationMeetingInput, "applicationId">
) {
  const res = await fetch(`/api/ik-basvurular/meetings/${meetingId}`, {
    method: "PATCH",
    headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      meetingAt: input.meetingAt,
      outcome: input.outcome,
      notes: input.notes ?? null,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Güncellenemedi")
  return data
}

export async function fetchApplicationMeetings(applicationId: string) {
  const res = await fetch(`/api/ik-basvurular/${applicationId}/meetings`, {
    headers: staffAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Görüşmeler yüklenemedi")
  return data as {
    application: {
      id: string
      fullName: string
      appliedBranch: string
      status: string
      lastMeetingAt: string | null
      lastMeetingOutcome: HrApplicationMeetingOutcome | null
    }
    meetings: Array<{
      id: string
      meetingAt: string
      outcome: HrApplicationMeetingOutcome
      notes: string | null
      conductedBy: { id: string; firstName: string; lastName: string } | null
    }>
  }
}
