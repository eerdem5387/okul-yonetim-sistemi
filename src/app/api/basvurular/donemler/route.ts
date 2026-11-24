import { requireStaff } from "@/lib/auth/api-guard"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AKTIF_BURSLULUK_DONEM } from "@/lib/bursluluk"

/** Bursluluk başvurularının bulunduğu dönemler ve başvuru sayıları (en yeni önce). */
export async function GET(request: NextRequest) {
  const authGuard = await requireStaff(request)
  if (!authGuard.ok) return authGuard.response
  try {
    const rows = await prisma.basvuru.groupBy({ by: ["donem"], _count: { _all: true } })
    const donemler = rows
      .map((r) => ({ donem: r.donem, count: r._count._all, aktif: r.donem === AKTIF_BURSLULUK_DONEM }))
      .sort((a, b) => b.donem.localeCompare(a.donem))
    return NextResponse.json({ aktif: AKTIF_BURSLULUK_DONEM, donemler })
  } catch (error) {
    console.error("Error fetching donemler:", error)
    return NextResponse.json({ error: "Dönemler alınamadı" }, { status: 500 })
  }
}
