import { prisma } from "@/lib/prisma"
import type { StaffActor } from "@/lib/hr/actor"
import { isCommsManager } from "@/lib/comms/access"

/** Gönderim (batch) satırları + erişim: gönderen veya yönetim */
export async function loadBatchForActor(batchId: string, actor: StaffActor) {
  const rows = await prisma.officialNotice.findMany({
    where: { batchId, deletedAt: null },
    include: {
      senderStaff: { select: { id: true, firstName: true, lastName: true, department: true } },
      recipientStaff: { select: { id: true, firstName: true, lastName: true, department: true } },
    },
    orderBy: [{ seenAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
  })
  if (!rows.length) return { rows, allowed: false as const }
  const allowed = rows[0].senderStaffId === actor.staffId || isCommsManager(actor.department)
  return { rows, allowed }
}
