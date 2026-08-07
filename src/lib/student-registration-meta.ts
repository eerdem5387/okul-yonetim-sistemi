import type { PrismaClient } from "@prisma/client"
import {
  contractYearLabelFromAcademicYear,
  getRenewalTargetYearFromList,
  resolveActiveAndNextAcademicYear,
  type AcademicYearListItem,
} from "@/lib/academic-year-ui"

function singleYearMatchTargets(
  year: AcademicYearListItem | null
): Array<{ id: string | null; label: string }> {
  if (!year) return []
  return [{ id: year.id, label: contractYearLabelFromAcademicYear(year) }]
}

export type YearRowDb = {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  isRenewalPeriod?: boolean
  parentActiveYearId?: string | null
}

/** Sözleşme metnindeki yıl ifadelerini kıyaslamak için (boşluk, tire, slash varyantları). */
export function normalizeAcademicYearLabel(s: string): string {
  return s
    .trim()
    .replace(/\u2013/g, "-")
    .replace(/\//g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "")
    .toLowerCase()
}

/** Sözleşme JSON'undaki academicYear alanları aynı yılı mı (boşluk / tire farkı tolere edilir). */
export function academicYearLabelsEquivalent(a: unknown, b: unknown): boolean {
  const sa = String(a ?? "").trim()
  const sb = String(b ?? "").trim()
  if (!sa && !sb) return true
  if (!sa || !sb) return false
  return normalizeAcademicYearLabel(sa) === normalizeAcademicYearLabel(sb)
}

function toListItems(yearRows: YearRowDb[]): AcademicYearListItem[] {
  return yearRows.map((r) => ({
    id: r.id,
    name: r.name,
    startDate: r.startDate?.toISOString() ?? null,
    endDate: r.endDate?.toISOString() ?? null,
    isActive: r.isActive,
    isRenewalPeriod: Boolean(r.isRenewalPeriod),
    parentActiveYearId: r.parentActiveYearId ?? null,
  }))
}

/** "2025-2026 akademik yılı" gibi isimlerden normalize edilmiş yyyy-yyyy parçasını ayıklar. */
function extractNormalizedYearSpan(s: string): string | null {
  const n = normalizeAcademicYearLabel(s)
  const m = n.match(/(\d{4}-\d{4})/)
  return m ? m[1] : null
}

function mapRawLabelToYearRow(
  yearRows: YearRowDb[],
  rawLabel: string
): { id: string; name: string; label: string } | null {
  const want = normalizeAcademicYearLabel(rawLabel)
  if (!want) return null
  const wantSpan = extractNormalizedYearSpan(rawLabel)
  for (const r of yearRows) {
    const lab = contractYearLabelFromAcademicYear(r)
    if (normalizeAcademicYearLabel(lab) === want) {
      return { id: r.id, name: r.name, label: lab }
    }
    if (wantSpan && extractNormalizedYearSpan(r.name) === wantSpan) {
      return { id: r.id, name: r.name, label: lab }
    }
  }
  return null
}

/** Sözleşmedeki metin, veritabanı satırına bağlanamasa bile başlangıç yılı (ör. 2026-2027 → 2026). */
function inferFirstAcademicStartYearFromLabel(raw: string): number | null {
  const n = normalizeAcademicYearLabel(raw)
  const m = n.match(/^(\d{4})-(\d{4})$/)
  if (m) return parseInt(m[1], 10)
  const m2 = n.match(/(\d{4})/)
  return m2 ? parseInt(m2[1], 10) : null
}

function resolveNewRegContractToYearRow(
  contractData: unknown,
  yearRows: YearRowDb[]
): YearRowDb | null {
  const cd = contractData as Record<string, unknown>
  const cId = String(cd.academicYearId ?? "").trim()
  if (cId) {
    const row = yearRows.find((y) => y.id === cId)
    if (row) return row
  }
  const raw = String(cd.academicYear ?? "").trim()
  if (!raw) return null
  const mapped = mapRawLabelToYearRow(yearRows, raw)
  if (mapped) {
    return yearRows.find((y) => y.id === mapped.id) ?? null
  }
  return null
}

function isContractAcademicYearActive(
  contractData: unknown,
  yearRows: YearRowDb[],
  active: AcademicYearListItem | null
): boolean {
  if (!active) return false
  const row = resolveNewRegContractToYearRow(contractData, yearRows)
  if (row && row.id === active.id) return true
  return contractMatchesAcademicYearTargets(contractData, singleYearMatchTargets(active))
}

/**
 * Sözleşme, aktif akademik yıldan sonra başlayan bir akademik yıla mı ait?
 * (Sadece "bir sonraki" yıl değil; 2027-2028 vb. geçmiş ön kayıtlar da dahil.)
 */
function isContractAcademicYearStrictlyAfterActive(
  contractData: unknown,
  yearRows: YearRowDb[],
  active: AcademicYearListItem | null
): boolean {
  if (!active) return false
  const activeRowDb = yearRows.find((y) => y.id === active.id)
  if (!activeRowDb) return false
  const row = resolveNewRegContractToYearRow(contractData, yearRows)
  if (row && row.startDate && activeRowDb.startDate) {
    return row.startDate.getTime() > activeRowDb.startDate.getTime()
  }
  const raw = String((contractData as Record<string, unknown>).academicYear ?? "").trim()
  if (!raw) return false
  const inferred = inferFirstAcademicStartYearFromLabel(raw)
  if (inferred == null) return false
  const activeY =
    activeRowDb.startDate?.getFullYear() ?? inferFirstAcademicStartYearFromLabel(activeRowDb.name)
  if (activeY == null) return false
  return inferred > activeY
}

function inferDominantContractYearLabel(
  rows: { contractData: unknown }[]
): { label: string; count: number } | null {
  const counts = new Map<string, { display: string; n: number }>()
  for (const row of rows) {
    const raw = String((row.contractData as Record<string, unknown>)?.academicYear ?? "").trim()
    if (!raw) continue
    const norm = normalizeAcademicYearLabel(raw)
    const ex = counts.get(norm)
    if (ex) ex.n += 1
    else counts.set(norm, { display: raw, n: 1 })
  }
  let best: { label: string; count: number } | null = null
  for (const [, v] of counts) {
    if (!best || v.n > best.count) best = { label: v.display, count: v.n }
  }
  return best
}

export type RegistrationYearTarget = {
  id: string | null
  name: string
  label: string
}

/**
 * Kayıt yenileme istatistikleri için hedef yıl: önce kurallı "aktif + sıradaki",
 * yoksa veritabanında sıradaki satır, o da yoksa yenileme sözleşmelerindeki baskın yıl.
 * Veri silinmez / güncellenmez — salt okuma.
 */
export function resolveRenewalYearTargetForStats(
  yearRows: YearRowDb[],
  renewals: { contractData: unknown }[]
): RegistrationYearTarget | null {
  const list = toListItems(yearRows)
  const strict = getRenewalTargetYearFromList(list)
  if (strict) {
    return { id: strict.id, name: strict.name, label: strict.label }
  }
  const { next } = resolveActiveAndNextAcademicYear(list)
  if (next) {
    return {
      id: next.id,
      name: next.name,
      label: contractYearLabelFromAcademicYear(next),
    }
  }
  const inferred = inferDominantContractYearLabel(renewals)
  if (inferred) {
    const mapped = mapRawLabelToYearRow(yearRows, inferred.label)
    if (mapped) {
      return { id: mapped.id, name: mapped.name, label: mapped.label }
    }
    return { id: null, name: inferred.label, label: inferred.label }
  }
  for (const r of renewals) {
    const raw = String((r.contractData as Record<string, unknown>)?.academicYear ?? "").trim()
    if (!raw) continue
    const mapped = mapRawLabelToYearRow(yearRows, raw)
    if (mapped) {
      return { id: mapped.id, name: mapped.name, label: mapped.label }
    }
    return { id: null, name: raw, label: raw }
  }
  return null
}

/**
 * Yeni kayıt istatistikleri: aktif ve (varsa) bir sonraki akademik yıl.
 * Eksik id’li eski sözleşmeler için etiket eşlemesi; ayrıca sözleşmelerde geçen ve
 * AcademicYear satırına eşlenen ek yıllar.
 */
export function buildNewRegistrationMatchTargets(
  yearRows: YearRowDb[],
  newRegs: { contractData: unknown }[]
): Array<{ id: string | null; label: string }> {
  const list = toListItems(yearRows)
  const { active, next } = resolveActiveAndNextAcademicYear(list)
  const targets: Array<{ id: string | null; label: string }> = []
  const seenNorm = new Set<string>()

  const push = (id: string | null, label: string) => {
    const t = label.trim()
    if (!t) return
    const norm = normalizeAcademicYearLabel(t)
    if (seenNorm.has(norm)) return
    seenNorm.add(norm)
    targets.push({ id, label: t })
  }

  if (active) push(active.id, contractYearLabelFromAcademicYear(active))
  if (next) push(next.id, contractYearLabelFromAcademicYear(next))

  for (const r of newRegs) {
    const raw = String((r.contractData as Record<string, unknown>)?.academicYear ?? "").trim()
    if (!raw) continue
    if (contractMatchesAcademicYearTargets(r.contractData, targets)) continue
    const mapped = mapRawLabelToYearRow(yearRows, raw)
    if (mapped) {
      push(mapped.id, mapped.label)
    } else {
      push(null, raw)
    }
  }

  return targets
}

export function contractMatchesAcademicYearTargets(
  contractData: unknown,
  targets: Array<{ id: string | null; label: string }>
): boolean {
  if (!targets.length) return false
  const cd = contractData as Record<string, unknown>
  const cId = String(cd.academicYearId ?? "").trim()
  const cLabelRaw = String(cd.academicYear ?? "").trim()
  const cNorm = cLabelRaw ? normalizeAcademicYearLabel(cLabelRaw) : ""
  for (const t of targets) {
    if (t.id && cId && cId === t.id) return true
    if (cNorm && normalizeAcademicYearLabel(t.label) === cNorm) return true
  }
  return false
}

export type RenewalTargetInfo = RegistrationYearTarget

export async function getRenewalTargetContext(client: PrismaClient): Promise<{
  target: RenewalTargetInfo | null
  renewedStudentIds: Set<string>
  newRegistrationStudentIds: Set<string>
  /** Aktif akademik yıla sözleşmesi eşleşen yeni kayıtlar (bu yıl okula başlayan / bu yıl için kayıt). */
  newRegistrationActiveYearStudentIds: Set<string>
  /**
   * Yalnızca bir sonraki akademik yıl için yeni kaydı olan, aktif yıla ait yeni kaydı olmayan öğrenciler.
   * Henüz bu yıl eğitime başlamamış kabul edilir; mevcut öğrenci sayılarına dahil edilmez.
   */
  futureYearOnlyNewRegistrationStudentIds: Set<string>
}> {
  const yearRows = await client.academicYear.findMany({
    orderBy: [{ startDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  })

  const [renewals, newRegs] = await Promise.all([
    client.renewal.findMany({ select: { studentId: true, contractData: true } }),
    client.newRegistration.findMany({ select: { studentId: true, contractData: true } }),
  ])

  const renewalTarget = resolveRenewalYearTargetForStats(yearRows, renewals)
  const renewalMatchTargets: Array<{ id: string | null; label: string }> = renewalTarget
    ? [{ id: renewalTarget.id, label: renewalTarget.label }]
    : []

  const newRegTargets = buildNewRegistrationMatchTargets(yearRows, newRegs)
  const list = toListItems(yearRows)
  const { active } = resolveActiveAndNextAcademicYear(list)

  const renewedStudentIds = new Set<string>()
  for (const r of renewals) {
    if (contractMatchesAcademicYearTargets(r.contractData, renewalMatchTargets)) {
      renewedStudentIds.add(r.studentId)
    }
  }

  const newRegistrationStudentIds = new Set<string>()
  for (const r of newRegs) {
    if (contractMatchesAcademicYearTargets(r.contractData, newRegTargets)) {
      newRegistrationStudentIds.add(r.studentId)
    }
  }

  const newRegistrationActiveYearStudentIds = new Set<string>()
  const hasStrictlyFutureNewRegByStudent = new Set<string>()
  for (const r of newRegs) {
    if (active && isContractAcademicYearActive(r.contractData, yearRows, active)) {
      newRegistrationActiveYearStudentIds.add(r.studentId)
    }
    if (active && isContractAcademicYearStrictlyAfterActive(r.contractData, yearRows, active)) {
      hasStrictlyFutureNewRegByStudent.add(r.studentId)
    }
  }

  const futureYearOnlyNewRegistrationStudentIds = new Set<string>()
  if (active) {
    for (const sid of hasStrictlyFutureNewRegByStudent) {
      if (!newRegistrationActiveYearStudentIds.has(sid)) {
        futureYearOnlyNewRegistrationStudentIds.add(sid)
      }
    }
  }

  return {
    target: renewalTarget,
    renewedStudentIds,
    newRegistrationStudentIds,
    newRegistrationActiveYearStudentIds,
    futureYearOnlyNewRegistrationStudentIds,
  }
}

export function registrationStatusText(
  target: RenewalTargetInfo | null,
  studentId: string,
  renewedStudentIds: Set<string>,
  newRegistrationStudentIds: Set<string>
): string {
  if (newRegistrationStudentIds.has(studentId)) return "Yeni Kayıt"
  if (renewedStudentIds.has(studentId)) {
    const label = target?.label?.trim() || "ilgili yıl"
    return `${label} kaydı yenilendi`
  }
  if (!target) return "Kayıt dönemi tanımsız"
  return "Kaydı yenilenmedi"
}
