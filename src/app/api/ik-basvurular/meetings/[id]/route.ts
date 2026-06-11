import { NextRequest, NextResponse } from "next/server"
import type { HrApplicationMeetingOutcome } from "@prisma/client"
import { requireHrRecruitmentAccess } from "@/lib/hr-recruitment/access"
import {
  APPLICATION_MEETING_OUTCOMES,
  deleteApplicationMeeting,
  listApplicationMeetings,
  updateApplicationMeeting,
} from "@/lib/hr-recruitment/meetings"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(
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

  if (outcome && !APPLICATION_MEETING_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "Geçersiz görüşme sonucu" }, { status: 400 })
  }

  let meetingDate: Date | undefined
  if (meetingAt) {
    meetingDate = new Date(meetingAt)
    if (Number.isNaN(meetingDate.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 })
    }
  }

  try {
    const meeting = await updateApplicationMeeting({
      meetingId: id,
      meetingAt: meetingDate,
      outcome,
      notes: notes !== undefined ? notes : undefined,
    })

    const data = await listApplicationMeetings(meeting.applicationId)
    return NextResponse.json({ meeting, ...data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Güncellenemedi" },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireHrRecruitmentAccess(request, "delete")
  if (gate.response) return gate.response

  const { id } = await context.params

  try {
    const existing = await prisma.hrJobApplicationMeeting.findUnique({
      where: { id },
      select: { applicationId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Görüşme bulunamadı" }, { status: 404 })
    }

    await deleteApplicationMeeting(id)
    const data = await listApplicationMeetings(existing.applicationId)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Silinemedi" },
      { status: 400 }
    )
  }
}
