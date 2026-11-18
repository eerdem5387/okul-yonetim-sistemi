import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canEditSubjectPlan, forbidden, type NeredeyizActor } from "@/lib/neredeyiz/access"
import { loadYearContexts, teachingWeekCount } from "@/lib/neredeyiz/weeks"

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

function parseWeek(raw: unknown): { ok: true; value: number | null | undefined } | { ok: false } {
  if (raw === undefined) return { ok: true, value: undefined }
  if (raw === null || raw === "") return { ok: true, value: null }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return { ok: false }
  return { ok: true, value: n }
}

/**
 * Konunun planlanan ders haftalarını doğrular: 1 ≤ başlangıç ≤ bitiş ≤ yılın ders haftası sayısı.
 * Tek hafta girilirse diğeri ona eşitlenir.
 */
export async function resolveTopicWeeks(
  academicYearId: string,
  rawStart: unknown,
  rawEnd: unknown,
  current?: { plannedStartWeek: number | null; plannedEndWeek: number | null },
): Promise<
  | { ok: true; plannedStartWeek: number | null | undefined; plannedEndWeek: number | null | undefined }
  | { ok: false; error: string }
> {
  const s = parseWeek(rawStart)
  const e = parseWeek(rawEnd)
  if (!s.ok || !e.ok) return { ok: false, error: "Hafta numarası 1 veya daha büyük bir tam sayı olmalı" }
  if (s.value === undefined && e.value === undefined) return { ok: true, plannedStartWeek: undefined, plannedEndWeek: undefined }

  let start = s.value === undefined ? current?.plannedStartWeek ?? null : s.value
  let end = e.value === undefined ? current?.plannedEndWeek ?? null : e.value
  if (start == null && end != null) start = end
  if (end == null && start != null) end = start
  if (start != null && end != null) {
    if (end < start) return { ok: false, error: "Bitiş haftası başlangıç haftasından önce olamaz" }
    const ctx = (await loadYearContexts([academicYearId])).get(academicYearId)!
    const total = teachingWeekCount(ctx.weeks)
    if (total > 0 && end > total) return { ok: false, error: `Bu akademik yılda ${total} ders haftası var` }
  }
  return { ok: true, plannedStartWeek: start, plannedEndWeek: end }
}
