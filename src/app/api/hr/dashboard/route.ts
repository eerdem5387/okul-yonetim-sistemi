import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor, requireAdmin } from "@/lib/hr/actor"
import { getTodayLeaveSummary } from "@/lib/hr/leaves"
import { countStaffInClassNow } from "@/lib/hr/schedule"

export const dynamic = "force-dynamic"

/**
 * GET /api/hr/dashboard
 * - totalActiveStaff: aktif personel sayısı
 * - onLeaveToday: bugün izinli olanlar (detaylı liste + sayı)
 * - inClassNow: şu an derste olan (benzersiz öğretmen) sayısı
 * - pendingLeaves: bekleyen izin talepleri
 */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!requireAdmin(actor)) {
    return NextResponse.json({ error: "Bu sayfaya erişim yetkiniz yok" }, { status: 403 })
  }

  const [totalActiveStaff, onLeaveToday, inClassNow, pendingLeaves] = await Promise.all([
    prisma.staff.count({ where: { isActive: true } }),
    getTodayLeaveSummary(),
    countStaffInClassNow(),
    prisma.staffLeave.findMany({
      where: { status: "PENDING" },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  return NextResponse.json({
    totalActiveStaff,
    onLeaveToday: {
      count: onLeaveToday.length,
      items: onLeaveToday,
    },
    inClassNow,
    pendingLeaves,
  })
}
