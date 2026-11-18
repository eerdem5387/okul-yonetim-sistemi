import type { NeredeyizLateReason } from "@prisma/client"
import {
  addDays,
  dayKey,
  DEFAULT_CALENDAR,
  loadSchoolCalendars,
  teachingDaysAfter,
  todayKey,
  topicScopeOf,
  type SchoolCalendar,
  type TopicScope,
} from "@/lib/neredeyiz/calendar"

/**
 * Haftalık Neredeyiz — hafta ve konu durumu motoru.
 *
 * - Akademik yıl Pazartesi başlayan haftalara bölünür. Hafta tatili dışındaki günlerinin hepsi
 *   "işlenemez" tatile denk gelen hafta TATİL haftasıdır ve numara almaz.
 * - Konu planı ders haftası numarasıyla tutulur (plannedStartWeek–plannedEndWeek); tarihleri buradan çıkar.
 * - Durum: TAMAMLANDI (zamanında), GEC_TAMAMLANDI (sebepli), GECIKTI (aralık geçti, tamamlanmadı),
 *   BU_HAFTA, PLANLANDI (ileride), PLANSIZ (hafta girilmemiş).
 * - Gecikme ders günüyle ölçülür (hafta sonu, tatil, konuyu etkileyen aksama sayılmaz).
 */

export type AcademicWeek = {
  /** Ders haftası numarası (1'den başlar); tatil haftasında null */
  index: number | null
  mondayKey: string
  /** İlk / son okul günü (hafta sonu hariç, yıl aralığına kırpılmış) */
  startKey: string
  endKey: string
  isBreak: boolean
  label: string
}

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]

function parts(key: string) {
  const [y, m, d] = key.split("-").map((n) => Number.parseInt(n, 10))
  return { y: y!, m: m!, d: d! }
}

