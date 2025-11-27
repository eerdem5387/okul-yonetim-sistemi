import { NextResponse } from "next/server"
import { getTripStats } from "@/lib/geziService"

export async function GET() {
  try {
    const stats = await getTripStats()
    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "İstatistikler alınamadı" },
      { status: 500 }
    )
  }
}

