import { NextRequest, NextResponse } from "next/server"
import { exportTripApplications } from "@/lib/geziService"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Geçersiz gezi ID" },
        { status: 400 }
      )
    }

    const blob = await exportTripApplications(id)
    
    if (!blob || !(blob instanceof Blob)) {
      throw new Error("Geçersiz Excel dosyası")
    }
    
    const buffer = await blob.arrayBuffer()

    if (!buffer || buffer.byteLength === 0) {
      throw new Error("Boş Excel dosyası")
    }

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

