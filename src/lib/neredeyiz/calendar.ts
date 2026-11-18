import type { DisruptionScope, ProgressStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Neredeyiz? takvim motoru — tüm gecikme / durum hesapları buradan geçer.
 *
 * - Günler okulun saat dilimine (Europe/Istanbul) göre "YYYY-MM-DD" anahtarlarıyla karşılaştırılır;
 *   sunucunun (Vercel: UTC) saatine bağlı kayma olmaz.
 * - Gecikme TAKVİM günü değil DERS günüdür: hafta tatili, "işlenemez" (blocksTeaching) tatiller ve
 *   konuyu etkileyen aksamalar (okul geneli / sınıf / ders / öğretmen) sayılmaz.
 */

export const SCHOOL_TIME_ZONE = "Europe/Istanbul"

const DAY_MS = 24 * 60 * 60 * 1000
const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Tarihin okul saatine göre gün anahtarı (YYYY-MM-DD). */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return keyFormatter.format(d)
}

export function todayKey(now: Date = new Date()): string {
  return dayKey(now)
}

function keyToUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map((n) => Number.parseInt(n, 10))
  return Date.UTC(y!, m! - 1, d!)
}

export function addDays(key: string, n: number): string {
  return new Date(keyToUtcMs(key) + n * DAY_MS).toISOString().slice(0, 10)
}

/** Takvim günü farkı (b - a). */
export function calendarDaysBetween(a: string, b: string): number {
  return Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / DAY_MS)
}

/** "YYYY-MM-DD" → okulun o günkü gece yarısı değil, UTC gece yarısı (veritabanındaki tarih alanları böyle tutuluyor). */
export function keyToDate(key: string): Date {
  return new Date(keyToUtcMs(key))
}

const WEEKDAY_INDEX: Record<string, number> = { SUNDAY: 0, SATURDAY: 6 }

export type CalendarDisruption = {
  startKey: string
  endKey: string
  scope: DisruptionScope
  affectedSubjects: string[]
  affectedClassIds: string[]
  affectedStaffIds: string[]
}

export type SchoolCalendar = {
  academicYearId: string | null
  startKey: string | null
  endKey: string | null
  weekendDays: Set<number>
  blocked: Array<{ startKey: string; endKey: string }>
  disruptions: CalendarDisruption[]
}

/** Konunun aksamalar açısından kapsamı. */
export type TopicScope = {
  subjectId: string
  classId: string | null
  staffIds: string[]
}

export function buildCalendar(input: {
  academicYearId: string | null
  startDate?: Date | null
  endDate?: Date | null
  weekendDays?: string[] | null
  holidays?: Array<{ startDate: Date; endDate: Date; blocksTeaching: boolean }>
  disruptions?: Array<{
    startDate: Date
    endDate: Date
    scope: DisruptionScope
    affectedSubjects: string[]
    affectedClassIds: string[]
    affectedStaffIds: string[]
  }>
}): SchoolCalendar {
  const weekend = (input.weekendDays?.length ? input.weekendDays : ["SATURDAY", "SUNDAY"])
    .map((d) => WEEKDAY_INDEX[d])
    .filter((n): n is number => n !== undefined)
  return {
    academicYearId: input.academicYearId,
    startKey: input.startDate ? dayKey(input.startDate) : null,
    endKey: input.endDate ? dayKey(input.endDate) : null,
    weekendDays: new Set(weekend),
    blocked: (input.holidays ?? [])
      .filter((h) => h.blocksTeaching)
      .map((h) => ({ startKey: dayKey(h.startDate), endKey: dayKey(h.endDate) })),
    disruptions: (input.disruptions ?? []).map((d) => ({
      startKey: dayKey(d.startDate),
      endKey: dayKey(d.endDate),
      scope: d.scope,
      affectedSubjects: d.affectedSubjects,
      affectedClassIds: d.affectedClassIds,
      affectedStaffIds: d.affectedStaffIds,
    })),
  }
}

/** Takvim yoksa: Cumartesi-Pazar tatil, başka kısıt yok. */
export const DEFAULT_CALENDAR: SchoolCalendar = buildCalendar({ academicYearId: null })

export async function loadSchoolCalendars(academicYearIds: string[]): Promise<Map<string, SchoolCalendar>> {
  const ids = [...new Set(academicYearIds.filter(Boolean))]
  const map = new Map<string, SchoolCalendar>()
  if (!ids.length) return map
  const [years, holidays, disruptions] = await Promise.all([
    prisma.academicYear.findMany({
      where: { id: { in: ids } },
      select: { id: true, startDate: true, endDate: true, weekendDays: true },
    }),
    prisma.holiday.findMany({
      where: { academicYearId: { in: ids } },
      select: { academicYearId: true, startDate: true, endDate: true, blocksTeaching: true },
    }),
    prisma.disruption.findMany({
      where: { academicYearId: { in: ids } },
      select: {
        academicYearId: true,
        startDate: true,
        endDate: true,
        scope: true,
        affectedSubjects: true,
        affectedClassIds: true,
        affectedStaffIds: true,
      },
    }),
  ])
  for (const y of years) {
    map.set(
      y.id,
      buildCalendar({
        academicYearId: y.id,
        startDate: y.startDate,
        endDate: y.endDate,
        weekendDays: y.weekendDays,
        holidays: holidays.filter((h) => h.academicYearId === y.id),
        disruptions: disruptions.filter((d) => d.academicYearId === y.id),
      }),
    )
  }
  return map
}

