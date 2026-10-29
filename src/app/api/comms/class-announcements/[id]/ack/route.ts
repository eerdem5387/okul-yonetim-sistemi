import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/comms/identity"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: Ctx) {
  const chat = await resolveChatActor(_request)
  if (!chat || chat.kind !== "parent") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }
  const { id } = await context.params

  const ack = await prisma.classAnnouncementAck.findFirst({
    where: { announcementId: id, parentId: chat.parentId },
  })
  if (!ack) return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 })
  if (ack.seenAt) return NextResponse.json({ ack })

  const updated = await prisma.classAnnouncementAck.update({
    where: { id: ack.id },
    data: { seenAt: new Date() },
  })
  return NextResponse.json({ ack: updated })
}
