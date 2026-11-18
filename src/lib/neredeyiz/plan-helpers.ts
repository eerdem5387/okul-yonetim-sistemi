import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canEditSubjectPlan, forbidden, type NeredeyizActor } from "@/lib/neredeyiz/access"
import {
  dayKey,
  keyToDate,
  loadSchoolCalendar,
  noTeachingDaysWarning,
  topicScopeOf,
  validateRangeInYear,
} from "@/lib/neredeyiz/calendar"

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

/** Plan düzenleme yetkisi: öğretmen yalnız atandığı ders. */
export async function guardSubjectPlan(actor: NeredeyizActor, subjectId: string) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, classId: true, academicYearId: true, assignments: { select: { staffId: true } } },
  })
  if (!subject) return { ok: false as const, response: NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 }) }
  if (!(await canEditSubjectPlan(actor, subjectId))) {
    return { ok: false as const, response: forbidden("Yalnızca atandığınız derslerin planını düzenleyebilirsiniz.") }
  }
  return { ok: true as const, subject }
}

function parseOptionalDate(raw: unknown): { ok: true; value: Date | null | undefined } | { ok: false } {
  if (raw === undefined) return { ok: true, value: undefined }
  if (raw === null || raw === "") return { ok: true, value: null }
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return { ok: false }
  return { ok: true, value: keyToDate(dayKey(d)) }
}

/**
 * Konunun planlanan tarihlerini çözer ve akademik yıl takvimine göre doğrular.
 * Dönen `warning` engelleyici değildir (ör. aralıkta hiç ders günü yok).
 */
export async function resolveTopicDates(
  subject: { id: string; classId: string | null; academicYearId: string; assignments: Array<{ staffId: string }> },
  rawStart: unknown,
  rawEnd: unknown,
  current?: { plannedStartDate: Date | null; plannedEndDate: Date | null },
): Promise<
  | { ok: true; plannedStartDate: Date | null | undefined; plannedEndDate: Date | null | undefined; warning: string | null }
  | { ok: false; error: string }
> {
  const s = parseOptionalDate(rawStart)
  const e = parseOptionalDate(rawEnd)
  if (!s.ok || !e.ok) return { ok: false, error: "Geçersiz tarih" }
  const start = s.value === undefined ? current?.plannedStartDate ?? null : s.value
  const end = e.value === undefined ? current?.plannedEndDate ?? null : e.value
  if (start && !end) return { ok: false, error: "Planlanan bitiş tarihi de girilmeli" }
  if (start || end) {
    const cal = await loadSchoolCalendar(subject.academicYearId)
    const err = validateRangeInYear(cal, start, end, "Konu planı")
    if (err) return { ok: false, error: err }
    return {
      ok: true,
      plannedStartDate: s.value,
      plannedEndDate: e.value,
      warning: noTeachingDaysWarning(cal, start, end, topicScopeOf(subject)),
    }
  }
  return { ok: true, plannedStartDate: s.value, plannedEndDate: e.value, warning: null }
}
