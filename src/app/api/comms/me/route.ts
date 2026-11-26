import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveChatActor } from "@/lib/comms/identity"
import {
  canCreateClassGroup,
  canDeleteComms,
  canManageGrants,
  canManageTemplates,
  canSendClassAnnouncement,
  canSendOfficialNotice,
  isNativeOfficialSender,
  isRequestApprover,
} from "@/lib/comms/access"
import { parentBadges, staffBadges } from "@/lib/comms/unread"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const chat = await resolveChatActor(request)
  if (!chat) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (chat.kind === "parent") {
    const b = await parentBadges(chat.parentId)
    return NextResponse.json({
      actor: { kind: "parent", id: chat.parentId, displayName: chat.displayName },
      capabilities: {
        sendOfficial: false,
        sendClassAnnouncement: false,
        manageTemplates: false,
        manageGrants: false,
        approveRequests: false,
        createClassGroup: false,
        createRequest: false,
        deleteComms: false,
        showInbox: false,
        viewAllNotices: false,
      },
      badges: {
        unreadNotices: 0,
        pendingRequests: 0,
        decidedRequests: 0,
        unreadAnnouncements: b.unreadAnnouncements,
        unreadMessages: b.unreadMessages,
      },
    })
  }

  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const approveRequests = isRequestApprover(actor.department)
  const [sendOfficial, sendClassAnnouncement, badges] = await Promise.all([
    canSendOfficialNotice(actor.staffId, actor.department),
    canSendClassAnnouncement(actor.staffId, actor.department),
    staffBadges(actor.staffId, approveRequests),
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
      manageGrants: canManageGrants(actor.department),
      approveRequests,
      createClassGroup: canCreateClassGroup(actor.department),
      // Onay mercileri talep oluşturmaz; diğer tüm personel (yetkililer dahil) talep açabilir
      createRequest: !approveRequests,
      deleteComms: canDeleteComms(actor.department),
      // Yönetim hiyerarşide alıcı değildir; diğer herkes gelen kutusunu görür
      showInbox: !isNativeOfficialSender(actor.department),
      // Yönetim tüm gönderimleri (yetki verilen personelinkiler dahil) denetleyebilir
      viewAllNotices: approveRequests,
    },
    badges: { ...badges, unreadAnnouncements: 0 },
  })
}