export function formatRangeTr(startKey: string, endKey: string): string {
  const a = parts(startKey)
  const b = parts(endKey)
  if (startKey === endKey) return `${a.d} ${MONTHS[a.m - 1]}`
  if (a.m === b.m) return `${a.d}–${b.d} ${MONTHS[b.m - 1]}`
  return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]}`
}

export function formatDayTr(key: string): string {
  const a = parts(key)
  return `${a.d} ${MONTHS[a.m - 1]}`
}

function weekday(key: string): number {
  return new Date(`${key}T00:00:00.000Z`).getUTCDay()
}

function isBlocked(cal: SchoolCalendar, key: string): boolean {
  return cal.blocked.some((h) => key >= h.startKey && key <= h.endKey)
}

/** Akademik yılın haftaları (yıl tarihleri yoksa boş liste). */
export function buildAcademicWeeks(cal: SchoolCalendar): AcademicWeek[] {
  if (!cal.startKey || !cal.endKey || cal.endKey < cal.startKey) return []
  const weeks: AcademicWeek[] = []
  let monday = addDays(cal.startKey, -((weekday(cal.startKey) + 6) % 7))
  let n = 0
  while (monday <= cal.endKey) {
    const schoolDays: string[] = []
    for (let i = 0; i < 7; i++) {
      const k = addDays(monday, i)
      if (k < cal.startKey || k > cal.endKey) continue
      if (cal.weekendDays.has(weekday(k))) continue
      schoolDays.push(k)
    }
    if (schoolDays.length > 0) {
      const isBreak = schoolDays.every((k) => isBlocked(cal, k))
      const startKey = schoolDays[0]!
      const endKey = schoolDays[schoolDays.length - 1]!
      weeks.push({
        index: isBreak ? null : ++n,
        mondayKey: monday,
        startKey,
        endKey,
        isBreak,
        label: formatRangeTr(startKey, endKey),
      })
    }
    monday = addDays(monday, 7)
  }
  return weeks
}

export function teachingWeekCount(weeks: AcademicWeek[]): number {
  return weeks.filter((w) => w.index != null).length
}

export function weekByIndex(weeks: AcademicWeek[], index: number): AcademicWeek | null {
  return weeks.find((w) => w.index === index) ?? null
}

/** Bugünün haftası (Pazartesi–Pazar). Yıl dışındaysa null. */
export function currentWeek(weeks: AcademicWeek[], today: string = todayKey()): AcademicWeek | null {
  return weeks.find((w) => today >= w.mondayKey && today <= addDays(w.mondayKey, 6)) ?? null
}

/** Bugüne kadar başlamış son ders haftası (tatildeyse bir önceki). */
export function lastStartedTeachingWeek(weeks: AcademicWeek[], today: string = todayKey()): number | null {
  let last: number | null = null
  for (const w of weeks) if (w.index != null && w.startKey <= today) last = w.index
  return last
}

export function topicRange(
  weeks: AcademicWeek[],
  startWeek: number | null | undefined,
  endWeek: number | null | undefined,
): { startKey: string; endKey: string } | null {
  if (startWeek == null && endWeek == null) return null
  const s = weekByIndex(weeks, (startWeek ?? endWeek)!)
  const e = weekByIndex(weeks, (endWeek ?? startWeek)!)
  if (!s || !e) return null
  return { startKey: s.startKey, endKey: e.endKey }
}

export function weekRangeLabel(startWeek: number | null | undefined, endWeek: number | null | undefined): string {
  if (startWeek == null && endWeek == null) return "Hafta girilmedi"
  const s = startWeek ?? endWeek
  const e = endWeek ?? startWeek
  return s === e ? `${s}. hafta` : `${s}.–${e}. hafta`
}

export type TopicWeeklyState = "TAMAMLANDI" | "GEC_TAMAMLANDI" | "GECIKTI" | "BU_HAFTA" | "PLANLANDI" | "PLANSIZ"

export type TopicWeeklyEval = {
  state: TopicWeeklyState
  /** Planlanan ilk / son gün (yoksa null) */
  plannedStartKey: string | null
  plannedEndKey: string | null
  rangeLabel: string
  /** GECIKTI: bugüne kadar; GEC_TAMAMLANDI: tamamlanana kadar geçen ders günü */
  lateDays: number
  completedKey: string | null
}

export function evaluateWeeklyTopic(
  topic: { plannedStartWeek: number | null; plannedEndWeek: number | null },
  completion: { completedAt: Date } | null | undefined,
  weeks: AcademicWeek[],
  cal: SchoolCalendar,
  scope: TopicScope | null,
  today: string = todayKey(),
): TopicWeeklyEval {
  const range = topicRange(weeks, topic.plannedStartWeek, topic.plannedEndWeek)
  const base = {
    plannedStartKey: range?.startKey ?? null,
    plannedEndKey: range?.endKey ?? null,
    rangeLabel: weekRangeLabel(topic.plannedStartWeek, topic.plannedEndWeek),
    lateDays: 0,
    completedKey: completion ? dayKey(completion.completedAt) : null,
  }
  if (completion) {
    const done = dayKey(completion.completedAt)
    if (range) {
      const late = teachingDaysAfter(cal, range.endKey, done, scope)
      if (late > 0) return { ...base, state: "GEC_TAMAMLANDI", lateDays: late }
    }
    return { ...base, state: "TAMAMLANDI" }
  }
  if (!range) return { ...base, state: "PLANSIZ" }
  if (today > range.endKey) {
    const late = teachingDaysAfter(cal, range.endKey, today, scope)
    if (late > 0) return { ...base, state: "GECIKTI", lateDays: late }
    return { ...base, state: "BU_HAFTA" }
  }
  const cw = currentWeek(weeks, today)
  const weekEnd = cw ? addDays(cw.mondayKey, 6) : today
  if (range.startKey <= weekEnd) return { ...base, state: "BU_HAFTA" }
  return { ...base, state: "PLANLANDI" }
}

/** Planlanan bitişten sonra tamamlanıyorsa gecikme sebebi gerekir mi? */
export function needsLateReason(
  topic: { plannedStartWeek: number | null; plannedEndWeek: number | null },
  completedKey: string,
  weeks: AcademicWeek[],
  cal: SchoolCalendar,
  scope: TopicScope | null,
): boolean {
  const range = topicRange(weeks, topic.plannedStartWeek, topic.plannedEndWeek)
  if (!range) return false
  return teachingDaysAfter(cal, range.endKey, completedKey, scope) > 0
}

export const LATE_REASON_LABELS: Record<NeredeyizLateReason, string> = {
  IZIN: "İzin",
  RAPOR: "Rapor",
  ETKINLIK: "Etkinlik / gezi",
  PROGRAM_DEGISIKLIGI: "Program değişikliği",
  DIGER: "Diğer",
}

export const LATE_REASONS = Object.keys(LATE_REASON_LABELS) as NeredeyizLateReason[]

// ------------------------------------------------------------------
// Toplu yükleme: yılın takvimi + haftaları
// ------------------------------------------------------------------

export type YearContext = { cal: SchoolCalendar; weeks: AcademicWeek[] }

export async function loadYearContexts(yearIds: string[]): Promise<Map<string, YearContext>> {
  const cals = await loadSchoolCalendars(yearIds)
  const out = new Map<string, YearContext>()
  for (const id of new Set(yearIds)) {
    const cal = cals.get(id) ?? DEFAULT_CALENDAR
    out.set(id, { cal, weeks: buildAcademicWeeks(cal) })
  }
  return out
}

type SubjectLike = { id: string; classId: string | null; academicYearId: string; assignments?: Array<{ staffId: string }> }

/** Konuları kendi yılının takvimiyle değerlendirir. */
export async function evaluateWeeklyTopics<T extends { plannedStartWeek: number | null; plannedEndWeek: number | null }>(
  topics: T[],
  getSubject: (t: T) => SubjectLike,
  getCompletion: (t: T) => { completedAt: Date } | null | undefined,
  today: string = todayKey(),
): Promise<Array<{ topic: T; ev: TopicWeeklyEval }>> {
  const ctx = await loadYearContexts(topics.map((t) => getSubject(t).academicYearId))
  return topics.map((topic) => {
    const subject = getSubject(topic)
    const c = ctx.get(subject.academicYearId) ?? { cal: DEFAULT_CALENDAR, weeks: [] }
    return {
      topic,
      ev: evaluateWeeklyTopic(topic, getCompletion(topic), c.weeks, c.cal, topicScopeOf(subject), today),
    }
  })
}
