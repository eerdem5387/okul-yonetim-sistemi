import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaff, requireStaffAccess } from "@/lib/auth/api-guard"
import { approvalSlotFor } from "@/lib/finance/expense-approval"

type PendingItem = { key: string; label: string; count: number; href: string }

/**
 * GET /api/me/pending — oturumdaki kişinin karar verebileceği bekleyen işlerin sayıları.
 * Yalnızca sayar; hiçbir kaydı değiştirmez. Arayüz ayrıca kişinin menüsünde olmayan
 * sayfaların satırlarını gizler.
 */
export async function GET(request: NextRequest) {
  const authGuard = await requireStaff(request)
  if (!authGuard.ok) return authGuard.response
  const actor = authGuard.value
  const items: PendingItem[] = []

  const slot = approvalSlotFor(actor.department)
  const [panel, clubs] = await Promise.all([
    requireStaffAccess(request, { module: "approval_panel", action: "view" }),
    requireStaffAccess(request, { module: "clubs", action: "edit" }),
  ])

  const [expense, schedules, memberships, leaves] = await Promise.all([
    slot
      ? prisma.financeExpenseRequest.count({
          where: {
            status: "PENDING",
            ...(slot === "founder" ? { founderApprovedAt: null } : { principalApprovedAt: null }),
          },
        })
      : 0,
    panel.ok ? prisma.scheduleApproval.count({ where: { status: "PENDING" } }) : 0,
    clubs.ok ? prisma.clubMembershipRequest.count({ where: { status: "PENDING" } }) : 0,
    actor.isAdmin ? prisma.staffLeave.count({ where: { status: "PENDING" } }) : 0,
  ])

  if (slot) items.push({ key: "expense", label: "Onayınızı bekleyen harcama talepleri", count: expense, href: "/finans/talepler" })
  if (panel.ok) items.push({ key: "schedules", label: "Onay bekleyen ders programları", count: schedules, href: "/onay-paneli" })
  if (clubs.ok) items.push({ key: "clubs", label: "Kulüp üyelik başvuruları", count: memberships, href: "/clubs/uye-onaylari" })
  if (actor.isAdmin) items.push({ key: "leaves", label: "Onay bekleyen izin talepleri", count: leaves, href: "/personel/izinler" })

  return NextResponse.json({ items })
}
