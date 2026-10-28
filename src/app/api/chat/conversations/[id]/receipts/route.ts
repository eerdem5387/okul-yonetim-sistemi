import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/chat/identity"
import { isActorParticipant } from "@/lib/chat/repository"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

function personName(input: {
  staff: { firstName: string; lastName: string } | null
  parent: { students: { parentName: string | null }[]; studentTcNumber: string } | null
}) {
  if (input.staff) return `${input.staff.firstName} ${input.staff.lastName}`.trim()
  const parentName = input.parent?.students[0]?.parentName?.trim()
  if (parentName) return parentName
  if (input.parent) return `Veli (${input.parent.studentTcNumber.slice(0, 4)}...)`
  return "Bilinmeyen"
}

/** Duyuruda bir mesajı kimlerin okuduğunu döner. Yalnızca kanal yöneticisi görür. */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const { isMember, role } = await isActorParticipant(actor, id)
  if (!isMember || role !== "ADMIN") {
    return NextResponse.json({ error: "Okundu listesini yalnızca duyuruyu yazan yönetici görebilir." }, { status: 403 })
  }

  const messageId = request.nextUrl.searchParams.get("messageId")
  if (!messageId) return NextResponse.json({ error: "Mesaj seçilmedi" }, { status: 400 })

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId: id },
    select: { id: true },
  })
  if (!message) return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })

  const [participants, receipts] = await Promise.all([
    prisma.conversationParticipant.findMany({
      where: { conversationId: id },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
        parent: {
          select: {
            id: true,
            studentTcNumber: true,
            students: { select: { parentName: true }, take: 1 },
          },
        },
      },
    }),
    prisma.messageReceipt.findMany({
      where: { messageId },
      select: { readerStaffId: true, readerParentId: true, readAt: true },
    }),
  ])

  const read: { name: string; readAt: string }[] = []
  const unread: { name: string }[] = []
  for (const participant of participants) {
    const name = personName(participant)
    const receipt = receipts.find((row) =>
      participant.staffId
        ? row.readerStaffId === participant.staffId
        : row.readerParentId === participant.parentId
    )
    if (receipt) read.push({ name, readAt: receipt.readAt.toISOString() })
    else unread.push({ name })
  }
  read.sort((a, b) => a.readAt.localeCompare(b.readAt))
  unread.sort((a, b) => a.name.localeCompare(b.name, "tr"))

  return NextResponse.json({ read, unread }, { headers: { "Cache-Control": "no-store" } })
}
