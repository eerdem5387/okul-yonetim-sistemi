import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { generateWeeklyClubScheduleExcel } from "@/lib/clubs/weekly-club-schedule-excel"

export const dynamic = "force-dynamic"

/** GET /api/schedules/clubs/weekly-excel — öğretmen × gün haftalık kulüp programı Excel */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  }

  try {
    const buffer = await generateWeeklyClubScheduleExcel()
    const filename = `haftalik-kulup-programi-${new Date().toISOString().slice(0, 10)}.xlsx`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[weekly-club-excel]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Excel oluşturulamadı." },
      { status: 500 },
    )
  }
}
