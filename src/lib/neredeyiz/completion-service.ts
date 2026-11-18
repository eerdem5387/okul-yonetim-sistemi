import type { NeredeyizLateReason, TopicCompletion } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { canManageNeredeyiz, canMarkTopicProgress, type NeredeyizActor } from "@/lib/neredeyiz/access"
import { dayKey, keyToDate, todayKey, topicScopeOf } from "@/lib/neredeyiz/calendar"
import { LATE_REASONS, loadYearContexts, needsLateReason } from "@/lib/neredeyiz/weeks"

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

async function loadTopic(topicId: string) {
  return prisma.topic.findUnique({
    where: { id: topicId },
    select: {
      id: true,
      name: true,
      plannedStartWeek: true,
      plannedEndWeek: true,
      completion: true,
      unit: {
        select: {
          subject: {
            select: {
              id: true,
              classId: true,
              academicYearId: true,
              assignments: { select: { staffId: true } },
            },
          },
        },
      },
    },
  })
}

async function canComplete(actor: NeredeyizActor, subjectId: string): Promise<boolean> {
  return (await canMarkTopicProgress(actor, subjectId)) || (await canManageNeredeyiz(actor, "edit"))
}

/**
 * Konuyu tamamlandı işaretler. Zamanında ise ek bilgi istenmez; planlanan aralıktan sonraysa
 * gecikme sebebi zorunludur. Onay yoktur.
 */
export async function completeTopic(
  actor: NeredeyizActor,
  topicId: string,
  input: { completedAt?: unknown; lateReason?: unknown; note?: unknown },
): Promise<ServiceResult<TopicCompletion>> {
  const topic = await loadTopic(topicId)
  if (!topic) return { ok: false, status: 404, error: "Konu bulunamadı" }
  const subject = topic.unit.subject
  if (!(await canComplete(actor, subject.id))) {
    return { ok: false, status: 403, error: "Bu dersin konularını işaretleme yetkiniz yok" }
  }

  const today = todayKey()
  let completedKey = today
  if (input.completedAt !== undefined && input.completedAt !== null && input.completedAt !== "") {
    const d = new Date(String(input.completedAt))
    if (Number.isNaN(d.getTime())) return { ok: false, status: 400, error: "Geçersiz tarih" }
    completedKey = dayKey(d)
  }
  if (completedKey > today) return { ok: false, status: 400, error: "Tamamlanma tarihi ileri bir gün olamaz" }

  const ctx = (await loadYearContexts([subject.academicYearId])).get(subject.academicYearId)!
  if (ctx.cal.startKey && completedKey < ctx.cal.startKey) {
    return { ok: false, status: 400, error: "Tamamlanma tarihi akademik yıl başlangıcından önce olamaz" }
  }

  const late = needsLateReason(topic, completedKey, ctx.weeks, ctx.cal, topicScopeOf(subject))
  const rawReason = typeof input.lateReason === "string" ? input.lateReason : ""
  let lateReason: NeredeyizLateReason | null = null
  if (late) {
    if (!LATE_REASONS.includes(rawReason as NeredeyizLateReason)) {
      return { ok: false, status: 400, error: "Konu planlanandan geç tamamlandı; gecikme sebebini seçin" }
    }
    lateReason = rawReason as NeredeyizLateReason
  }
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, 500) : null

  const data = {
    completedAt: keyToDate(completedKey),
    completedBy: actor.staffId,
    lateReason,
    note,
  }
  const completion = await prisma.topicCompletion.upsert({
    where: { topicId },
    create: { topicId, ...data },
    update: data,
  })
  return { ok: true, data: completion }
}

/** Tamamlandı işaretini geri alır (işaretleyen, derse atanmış öğretmen ya da yönetim). */
export async function undoTopicCompletion(actor: NeredeyizActor, topicId: string): Promise<ServiceResult<null>> {
  const topic = await loadTopic(topicId)
  if (!topic) return { ok: false, status: 404, error: "Konu bulunamadı" }
  if (!topic.completion) return { ok: false, status: 404, error: "Bu konu tamamlandı olarak işaretli değil" }
  if (!(await canComplete(actor, topic.unit.subject.id))) {
    return { ok: false, status: 403, error: "Bu işlem için yetkiniz yok" }
  }
  await prisma.topicCompletion.delete({ where: { topicId } })
  return { ok: true, data: null }
}
