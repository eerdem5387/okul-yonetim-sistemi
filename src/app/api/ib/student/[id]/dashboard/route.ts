import { NextRequest, NextResponse } from "next/server"
import { getIbViewerStudentDashboard } from "@/lib/ib-viewer-data"

/** Öğrenci bazlı IB Viewer dashboard (onaylı katılımlar) */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await context.params
    const data = await getIbViewerStudentDashboard(studentId)

    if (!data) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("IB student dashboard error:", error)
    return NextResponse.json({ error: "Failed to load student dashboard" }, { status: 500 })
  }
}
