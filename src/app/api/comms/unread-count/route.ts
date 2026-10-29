import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveCommsActor } from "@/lib/comms/identity"
import { isRequestApprover } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const actor = await resolveCommsActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (actor.kind === "parent") {
    const count = await prisma.classAnnouncementAck.count({
      where: { parentId: actor.parentId, seenAt: null },
    })
    return NextResponse.json({ count })
  }

  const [notices, pending] = await Promise.all([
    prisma.officialNotice.count({ where: { recipientStaffId: actor.staffId, seenAt: null } }),
    isRequestApprover(actor.department)
      ? prisma.staffCommsRequest.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
  ])

  return NextResponse.json({ count: notices + pending })
}
