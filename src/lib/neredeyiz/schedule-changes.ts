import type { Prisma, ScheduleChangeKind } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { notifyStaff } from "@/lib/neredeyiz/notify"
import { normalizeSubjectName } from "@/lib/neredeyiz/names"

/**
 * Ders programı değişiklik kaydı + öğretmene bildirim + Neredeyiz ders atamalarının senkronu.
 * Program satırı eklendiğinde / değiştiğinde / silindiğinde çağrılır (doğrudan ya da onaylı değişiklik).
 */

export type ScheduleSlot = {
  classId: string
  subjectName: string
  subjectId?: string | null
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

const DAYS = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

export function slotLabel(s: { dayOfWeek: number; startTime: string; endTime: string }): string {
  return `${DAYS[s.dayOfWeek] ?? `${s.dayOfWeek}. gün`} ${s.startTime}–${s.endTime}`
}

function slotJson(s: ScheduleSlot): Prisma.InputJsonValue {
  return { dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }
}

const NOTIFY_DEBOUNCE_MS = 10 * 60 * 1000

/**
 * Bir dersin öğretmen atamalarını ders programıyla hizalar: programda o derse giren öğretmenler atanır,
 * programda artık bulunmayanların ataması kaldırılır. Programa hiç bağlı olmayan (elle açılmış) derse dokunulmaz.
 */
export async function reconcileSubjectAssignments(subjectId: string): Promise<void> {
  const rows = await prisma.schedule.findMany({ where: { subjectId, isActive: true }, select: { teacherId: true } })
  if (!rows.length) {
    const any = await prisma.schedule.count({ where: { subjectId } })
    if (any === 0) return
  }
  const keep = [...new Set(rows.map((r) => r.teacherId))]
  await prisma.subjectAssignment.deleteMany({ where: { subjectId, staffId: { notIn: keep } } })
  for (const staffId of keep) {
    await prisma.subjectAssignment.upsert({
      where: { subjectId_staffId: { subjectId, staffId } },
      create: { subjectId, staffId },
      update: {},
    })
  }
}

export async function recordScheduleChange(
  before: ScheduleSlot | null,
  after: ScheduleSlot | null,
  changedBy?: string | null,
): Promise<void> {
  try {
    const entries: Array<{ teacherId: string; kind: ScheduleChangeKind; slot: ScheduleSlot; before?: ScheduleSlot }> = []
    if (!before && after) entries.push({ teacherId: after.teacherId, kind: "ADDED", slot: after })
    else if (before && !after) entries.push({ teacherId: before.teacherId, kind: "REMOVED", slot: before })
    else if (before && after) {
      const sameSubject = normalizeSubjectName(before.subjectName) === normalizeSubjectName(after.subjectName)
      const sameClass = before.classId === after.classId
      if (before.teacherId !== after.teacherId || !sameSubject || !sameClass) {
        entries.push({ teacherId: before.teacherId, kind: "REMOVED", slot: before })
        entries.push({ teacherId: after.teacherId, kind: "ADDED", slot: after })
      } else if (
        before.dayOfWeek !== after.dayOfWeek ||
        before.startTime !== after.startTime ||
        before.endTime !== after.endTime
      ) {
        entries.push({ teacherId: after.teacherId, kind: "MOVED", slot: after, before })
      }
    }

    // Atamaları programla hizala
    const subjectIds = [...new Set([before?.subjectId, after?.subjectId].filter((x): x is string => !!x))]
    for (const id of subjectIds) await reconcileSubjectAssignments(id)

    if (!entries.length) return

    const classIds = [...new Set(entries.map((e) => e.slot.classId))]
    const classes = await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
    const className = new Map(classes.map((c) => [c.id, c.name]))

    await prisma.scheduleChange.createMany({
      data: entries.map((e) => ({
        teacherId: e.teacherId,
        classId: e.slot.classId,
        className: className.get(e.slot.classId) ?? "",
        subjectName: e.slot.subjectName.trim(),
        kind: e.kind,
        before: e.kind === "MOVED" ? slotJson(e.before!) : e.kind === "REMOVED" ? slotJson(e.slot) : undefined,
        after: e.kind === "REMOVED" ? undefined : slotJson(e.slot),
        changedBy: changedBy ?? null,
      })),
    })

    // Bildirim: art arda yapılan düzenlemeler tek bildirimde toplansın (10 dk içinde okunmamış varsa yenisi gitmez)
    const since = new Date(Date.now() - NOTIFY_DEBOUNCE_MS)
    for (const teacherId of new Set(entries.map((e) => e.teacherId))) {
      if (changedBy && changedBy === teacherId) continue
      const recent = await prisma.notification.findFirst({
        where: { type: "PROGRAM_DEGISTI", targetUserId: teacherId, isRead: false, createdAt: { gte: since } },
        select: { id: true },
      })
      if (recent) continue
      const mine = entries.filter((e) => e.teacherId === teacherId)
      const first = mine[0]!
      const label = `${className.get(first.slot.classId) ?? ""} ${first.slot.subjectName}`.trim()
      const what =
        first.kind === "ADDED"
          ? `${label} size eklendi (${slotLabel(first.slot)})`
          : first.kind === "REMOVED"
            ? `${label} programınızdan çıkarıldı (${slotLabel(first.slot)})`
            : `${label}: ${slotLabel(first.before!)} → ${slotLabel(first.slot)}`
      await notifyStaff({
        staffIds: [teacherId],
        type: "PROGRAM_DEGISTI",
        priority: "HIGH",
        title: "Ders programınız değişti",
        message: mine.length > 1 ? `${what} ve ${mine.length - 1} değişiklik daha.` : `${what}.`,
        push: { kind: "neredeyiz_program_change", href: "/ogretmen/neredeyiz?tab=program" },
      })
    }
  } catch (error) {
    console.error("[neredeyiz] Program değişikliği kaydedilemedi:", error)
  }
}

export function toSlot(s: {
  classId: string
  subjectName: string
  subjectId?: string | null
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}): ScheduleSlot {
  return {
    classId: s.classId,
    subjectName: s.subjectName,
    subjectId: s.subjectId ?? null,
    teacherId: s.teacherId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
  }
}