export async function loadSchoolCalendar(academicYearId: string): Promise<SchoolCalendar> {
  return (await loadSchoolCalendars([academicYearId])).get(academicYearId) ?? DEFAULT_CALENDAR
}

function inRange(key: string, startKey: string, endKey: string): boolean {
  return key >= startKey && key <= endKey
}

export function disruptionAffects(d: CalendarDisruption, scope?: TopicScope | null): boolean {
  if (d.scope === "SCHOOL") return true
  if (!scope) return false
  if (d.scope === "CLASSES") return !!scope.classId && d.affectedClassIds.includes(scope.classId)
  if (d.scope === "SUBJECTS") return d.affectedSubjects.includes(scope.subjectId)
  if (d.scope === "TEACHER") return scope.staffIds.some((id) => d.affectedStaffIds.includes(id))
  return false
}

/** Bu gün (bu konu için) ders işlenebilir mi? */
export function isTeachingDay(cal: SchoolCalendar, key: string, scope?: TopicScope | null): boolean {
  const weekday = new Date(keyToUtcMs(key)).getUTCDay()
  if (cal.weekendDays.has(weekday)) return false
  if (cal.blocked.some((h) => inRange(key, h.startKey, h.endKey))) return false
  if (cal.disruptions.some((d) => inRange(key, d.startKey, d.endKey) && disruptionAffects(d, scope))) return false
  return true
}

/** (fromKey, toKey] aralığındaki ders günü sayısı; toKey <= fromKey ise 0. */
export function teachingDaysAfter(
  cal: SchoolCalendar,
  fromKey: string,
  toKey: string,
  scope?: TopicScope | null,
): number {
  if (toKey <= fromKey) return 0
  let n = 0
  for (let k = addDays(fromKey, 1); k <= toKey; k = addDays(k, 1)) {
    if (isTeachingDay(cal, k, scope)) n++
  }
  return n
}

/** [startKey, endKey] (iki uç dahil) ders günü sayısı. */
export function teachingDaysInclusive(
  cal: SchoolCalendar,
  startKey: string,
  endKey: string,
  scope?: TopicScope | null,
): number {
  if (endKey < startKey) return 0
  return teachingDaysAfter(cal, addDays(startKey, -1), endKey, scope)
}

// ------------------------------------------------------------------
// Konu durumu
// ------------------------------------------------------------------

export type TopicState =
  | "PLANLANDI"
  | "DEVAM_EDIYOR"
  | "ONAY_BEKLIYOR"
  | "TAMAMLANDI"
  | "ERKEN_TAMAMLANDI"
  | "GECIKMELI_TAMAMLANDI"
  | "GECIKMELI"
  | "ERTELENDI"

export type TopicEvaluation = {
  state: TopicState
  /** Tamamlandı (onaylı) mı */
  completed: boolean
  /** Öğretmen bildirdi, onay bekliyor */
  pendingApproval: boolean
  /** Planlanan bitişi geçmiş ve hâlâ tamamlanmamış */
  delayed: boolean
  /** Ders günü cinsinden gecikme (tamamlanmamışsa bugüne, tamamlandıysa bitişe / bildirime kadar) */
  delayDays: number
  /** Erken tamamlandıysa kaç ders günü önce */
  earlyDays: number
  /** Planlanan bitişe kalan ders günü (bitiş bugün/gelecekteyse) */
  teachingDaysUntilDue: number | null
}

export type EvaluableTopic = { plannedStartDate: Date | null; plannedEndDate: Date | null }
export type EvaluableProgress = {
  status: ProgressStatus
  actualEndDate: Date | null
  reportedAt?: Date | null
} | null | undefined

