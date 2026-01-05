import { NextRequest, NextResponse } from "next/server"
import { getTripStats } from "@/lib/geziService"
import { checkGeziAccess } from "@/lib/access-control"

export async function GET(request: NextRequest) {
  // Yetki kontrolü
  const { hasAccess } = await checkGeziAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }
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

