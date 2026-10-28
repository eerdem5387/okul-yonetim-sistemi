import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/chat/identity"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ studentId: string }> }

/** Öğrenci dosyasındaki yazışmalar: bağlı sohbet, sınıfı ve velisiyle olan özel yazışma. */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveChatActor(request)
  if (!actor || actor.kind !== "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const { studentId } = await context.params
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      classAssignments: { select: { classId: true } },
      parents: { select: { parentId: true } },
    },
  })
  if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })

  if (!actor.isManager) {
    const classIds = student.classAssignments.map((row) => row.classId)
    const teaches = await prisma.class.count({
      where: {
        id: { in: classIds },
        OR: [
          { counselorId: actor.staffId },
          { schedules: { some: { teacherId: actor.staffId } } },
        ],
      },
    })
    if (teaches === 0) {
      return NextResponse.json({ error: "Bu öğrencinin yazışmalarını görme yetkiniz yok." }, { status: 403 })
    }
  }

  const parentIds = student.parents.map((row) => row.parentId)
  const classIds = student.classAssignments.map((row) => row.classId)
  const rows = await prisma.conversation.findMany({
    where: {
      AND: [
        {
          OR: [
            { studentId },
            ...(classIds.length ? [{ classId: { in: classIds } }] : []),
            ...(parentIds.length
              ? [{ type: "PRIVATE" as const, participants: { some: { parentId: { in: parentIds } } } }]
              : []),
          ],
        },
        {
          NOT: {
            AND: [{ type: "PRIVATE" }, { participants: { every: { parentId: null } } }],
          },
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      type: true,
      title: true,
      updatedAt: true,
      class: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true } },
    },
  })

  return NextResponse.json({
    conversations: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title || (row.type === "PRIVATE" ? "Veli yazışması" : "Yazışma"),
      className: row.class?.name ?? null,
      updatedAt: row.updatedAt,
      preview: row.messages[0]?.body ?? "",
    })),
  })
}