export function evaluateTopic(
  topic: EvaluableTopic,
  progress: EvaluableProgress,
  cal: SchoolCalendar,
  scope: TopicScope | null,
  today: string = todayKey(),
): TopicEvaluation {
  const plannedEnd = topic.plannedEndDate ? dayKey(topic.plannedEndDate) : null
  const plannedStart = topic.plannedStartDate ? dayKey(topic.plannedStartDate) : null
  const base: TopicEvaluation = {
    state: "PLANLANDI",
    completed: false,
    pendingApproval: false,
    delayed: false,
    delayDays: 0,
    earlyDays: 0,
    teachingDaysUntilDue: plannedEnd && plannedEnd >= today ? teachingDaysInclusive(cal, today, plannedEnd, scope) : null,
  }

  const status = progress?.status

  if (status === "TAMAMLANDI") {
    base.completed = true
    base.teachingDaysUntilDue = null
    const actual = progress?.actualEndDate ? dayKey(progress.actualEndDate) : null
    if (plannedEnd && actual) {
      const late = teachingDaysAfter(cal, plannedEnd, actual, scope)
      const early = teachingDaysAfter(cal, actual, plannedEnd, scope)
      if (late > 0) return { ...base, state: "GECIKMELI_TAMAMLANDI", delayDays: late }
      if (early > 0) return { ...base, state: "ERKEN_TAMAMLANDI", earlyDays: early }
    }
    return { ...base, state: "TAMAMLANDI" }
  }

  if (status === "PENDING_APPROVAL") {
    // Öğretmen bildirdiği anda gecikme donar; onay beklerken geçen süre öğretmene yazılmaz.
    const reported = progress?.reportedAt
      ? dayKey(progress.reportedAt)
      : progress?.actualEndDate
        ? dayKey(progress.actualEndDate)
        : today
    const late = plannedEnd ? teachingDaysAfter(cal, plannedEnd, reported, scope) : 0
    return { ...base, state: "ONAY_BEKLIYOR", pendingApproval: true, delayDays: late, teachingDaysUntilDue: null }
  }

  if (status === "ERTELENDI") {
    return { ...base, state: "ERTELENDI" }
  }

  // PLANLANDI / DEVAM_EDIYOR / kayıt yok
  if (plannedEnd && today > plannedEnd) {
    const late = teachingDaysAfter(cal, plannedEnd, today, scope)
    if (late > 0) return { ...base, state: "GECIKMELI", delayed: true, delayDays: late }
  }
  if (status === "DEVAM_EDIYOR") return { ...base, state: "DEVAM_EDIYOR" }
  if (plannedStart && plannedEnd && plannedStart <= today && today <= plannedEnd) {
    return { ...base, state: "DEVAM_EDIYOR" }
  }
  return base
}

// ------------------------------------------------------------------
// Doğrulama
// ------------------------------------------------------------------

/**
 * Akademik yıl içinde, başlangıç ≤ bitiş olan bir tarih aralığı mı?
 * Yılın tarihleri tanımlı değilse yalnızca sıra kontrol edilir.
 */
export function validateRangeInYear(
  cal: SchoolCalendar,
  start: Date | null,
  end: Date | null,
  label: string,
): string | null {
  if (start && Number.isNaN(start.getTime())) return `${label}: başlangıç tarihi geçersiz`
  if (end && Number.isNaN(end.getTime())) return `${label}: bitiş tarihi geçersiz`
  const s = start ? dayKey(start) : null
  const e = end ? dayKey(end) : null
  if (s && e && e < s) return `${label}: bitiş tarihi başlangıçtan önce olamaz`
  if (cal.startKey && cal.endKey) {
    for (const k of [s, e]) {
      if (k && (k < cal.startKey || k > cal.endKey)) {
        return `${label}: tarihler akademik yıl aralığında olmalı (${cal.startKey} – ${cal.endKey})`
      }
    }
  }
  return null
}

/** Tarih aralığında hiç ders günü yoksa uyarı metni (engelleyici değil). */
export function noTeachingDaysWarning(
  cal: SchoolCalendar,
  start: Date | null,
  end: Date | null,
  scope?: TopicScope | null,
): string | null {
  if (!start || !end) return null
  const n = teachingDaysInclusive(cal, dayKey(start), dayKey(end), scope)
  return n === 0 ? "Seçilen aralıkta ders günü yok (hafta sonu / tatil / aksama)." : null
}

/** Konu kapsamı: ders, sınıf ve derse atanmış öğretmenler. */
export function topicScopeOf(subject: {
  id: string
  classId: string | null
  assignments?: Array<{ staffId: string }>
}): TopicScope {
  return {
    subjectId: subject.id,
    classId: subject.classId,
    staffIds: (subject.assignments ?? []).map((a) => a.staffId),
  }
}

// ------------------------------------------------------------------
// Toplu değerlendirme
// ------------------------------------------------------------------

type SubjectForEval = {
  id: string
  classId: string | null
  academicYearId: string
  assignments?: Array<{ staffId: string }>
}

/**
 * Konuları kendi akademik yılının takvimiyle değerlendirir.
 * `getSubject` her konunun dersini, `getProgress` en güncel ilerleme kaydını döndürür.
 */
export async function evaluateTopics<T extends EvaluableTopic>(
  topics: T[],
  getSubject: (t: T) => SubjectForEval,
  getProgress: (t: T) => EvaluableProgress,
  today: string = todayKey(),
): Promise<Array<{ topic: T; ev: TopicEvaluation }>> {
  const calendars = await loadSchoolCalendars(topics.map((t) => getSubject(t).academicYearId))
  return topics.map((topic) => {
    const subject = getSubject(topic)
    const cal = calendars.get(subject.academicYearId) ?? DEFAULT_CALENDAR
    return { topic, ev: evaluateTopic(topic, getProgress(topic), cal, topicScopeOf(subject), today) }
  })
}
