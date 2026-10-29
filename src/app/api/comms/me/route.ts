import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveChatActor } from "@/lib/comms/identity"
import {
  canCreateClassGroup,
  canManageTemplates,
  canSendClassAnnouncement,
  canSendOfficialNotice,
  isRequestApprover,
} from "@/lib/comms/access"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (chat.kind === "parent") {
    const unreadAnnouncements = await prisma.classAnnouncementAck.count({
      where: { parentId: chat.parentId, seenAt: null },
    })
    return NextResponse.json({
      actor: { kind: "parent", id: chat.parentId, displayName: chat.displayName },
      capabilities: {
        sendOfficial: false,
        sendClassAnnouncement: false,
        manageTemplates: false,
        approveRequests: false,
        createClassGroup: false,
        createRequest: false,
      },
      badges: { unreadNotices: 0, pendingRequests: 0, unreadAnnouncements },
    })
  }

  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const [sendOfficial, sendClassAnnouncement, unreadNotices, pendingRequests] = await Promise.all([
    canSendOfficialNotice(actor.staffId, actor.department),
    canSendClassAnnouncement(actor.staffId, actor.department),
    prisma.officialNotice.count({ where: { recipientStaffId: actor.staffId, seenAt: null } }),
    isRequestApprover(actor.department)
      ? prisma.staffCommsRequest.count({ where: { status: "PENDING" } })
      : prisma.staffCommsRequest.count({
          where: { requesterStaffId: actor.staffId, status: "PENDING" },
        }),
  ])

  return NextResponse.json({
    actor: {
      kind: "staff",
      id: actor.staffId,
      department: actor.department,
      name: `${actor.firstName} ${actor.lastName}`.trim(),
    },
    capabilities: {
      sendOfficial,
      sendClassAnnouncement,
      manageTemplates: canManageTemplates(actor.department),
      approveRequests: isRequestApprover(actor.department),
      createClassGroup: canCreateClassGroup(actor.department),
      createRequest: true,
    },
    badges: { unreadNotices, pendingRequests, unreadAnnouncements: 0 },
  })
}
