import { requireStaff } from "@/lib/auth/api-guard"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { buildOcgScheduleInsights } from "@/lib/clubs/ocg-schedule-insights"

export const dynamic = "force-dynamic"

/** GET /api/clubs/ocg-insights — kulüp × ÖÇG etüt çakışma analizi (salt okunur) */
export async function GET(request: NextRequest) {
  const authGuard = await requireStaff(request)
  if (!authGuard.ok) return authGuard.response
  try {
    const data = await buildOcgScheduleInsights()
    return NextResponse.json(data)
  } catch (error) {
    console.error("ocg-insights:", error)
    return NextResponse.json(
      { error: "ÖÇG uyum analizi alınamadı" },
      { status: 500 }
    )
  }
}
