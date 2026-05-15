import { NextRequest, NextResponse } from "next/server"
import { resolveChatActor } from "@/lib/chat/identity"
import {
  canStartPrivateWithParent,
  canStartPrivateWithStaff,
} from "@/lib/chat/access-control"
import {
  appendMessage,
  findOrCreatePrivateConversation,
} from "@/lib/chat/repository"
import { isAnnouncementCreatorDepartment } from "@/lib/chat/identity"
import { prisma } from "@/lib/prisma"
import {
  triggerNewMessage,
  userParentChannel,
  userStaffChannel,
} from "@/lib/chat/pusher-server"

export const dynamic = "force-dynamic"

interface MassBody {
  body: string
  attachmentUrl?: string | null
  type?: "TEXT" | "IMAGE" | "DOCUMENT"
  recipients: Array<{ staffId?: string; parentId?: string }>
}

/**
 * POST /api/chat/mass-message
 *
 * BCC mantığı: Yöneticinin seçtiği N hedefe ayrı ayrı PRIVATE sohbet açıp aynı mesajı her birine post eder.
 * Yetki: Sadece yöneticiler (SUPER_ADMIN, MUDUR, MUDUR_YARDIMCISI, OGRENCI_ISLERI).
 */
export async function POST(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  if (actor.kind !== "staff" || !isAnnouncementCreatorDepartment(actor.department)) {
    return NextResponse.json({ error: "Toplu mesaj yetkiniz yok" }, { status: 403 })
  }

  let body: MassBody
  try {
    body = (await request.json()) as MassBody
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  const text = (body.body || "").trim()
  const messageType = body.type ?? "TEXT"
  const attachmentUrl = body.attachmentUrl || null

  if (messageType === "TEXT" && !text) {
    return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 })
  }
  if ((messageType === "IMAGE" || messageType === "DOCUMENT") && !attachmentUrl) {
    return NextResponse.json({ error: "Ek (attachment) zorunludur" }, { status: 400 })
  }
  if (!Array.isArray(body.recipients) || body.recipients.length === 0) {
    return NextResponse.json({ error: "Alıcı listesi boş" }, { status: 400 })
  }
  if (body.recipients.length > 200) {
    return NextResponse.json({ error: "Tek seferde en fazla 200 alıcı seçilebilir" }, { status: 400 })
  }

  const sent: string[] = []
  const skipped: Array<{ target: { staffId?: string; parentId?: string }; reason: string }> = []

  for (const r of body.recipients) {
    try {
      if ((r.staffId && r.parentId) || (!r.staffId && !r.parentId)) {
        skipped.push({ target: r, reason: "invalid_target" })
        continue
      }
      const allowed = r.staffId
        ? await canStartPrivateWithStaff(actor, r.staffId)
        : await canStartPrivateWithParent(actor, r.parentId!)
      if (!allowed) {
        skipped.push({ target: r, reason: "forbidden" })
        continue
      }

      const convId = await findOrCreatePrivateConversation(actor, r)
      const msg = await appendMessage(actor, {
        conversationId: convId,
        body: text,
        type: messageType,
        attachmentUrl,
      })

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: convId },
        select: { staffId: true, parentId: true },
      })
      const channels: string[] = []
      for (const p of participants) {
        if (p.staffId) channels.push(userStaffChannel(p.staffId))
        if (p.parentId) channels.push(userParentChannel(p.parentId))
      }

      const senderDisplay = `${actor.firstName} ${actor.lastName}`.trim()
      await triggerNewMessage(
        convId,
        {
          id: msg.id,
          conversationId: msg.conversationId,
          body: msg.body,
          type: msg.type,
          attachmentUrl: msg.attachmentUrl,
          createdAt: msg.createdAt.toISOString(),
          sender: { kind: "staff", id: actor.staffId, displayName: senderDisplay },
        },
        channels
      )
      sent.push(convId)
    } catch (err) {
      console.error("[mass-message] error:", err)
      skipped.push({ target: r, reason: "error" })
    }
  }

  return NextResponse.json({ sent: sent.length, skipped })
}
