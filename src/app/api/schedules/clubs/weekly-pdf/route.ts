import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { generateWeeklyClubSchedulePdf } from "@/lib/clubs/weekly-club-schedule-pdf"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** GET /api/schedules/clubs/weekly-pdf — öğretmen × gün haftalık kulüp programı PDF */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  }

  try {
    const pdf = await generateWeeklyClubSchedulePdf()
    const filename = `haftalik-kulup-programi-${new Date().toISOString().slice(0, 10)}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[weekly-club-pdf]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF oluşturulamadı." },
      { status: 500 },
    )
  }
}
