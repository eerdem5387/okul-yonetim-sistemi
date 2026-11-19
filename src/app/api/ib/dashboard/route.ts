import { requireStaffOrIbViewer } from "@/lib/auth/api-guard"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getIbViewerDashboardStats } from "@/lib/ib-viewer-data"

/** IB Viewer dashboard: onaylı activity-events katılımları */
export async function GET(request: NextRequest) {
  const authGuard = await requireStaffOrIbViewer(request)
  if (!authGuard.ok) return authGuard.response
  try {
    const data = await getIbViewerDashboardStats()
    return NextResponse.json(data)
  } catch (error) {
    console.error("IB dashboard error:", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
