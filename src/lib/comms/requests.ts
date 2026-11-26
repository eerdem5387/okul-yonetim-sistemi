import type { StaffCommsRequestStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { notifyStaffComms } from "@/lib/comms/notify"

export const REQUEST_INCLUDE = {
  requesterStaff: { select: { id: true, firstName: true, lastName: true, department: true } },
  decidedByStaff: { select: { id: true, firstName: true, lastName: true } },
  template: { select: { id: true, title: true } },
} as const

/**
 * Bekleyen talepleri karara bağlar (yarış güvenli: yalnızca PENDING olanlar güncellenir)
 * ve talep sahiplerine bildirim gönderir.
 */
export async function decideRequests(params: {
  ids: string[]
  decision: Extract<StaffCommsRequestStatus, "APPROVED" | "REJECTED">
  note: string | null
  decider: { staffId: string; firstName: string; lastName: string }
}) {
  const pending = await prisma.staffCommsRequest.findMany({
    where: { id: { in: params.ids }, status: "PENDING" },
    select: { id: true, subject: true, requesterStaffId: true },
  })
  if (!pending.length) return { updated: 0 }

  const now = new Date()
  const res = await prisma.staffCommsRequest.updateMany({
    where: { id: { in: pending.map((p) => p.id) }, status: "PENDING" },
    data: {
      status: params.decision,
      decidedByStaffId: params.decider.staffId,
      decidedAt: now,
      decisionNote: params.note,
      rejectReason: params.decision === "REJECTED" ? params.note : null,
      decisionSeenAt: null,
    },
  })

  const deciderName = `${params.decider.firstName} ${params.decider.lastName}`.trim()
  const verb = params.decision === "APPROVED" ? "onaylandı" : "reddedildi"
  for (const p of pending) {
    notifyStaffComms({
      staffIds: [p.requesterStaffId],
      title: `Talebiniz ${verb}`,
      body: `${p.subject} · ${deciderName}${params.note ? ` — ${params.note}` : ""}`,
      data: { kind: "comms_request_decided", tab: "requests", id: p.id },
      official: true,
    })
  }
  return { updated: res.count }
}
