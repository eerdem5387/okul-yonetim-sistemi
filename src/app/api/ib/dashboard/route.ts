import { NextResponse } from "next/server"
import { getIbViewerDashboardStats } from "@/lib/ib-viewer-data"

/** IB Viewer dashboard: onaylı activity-events katılımları */
export async function GET() {
  try {
    const data = await getIbViewerDashboardStats()
    return NextResponse.json(data)
  } catch (error) {
    console.error("IB dashboard error:", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
