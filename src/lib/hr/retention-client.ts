import type { StaffRetentionOutcome } from "@prisma/client"
import { getAuthHeaders } from "@/components/hr/hr-utils"

export interface SaveRetentionMeetingInput {
  staffId: string
  meetingAt: string
  outcome: StaffRetentionOutcome
  notes?: string | null
}

export async function saveRetentionMeeting(input: SaveRetentionMeetingInput) {
  const res = await fetch("/api/hr/retention/cycles", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      staffId: input.staffId,
      meetingAt: input.meetingAt,
      outcome: input.outcome,
      notes: input.notes ?? null,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Kayıt oluşturulamadı")
  return data
}

export async function updateRetentionMeeting(
  meetingId: string,
  input: Omit<SaveRetentionMeetingInput, "staffId">
) {
  const res = await fetch(`/api/hr/retention/meetings/${meetingId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
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

export async function removeStaffFromList(staffId: string) {
  const res = await fetch(`/api/staff/${staffId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Personel listeden kaldırılamadı")
}
