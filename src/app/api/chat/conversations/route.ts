import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/chat/identity"
import {
  canCreateAnnouncement,
  canCreateGroup,
  canStartPrivateWithParent,
  canStartPrivateWithStaff,
} from "@/lib/chat/access-control"
import {
  appendMessage,
  createGroupConversation,
  findOrCreatePrivateConversation,
  listConversationsForActor,
} from "@/lib/chat/repository"
import { syncSystemChannels, teacherIdsForBranch } from "@/lib/chat/system-channels"
import {
  triggerConversationUpdated,
  userParentChannel,
  userStaffChannel,
} from "@/lib/chat/pusher-server"

export const dynamic = "force-dynamic"

interface ParticipantPayload {
  staffId?: string
  parentId?: string
  role?: "ADMIN" | "MEMBER"
}

interface CreateBody {
  type: "PRIVATE" | "GROUP" | "ANNOUNCEMENT"
  title?: string
  message?: string
  branchId?: string
  classId?: string
  studentId?: string
  target?: { staffId?: string; parentId?: string }
  participants?: ParticipantPayload[]
}

/** GET: Kullanıcının sohbetleri */
export async function GET(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (actor.kind === "staff") {
    try {
      await syncSystemChannels()
    } catch (err) {
      console.error("[chat] kanal senkronu", err)
    }
  }
  const q = request.nextUrl.searchParams.get("q") || undefined
  const conversations = await listConversationsForActor(actor, q)
  return NextResponse.json({ conversations }, { headers: { "Cache-Control": "no-store" } })
}

/** POST: Yeni sohbet (PRIVATE / GROUP / ANNOUNCEMENT) */
export async function POST(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  if (body.type === "PRIVATE") {
    const target = body.target || {}
    if (!target.staffId && !target.parentId) {
      return NextResponse.json({ error: "Hedef belirtilmedi" }, { status: 400 })
    }
    if (target.staffId && target.parentId) {
      return NextResponse.json({ error: "Tek hedef seçilmeli" }, { status: 400 })
    }

    const allowed = target.staffId
      ? await canStartPrivateWithStaff(actor, target.staffId)
      : await canStartPrivateWithParent(actor, target.parentId!)
    if (!allowed) {
      return NextResponse.json(
        { error: "Bu kişiyle sohbet başlatma yetkiniz yok" },
        { status: 403 }
      )
    }

    const id = await findOrCreatePrivateConversation(actor, target, {
      studentId: body.studentId,
    })
    return NextResponse.json({ id, type: "PRIVATE" }, { status: 201 })
  }

  if (body.type === "ANNOUNCEMENT" && body.branchId) {
    if (!canCreateAnnouncement(actor)) {
      return NextResponse.json({ error: "Duyuru oluşturma yetkiniz yok" }, { status: 403 })
    }
    const text = (body.message || "").trim()
    if (!text) {
      return NextResponse.json({ error: "Duyuru metni zorunludur" }, { status: 400 })
    }
    let audience: { name: string; staffIds: string[] }
    try {
      audience = await teacherIdsForBranch(body.branchId)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Branş bulunamadı" },
        { status: 400 }
      )
    }
    if (audience.staffIds.length === 0) {
      return NextResponse.json({ error: "Bu branşta öğretmen yok" }, { status: 400 })
    }
    const title = body.title?.trim() || `${audience.name} duyurusu`
    const id = await createGroupConversation(actor, {
      title,
      type: "ANNOUNCEMENT",
      branchId: body.branchId,
      participants: audience.staffIds.map((staffId) => ({ staffId })),
    })
    if (actor.kind === "staff") {
      await appendMessage(actor, { conversationId: id, body: text })
    }
    const channels = audience.staffIds.map((staffId) => userStaffChannel(staffId))
    if (actor.kind === "staff") channels.push(userStaffChannel(actor.staffId))
    await triggerConversationUpdated(channels, { conversationId: id, reason: "created" })
    return NextResponse.json({ id, type: "ANNOUNCEMENT" }, { status: 201 })
  }

  if (body.type === "GROUP" || body.type === "ANNOUNCEMENT") {
    if (body.type === "GROUP" && !canCreateGroup(actor)) {
      return NextResponse.json({ error: "Grup oluşturma yetkiniz yok" }, { status: 403 })
    }
    if (body.type === "ANNOUNCEMENT" && !canCreateAnnouncement(actor)) {
      return NextResponse.json({ error: "Duyuru oluşturma yetkiniz yok" }, { status: 403 })
    }
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Başlık zorunludur" }, { status: 400 })
    }
    if (!Array.isArray(body.participants) || body.participants.length === 0) {
      return NextResponse.json({ error: "En az bir katılımcı eklenmeli" }, { status: 400 })
    }
    if (body.classId) {
      if (actor.kind !== "staff") {
        return NextResponse.json({ error: "Sınıf bağlama yetkiniz yok" }, { status: 403 })
      }
      const found = await prisma.class.findFirst({
        where: actor.isManager
          ? { id: body.classId }
          : {
              id: body.classId,
              OR: [
                { counselorId: actor.staffId },
                { schedules: { some: { teacherId: actor.staffId } } },
              ],
            },
        select: { id: true },
      })
      if (!found) {
        return NextResponse.json({ error: "Bu sınıfı bağlayamazsınız" }, { status: 403 })
      }
    }

    const id = await createGroupConversation(actor, {
      title: body.title,
      participants: body.participants,
      type: body.type,
      classId: body.classId,
      studentId: body.studentId,
    })

    // Tüm katılımcıların user-* kanallarına haber ver
    const channels: string[] = []
    for (const p of body.participants) {
      if (p.staffId) channels.push(userStaffChannel(p.staffId))
      else if (p.parentId) channels.push(userParentChannel(p.parentId))
    }
    if (actor.kind === "staff") channels.push(userStaffChannel(actor.staffId))
    await triggerConversationUpdated(channels, { conversationId: id, reason: "created" })

    return NextResponse.json({ id, type: body.type }, { status: 201 })
  }

  return NextResponse.json({ error: "Geçersiz tür" }, { status: 400 })
}
