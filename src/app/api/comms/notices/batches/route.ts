import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { OfficialNoticeType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canSendOfficialNotice, isCommsManager } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

const TYPES: OfficialNoticeType[] = ["IHTAR", "TALIMAT", "PERSONEL_DUYURU"]

/**
 * Gönderilen iletiler — gönderim (batch) bazında özet:
 * "İdari Duyuru · 82 alıcı · 61 gördü / 21 bekliyor".
 * scope=all: yönetim, yetki verilen personelin gönderimleri dahil tümünü görür.
 */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const manager = isCommsManager(actor.department)
  if (!manager && !(await canSendOfficialNotice(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const sp = request.nextUrl.searchParams
  const scope = sp.get("scope") === "all" && manager ? "all" : "mine"
  const type = sp.get("type") as OfficialNoticeType | null

  const where: Prisma.OfficialNoticeWhereInput = {
    deletedAt: null,
    ...(scope === "mine" ? { senderStaffId: actor.staffId } : {}),
    ...(type && TYPES.includes(type) ? { type } : {}),
  }

  const groups = await prisma.officialNotice.groupBy({
    by: ["batchId"],
    where,
    _count: { _all: true },
    _max: { createdAt: true, remindedAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 150,
  })
  const batchIds = groups.map((g) => g.batchId)
  if (!batchIds.length) return NextResponse.json({ batches: [] })

  const [seenGroups, reps] = await Promise.all([
    prisma.officialNotice.groupBy({
      by: ["batchId"],
      where: { ...where, batchId: { in: batchIds }, seenAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.officialNotice.findMany({
      where: { ...where, batchId: { in: batchIds } },
      distinct: ["batchId"],
      orderBy: { createdAt: "asc" },
      select: {
        batchId: true,
        type: true,
        subject: true,
        body: true,
        createdAt: true,
        senderStaff: { select: { id: true, firstName: true, lastName: true } },
        recipientStaff: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ])
  const seenMap = new Map(seenGroups.map((g) => [g.batchId, g._count._all]))
  const repMap = new Map(reps.map((r) => [r.batchId, r]))

  const batches = groups
    .map((g) => {
      const rep = repMap.get(g.batchId)
      if (!rep) return null
      const total = g._count._all
      const seen = seenMap.get(g.batchId) ?? 0
      return {
        batchId: g.batchId,
        type: rep.type,
        subject: rep.subject,
        body: rep.body,
        createdAt: rep.createdAt,
        sender: rep.senderStaff,
        /** Tek alıcılı gönderimde alıcı adı listede gösterilir */
        singleRecipient: total === 1 ? rep.recipientStaff : null,
        total,
        seen,
        unseen: total - seen,
        lastRemindedAt: g._max.remindedAt,
        mine: rep.senderStaff.id === actor.staffId,
      }
    })
    .filter(Boolean)

  return NextResponse.json({ batches, scope })
}
