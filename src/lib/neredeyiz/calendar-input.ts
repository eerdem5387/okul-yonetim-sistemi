import { DisruptionType, HolidayType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { dayKey, keyToDate, loadSchoolCalendar, validateRangeInYear } from "@/lib/neredeyiz/calendar"
import { parseDisruptionScope, type DisruptionScopeValue } from "@/lib/neredeyiz/disruption-scope"

type Fail = { ok: false; error: string }

function day(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === "") return null
  const d = new Date(String(raw))
  return Number.isNaN(d.getTime()) ? null : keyToDate(dayKey(d))
}

const HOLIDAY_TYPES = new Set<string>(Object.values(HolidayType))
const DISRUPTION_TYPES = new Set<string>(Object.values(DisruptionType))

/** Tatil gövdesini doğrular: tip, tarih sırası, akademik yıl aralığı. */
export async function parseHolidayInput(
  academicYearId: string,
  body: Record<string, unknown>,
): Promise<
  | { ok: true; data: { name: string; type: HolidayType; startDate: Date; endDate: Date; description: string | null; blocksTeaching: boolean } }
  | Fail
> {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const type = String(body.type ?? "")
  const startDate = day(body.startDate)
  const endDate = day(body.endDate)
  if (!name || !startDate || !endDate) return { ok: false, error: "Ad, başlangıç ve bitiş tarihi zorunludur" }
  if (!HOLIDAY_TYPES.has(type)) return { ok: false, error: "Geçersiz tatil tipi" }
  const cal = await loadSchoolCalendar(academicYearId)
  const err = validateRangeInYear(cal, startDate, endDate, "Tatil")
  if (err) return { ok: false, error: err }
  return {
    ok: true,
    data: {
      name,
      type: type as HolidayType,
      startDate,
      endDate,
      description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
      blocksTeaching: body.blocksTeaching !== false,
    },
  }
}

/** Aksama gövdesini doğrular: tip, kapsam, tarih/yıl aralığı ve seçilen ders/sınıf/öğretmenin o yıla ait olması. */
export async function parseDisruptionInput(
  academicYearId: string,
  body: Record<string, unknown>,
): Promise<
  | {
      ok: true
      data: {
        type: DisruptionType
        scope: DisruptionScopeValue
        reason: string
        startDate: Date
        endDate: Date
        affectedSubjects: string[]
        affectedClassIds: string[]
        affectedStaffIds: string[]
      }
    }
  | Fail
> {
  const type = String(body.type ?? "")
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  const startDate = day(body.startDate)
  const endDate = day(body.endDate)
  if (!reason || !startDate || !endDate) return { ok: false, error: "Sebep, başlangıç ve bitiş tarihi zorunludur" }
  if (!DISRUPTION_TYPES.has(type)) return { ok: false, error: "Geçersiz aksama tipi" }

  const cal = await loadSchoolCalendar(academicYearId)
  const err = validateRangeInYear(cal, startDate, endDate, "Aksama")
  if (err) return { ok: false, error: err }

  const parsed = parseDisruptionScope({
    scope: typeof body.scope === "string" ? body.scope : undefined,
    affectedSubjects: body.affectedSubjects,
    affectedClassIds: body.affectedClassIds,
    affectedStaffIds: body.affectedStaffIds,
  })
  if (!parsed.ok) return parsed

  if (parsed.affectedSubjects.length) {
    const n = await prisma.subject.count({ where: { id: { in: parsed.affectedSubjects }, academicYearId } })
    if (n !== new Set(parsed.affectedSubjects).size) return { ok: false, error: "Seçilen derslerden bazıları bu akademik yıla ait değil" }
  }
  if (parsed.affectedClassIds.length) {
    const n = await prisma.class.count({ where: { id: { in: parsed.affectedClassIds }, academicYearId } })
    if (n !== new Set(parsed.affectedClassIds).size) return { ok: false, error: "Seçilen sınıflardan bazıları bu akademik yıla ait değil" }
  }
  if (parsed.affectedStaffIds.length) {
    const n = await prisma.staff.count({ where: { id: { in: parsed.affectedStaffIds }, isActive: true } })
    if (n !== new Set(parsed.affectedStaffIds).size) return { ok: false, error: "Seçilen öğretmenlerden bazıları bulunamadı" }
  }

  return {
    ok: true,
    data: {
      type: type as DisruptionType,
      scope: parsed.scope,
      reason,
      startDate,
      endDate,
      affectedSubjects: parsed.affectedSubjects,
      affectedClassIds: parsed.affectedClassIds,
      affectedStaffIds: parsed.affectedStaffIds,
    },
  }
}
