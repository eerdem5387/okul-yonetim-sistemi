import { NextRequest, NextResponse } from "next/server"
import type { StaffRetentionOutcome } from "@prisma/client"
import { requireHrRetentionAccess } from "@/lib/hr-retention/access"
import {
  RETENTION_OUTCOMES,
  deleteRetentionMeeting,
  updateRetentionMeeting,
} from "@/lib/hr/retention"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireHrRetentionAccess(request, "edit")
  if (auth.response) return auth.response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })

  const { meetingAt, outcome, notes } = body as {
    meetingAt?: string
    outcome?: StaffRetentionOutcome
    notes?: string | null
  }

  if (outcome && !RETENTION_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "Geçersiz görüşme sonucu" }, { status: 400 })
  }

  let parsedDate: Date | undefined
  if (meetingAt) {
    parsedDate = new Date(meetingAt)
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 })
    }
  }

  try {
    const meeting = await updateRetentionMeeting({
      meetingId: id,
      meetingAt: parsedDate,
      outcome,
      notes,
    })
    return NextResponse.json({ meeting })
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
  const auth = await requireHrRetentionAccess(request, "delete")
  if (auth.response) return auth.response

  const { id } = await context.params

  try {
    await deleteRetentionMeeting(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Silinemedi" },
      { status: 400 }
    )
  }
}
