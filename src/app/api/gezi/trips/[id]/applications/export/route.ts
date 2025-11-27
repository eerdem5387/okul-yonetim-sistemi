import { NextRequest, NextResponse } from "next/server"
import { exportTripApplications } from "@/lib/geziService"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const blob = await exportTripApplications(id)
    const buffer = await blob.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="gezi-basvurular.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Error exporting applications:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Excel export başarısız" },
      { status: 500 }
    )
  }
}

