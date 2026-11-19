import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaff } from "@/lib/neredeyiz/access"

/** GET — Öğretmenin son 60 gündeki ders programı değişiklikleri (yeniden eskiye). */
export async function GET(request: NextRequest) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const changes = await prisma.scheduleChange.findMany({
      where: { teacherId: guard.actor.staffId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    const changerIds = [...new Set(changes.map((c) => c.changedBy).filter((x): x is string => !!x))]
    const changers = changerIds.length
      ? await prisma.staff.findMany({ where: { id: { in: changerIds } }, select: { id: true, firstName: true, lastName: true } })
      : []
    const nameOf = new Map(changers.map((s) => [s.id, `${s.firstName} ${s.lastName}`]))
    return NextResponse.json({
      unreadCount: changes.filter((c) => !c.readAt).length,
      changes: changes.map((c) => ({
        id: c.id,
        kind: c.kind,
        classId: c.classId,
        className: c.className,
        subjectName: c.subjectName,
        before: c.before,
        after: c.after,
        changedByName: c.changedBy ? nameOf.get(c.changedBy) ?? null : null,
        createdAt: c.createdAt.toISOString(),
        read: !!c.readAt,
      })),
    })
  } catch (error) {
    console.error("me/schedule-changes", error)
    return NextResponse.json({ error: "Program değişiklikleri yüklenemedi" }, { status: 500 })
  }
}

/** POST — Tümünü okundu işaretle. */
export async function POST(request: NextRequest) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  await prisma.scheduleChange.updateMany({
    where: { teacherId: guard.actor.staffId, readAt: null },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
