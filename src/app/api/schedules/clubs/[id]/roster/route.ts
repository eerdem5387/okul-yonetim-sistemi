import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assignStudentToClubGroup } from "@/lib/schedules/student-activity-conflicts"
import {
  excludeStudentFromClubSchedule,
  restoreStudentToClubSchedule,
} from "@/lib/schedules/club-schedule-exclusions"
import { loadClubScheduleRoster } from "@/lib/schedules/club-schedule-roster"

export const dynamic = "force-dynamic"

/**
 * GET /api/schedules/clubs/[id]/roster
 * Bu etüt saatindeki aktif / muaf / gruba eklenebilir öğrenciler.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { roster, error } = await loadClubScheduleRoster(id)
    if (error || !roster) {
      return NextResponse.json({ error: error || "Bulunamadı" }, { status: 404 })
    }
    return NextResponse.json({ roster })
  } catch (e) {
    console.error("Error loading club schedule roster:", e)
    return NextResponse.json({ error: "Liste alınamadı" }, { status: 500 })
  }
}

/**
 * POST /api/schedules/clubs/[id]/roster
 * action: exclude | restore | add_to_group
 * body: { action, studentId, note? }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clubScheduleId } = await context.params
    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? "").trim()
    const studentId = String(body.studentId ?? "").trim()
    const note = typeof body.note === "string" ? body.note : undefined

    if (!studentId) {
      return NextResponse.json({ error: "studentId zorunludur" }, { status: 400 })
    }

    if (action === "exclude") {
      const result = await excludeStudentFromClubSchedule({
        studentId,
        clubScheduleId,
        note: note || "Haftalık program: bu saatten çıkarıldı",
      })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      const { roster } = await loadClubScheduleRoster(clubScheduleId)
      return NextResponse.json({ success: true, message: result.excluded, roster })
    }

    if (action === "restore") {
      const result = await restoreStudentToClubSchedule({
        studentId,
        clubScheduleId,
      })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      const { roster } = await loadClubScheduleRoster(clubScheduleId)
      return NextResponse.json({ success: true, message: result.restored, roster })
    }

    if (action === "add_to_group") {
      const schedule = await prisma.clubSchedule.findUnique({
        where: { id: clubScheduleId },
        select: { clubGroupId: true },
      })
      if (!schedule?.clubGroupId) {
        return NextResponse.json(
          { error: "Bu programa grup bağlı değil; önce kulüp grubu atayın" },
          { status: 400 }
        )
      }
      const result = await assignStudentToClubGroup({
        studentId,
        clubGroupId: schedule.clubGroupId,
      })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      const { roster } = await loadClubScheduleRoster(clubScheduleId)
      return NextResponse.json({ success: true, message: result.assigned, roster })
    }

    return NextResponse.json(
      { error: "action: exclude | restore | add_to_group" },
      { status: 400 }
    )
  } catch (e) {
    console.error("Error updating club schedule roster:", e)
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 })
  }
}
