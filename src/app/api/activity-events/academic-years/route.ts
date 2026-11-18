import { NextRequest, NextResponse } from "next/server"
import { checkActivityAccess } from "@/lib/access-control"
import { listActivityAcademicYears } from "@/lib/activity-academic-year"

/**
 * GET /api/activity-events/academic-years
 * Faaliyet Yönetimi arşiv seçicisi: akademik yıllar (yeniden eskiye), aktif yıl ve yıl başına faaliyet sayısı.
 */
export async function GET(request: NextRequest) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }
  try {
    return NextResponse.json(await listActivityAcademicYears())
  } catch (error) {
    console.error("GET /api/activity-events/academic-years error:", error)
    return NextResponse.json({ error: "Akademik yıllar alınamadı" }, { status: 500 })
  }
}
