import type { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { parseAcademicYearSpan } from "@/lib/academic-year-ui"

/**
 * Faaliyet (activity_events) ↔ akademik yıl eşlemesi.
 *
 * Kural (migration 20261118150000_activity_event_academic_year ile aynı):
 * - Faaliyetin başlangıç tarihi, bitiş tarihi (endDate) bu tarihten sonra olan İLK akademik yıla aittir.
 *   Böylece yaz tatili ve okul açılışı öncesi günler yaklaşan yıla sayılır.
 * - Son yılın bitişinden sonraki tarihler en son biten yıla bağlanır (yeni yıl tarihlenince yeniden hesaplanır).
 * - Kayıt yenileme dolgu kayıtları (parentActiveYearId dolu) ve tarihsiz taslak yıllar dikkate alınmaz.
 */

type Db = PrismaClient | Prisma.TransactionClient

const DAY_MS = 24 * 60 * 60 * 1000

export type AssignableYear = { id: string; endDate: Date | null; parentActiveYearId: string | null }

export function pickAcademicYearIdForDate(years: AssignableYear[], date: Date): string | null {
  const dated = years
    .filter((y): y is AssignableYear & { endDate: Date } => !y.parentActiveYearId && y.endDate != null)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
  if (!dated.length || Number.isNaN(date.getTime())) return null
  const t = date.getTime()
  const match = dated.find((y) => t < y.endDate.getTime() + DAY_MS)
  return (match ?? dated[dated.length - 1]!).id
}

async function loadAssignableYears(db: Db): Promise<AssignableYear[]> {
  return db.academicYear.findMany({
    where: { parentActiveYearId: null, endDate: { not: null } },
    select: { id: true, endDate: true, parentActiveYearId: true },
  })
}

export async function resolveAcademicYearIdForDate(date: Date, db: Db = prisma): Promise<string | null> {
  return pickAcademicYearIdForDate(await loadAssignableYears(db), date)
}

/**
 * Akademik yıl tarihleri değişince / yıl eklenip silinince tüm faaliyetlerin yılını yeniden hesaplar.
 * Dönen değer: yılı değişen faaliyet sayısı.
 */
export async function reassignAllActivityEventAcademicYears(db: Db = prisma): Promise<number> {
  const years = await loadAssignableYears(db)
  const events = await db.activityEvent.findMany({ select: { id: true, startDate: true, academicYearId: true } })
  const changes = new Map<string | null, string[]>()
  for (const e of events) {
    const next = pickAcademicYearIdForDate(years, e.startDate)
    if (next === e.academicYearId) continue
    const list = changes.get(next) ?? []
    list.push(e.id)
    changes.set(next, list)
  }
  let changed = 0
  for (const [academicYearId, ids] of changes) {
    const res = await db.activityEvent.updateMany({ where: { id: { in: ids } }, data: { academicYearId } })
    changed += res.count
  }
  return changed
}

/** Hata faaliyet işlemini bozmasın; yıl ayarı kaydedildikten sonra çağrılır. */
export async function reassignActivityEventAcademicYearsSafe(): Promise<void> {
  try {
    await reassignAllActivityEventAcademicYears()
  } catch (error) {
    console.error("[faaliyet] Akademik yıl yeniden eşleme başarısız:", error)
  }
}

export type ActivityAcademicYearInfo = { id: string; name: string; isActive: boolean }

/** Aktif öğretim yılı: isActive bayrağı, yoksa bugünü kapsayan tarih aralığı. */
export async function getActiveAcademicYear(db: Db = prisma): Promise<ActivityAcademicYearInfo | null> {
  const byFlag = await db.academicYear.findFirst({
    where: { isActive: true, parentActiveYearId: null },
    select: { id: true, name: true },
    orderBy: { startDate: "desc" },
  })
  if (byFlag) return { ...byFlag, isActive: true }
  const now = new Date()
  const byRange = await db.academicYear.findFirst({
    where: { parentActiveYearId: null, startDate: { lte: now }, endDate: { gte: now } },
    select: { id: true, name: true },
  })
  return byRange ? { ...byRange, isActive: true } : null
}

export type ActivityYearScope = {
  /** active: aktif yıl (varsayılan) · year: belirli bir yıl (arşiv) · all: tüm yıllar */
  mode: "active" | "year" | "all"
  academicYear: ActivityAcademicYearInfo | null
  /** activity_events için filtre (participant sorgularında `activity: scope.eventWhere`) */
  eventWhere: Prisma.ActivityEventWhereInput
}

/**
 * `?academicYearId=` sorgu parametresi:
 * - yok / "active" → aktif akademik yıl (mobil dahil eski istemciler bu varsayılanı alır)
 * - "all" → tüm yıllar
 * - <id> → o yıl (Arşiv)
 * Aktif yıl tanımlı değilse filtre uygulanmaz.
 */
export async function resolveActivityYearScope(
  searchParams: URLSearchParams,
  db: Db = prisma,
): Promise<ActivityYearScope> {
  const raw = (searchParams.get("academicYearId") ?? "").trim()
  if (raw === "all") return { mode: "all", academicYear: null, eventWhere: {} }

  const active = await getActiveAcademicYear(db)
  if (raw && raw !== "active") {
    if (active && raw === active.id) {
      return { mode: "active", academicYear: active, eventWhere: { academicYearId: active.id } }
    }
    const y = await db.academicYear.findUnique({ where: { id: raw }, select: { id: true, name: true } })
    return {
      mode: "year",
      academicYear: y ? { ...y, isActive: false } : null,
      eventWhere: { academicYearId: raw },
    }
  }
  if (!active) return { mode: "active", academicYear: null, eventWhere: {} }
  return { mode: "active", academicYear: active, eventWhere: { academicYearId: active.id } }
}

export type ActivityAcademicYearOption = {
  id: string
  name: string
  isActive: boolean
  eventCount: number
}

/** Arşiv seçicisi: ana akademik yıllar (yeniden eskiye) + her yıldaki faaliyet sayısı. */
export async function listActivityAcademicYears(db: Db = prisma): Promise<{
  active: ActivityAcademicYearInfo | null
  years: ActivityAcademicYearOption[]
  unassignedCount: number
}> {
  const [active, years, counts] = await Promise.all([
    getActiveAcademicYear(db),
    db.academicYear.findMany({
      where: { parentActiveYearId: null },
      select: { id: true, name: true, startDate: true },
    }),
    db.activityEvent.groupBy({ by: ["academicYearId"], _count: { _all: true } }),
  ])
  const countMap = new Map(counts.map((c) => [c.academicYearId, c._count._all]))
  const startYear = (y: { name: string; startDate: Date | null }) =>
    parseAcademicYearSpan(y)?.startYear ?? y.startDate?.getFullYear() ?? 0
  const sorted = [...years].sort((a, b) => startYear(b) - startYear(a))
  return {
    active,
    years: sorted.map((y) => ({
      id: y.id,
      name: y.name,
      isActive: active?.id === y.id,
      eventCount: countMap.get(y.id) ?? 0,
    })),
    unassignedCount: countMap.get(null) ?? 0,
  }
}
