import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/chat/identity"
import { canToggleMemberPosting, isActorParticipant } from "@/lib/chat/repository"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** GET: Sohbet detayı (katılımcılar) */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const { isMember, role } = await isActorParticipant(actor, id)
  if (!isMember) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      student: { select: { firstName: true, lastName: true } },
      class: { select: { name: true } },
      branch: { select: { name: true } },
      participants: {
        include: {
          staff: { select: { id: true, firstName: true, lastName: true, department: true } },
          parent: {
            select: {
              id: true,
              studentTcNumber: true,
              students: { select: { parentName: true }, take: 1 },
            },
          },
        },
      },
    },
  })
  if (!conv) return NextResponse.json({ error: "Sohbet bulunamadı" }, { status: 404 })

  return NextResponse.json(
    {
      conversation: {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        membersCanPost: conv.membersCanPost,
        createdByStaffId: conv.createdByStaffId,
        systemKey: conv.systemKey,
        studentName: conv.student ? `${conv.student.firstName} ${conv.student.lastName}`.trim() : null,
        className: conv.class?.name ?? null,
        branchName: conv.branch?.name ?? null,
        myRole: role,
        participants: conv.participants.map((p) => ({
          id: p.id,
          role: p.role,
          staff: p.staff,
          parent: p.parent
            ? {
                id: p.parent.id,
                displayName:
                  p.parent.students[0]?.parentName?.trim() ||
                  `Veli (${p.parent.studentTcNumber.slice(0, 4)}...)`,
                studentTcNumber: p.parent.studentTcNumber,
              }
            : null,
        })),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

/** PATCH: Başlık güncelle (yalnızca sohbet ADMIN'i) */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const { isMember, role } = await isActorParticipant(actor, id)
  if (!isMember || role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  let body: { title?: string; membersCanPost?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  const data: { title?: string | null; membersCanPost?: boolean } = {}
  if (typeof body.title === "string") {
    if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    data.title = body.title.trim() || null
  }
  if (typeof body.membersCanPost === "boolean") {
    if (!(await canToggleMemberPosting(actor, id))) {
      return NextResponse.json({ error: "Bu ayarı yalnızca grubu kuran kişi değiştirebilir." }, { status: 403 })
    }
    data.membersCanPost = body.membersCanPost
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 })
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data,
    select: { id: true, title: true, membersCanPost: true },
  })
  return NextResponse.json({ conversation: updated })
}
