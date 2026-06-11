import { NextRequest, NextResponse } from "next/server"
import type { HrApplicationMeetingOutcome } from "@prisma/client"
import { requireHrRecruitmentAccess } from "@/lib/hr-recruitment/access"
import {
  APPLICATION_MEETING_OUTCOMES,
  createApplicationMeeting,
  listApplicationMeetings,
} from "@/lib/hr-recruitment/meetings"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireHrRecruitmentAccess(request, "view")
  if (gate.response) return gate.response

  const { id } = await context.params
  const data = await listApplicationMeetings(id)
  if (!data) {
    return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireHrRecruitmentAccess(request, "edit")
  if (gate.response) return gate.response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })

  const { meetingAt, outcome, notes } = body as {
    meetingAt?: string
    outcome?: HrApplicationMeetingOutcome
    notes?: string | null
  }

  if (!meetingAt) {
    return NextResponse.json({ error: "Görüşme tarihi zorunlu" }, { status: 400 })
  }
  if (!outcome || !APPLICATION_MEETING_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "Geçersiz görüşme sonucu" }, { status: 400 })
  }

  const meetingDate = new Date(meetingAt)
  if (Number.isNaN(meetingDate.getTime())) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 })
  }

  try {
    const meeting = await createApplicationMeeting({
      applicationId: id,
      meetingAt: meetingDate,
      outcome,
      notes: notes ?? null,
      conductedById: gate.actor!.staffId,
    })
    const data = await listApplicationMeetings(id)
    return NextResponse.json({ meeting, ...data }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kayıt oluşturulamadı" },
      { status: 400 }
    )
  }
}
