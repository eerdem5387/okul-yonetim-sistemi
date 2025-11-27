import { NextResponse } from "next/server"
import { getTripStats } from "@/lib/geziService"

export async function GET() {
  try {
    const stats = await getTripStats()
    
    // Validate stats structure
    if (!stats || typeof stats !== "object") {
      throw new Error("Geçersiz istatistik formatı")
    }
    
    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "İstatistikler alınamadı" },
      { status: 500 }
    )
  }
}

