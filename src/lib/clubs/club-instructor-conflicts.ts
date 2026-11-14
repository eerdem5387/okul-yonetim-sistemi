import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type ClubScheduleBlock = {
  id?: string
  clubId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  instructorId: string | null
}

/** Öğretmenin ÖÇG (veya benzer) meşguliyeti — değiş tokuş gün çakışması için */
export type InstructorBusyBlock = {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  label?: string
}

type Slot = { dayOfWeek: number; startTime: string; endTime: string }
type DbClient = Prisma.TransactionClient | typeof prisma

export function resolveScheduleInstructorId(row: {
  instructorId?: string | null
  club?: { instructorId?: string | null } | null
}): string | null {
  return row.instructorId || row.club?.instructorId || null
}

/**
 * Aynı öğretmen, farklı kulüplerde aynı güne düşemez.
 * (Değiş tokuş / öneri kuralı: bir öğretmene aynı günde birden fazla kulüp yok.)
 */
export function instructorClubBlocksConflict(a: ClubScheduleBlock, b: ClubScheduleBlock): boolean {
  if (!a.instructorId || !b.instructorId) return false
  if (a.instructorId !== b.instructorId) return false
  if (a.clubId === b.clubId) return false
  return a.dayOfWeek === b.dayOfWeek
}

/**
 * swapClubScheduleSlots ile aynı eşleme: A satırları B slotlarına (öğretmen A’da kalır),
 * fazla slotlar şablon öğretmene; B için tersi.
 */
export function simulateBlocksAfterClubSwap(
  clubAId: string,
  clubBId: string,
  aBlocks: ClubScheduleBlock[],
  bBlocks: ClubScheduleBlock[],
): ClubScheduleBlock[] {
  const aSlots: Slot[] = aBlocks.map((b) => ({
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
  }))
  const bSlots: Slot[] = bBlocks.map((b) => ({
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
  }))

  const aTemplate = aBlocks[0]?.instructorId ?? null
  const bTemplate = bBlocks[0]?.instructorId ?? null
  const out: ClubScheduleBlock[] = []

  for (let i = 0; i < bSlots.length; i++) {
    const slot = bSlots[i]!
    out.push({
      clubId: clubAId,
      instructorId: i < aBlocks.length ? aBlocks[i]!.instructorId : aTemplate,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })
  }
  for (let i = 0; i < aSlots.length; i++) {
    const slot = aSlots[i]!
    out.push({
      clubId: clubBId,
      instructorId: i < bBlocks.length ? bBlocks[i]!.instructorId : bTemplate,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })
  }
  return out
}

/**
 * A ↔ B slot takası bir öğretmene aynı günde iki kulüp veya kulüp+ÖÇG verir mi?
 */
export function wouldInstructorConflictAfterClubSwap(options: {
  clubAId: string
  clubBId: string
  aBlocks: ClubScheduleBlock[]
  bBlocks: ClubScheduleBlock[]
  /** Takas dışı diğer aktif kulüp programları (A/B dahil olabilir; filtrelenir) */
  otherBlocks: ClubScheduleBlock[]
  /** Öğretmen ÖÇG oturumları */
  ocgBlocks?: InstructorBusyBlock[]
}): string | null {
  const { clubAId, clubBId, aBlocks, bBlocks, otherBlocks, ocgBlocks = [] } = options

  const remaining = otherBlocks.filter((b) => b.clubId !== clubAId && b.clubId !== clubBId)
  const simulated = [
    ...remaining,
    ...simulateBlocksAfterClubSwap(clubAId, clubBId, aBlocks, bBlocks),
  ]

  for (let i = 0; i < simulated.length; i++) {
    for (let j = i + 1; j < simulated.length; j++) {
      if (instructorClubBlocksConflict(simulated[i]!, simulated[j]!)) {
        return "Bu yer değişimi bir öğretmene aynı günde birden fazla kulüp verir; uygulanamaz."
      }
    }
  }

  for (const club of simulated) {
    if (!club.instructorId) continue
    const hit = ocgBlocks.find(
      (o) => o.teacherId === club.instructorId && o.dayOfWeek === club.dayOfWeek,
    )
    if (hit) {
      const detail = hit.label ? ` (${hit.label})` : ""
      return `Bu yer değişimi bir öğretmene aynı günde hem kulüp hem ÖÇG verir${detail}; uygulanamaz.`
    }
  }

  return null
}

export async function loadActiveClubScheduleBlocks(
  client: DbClient = prisma,
): Promise<ClubScheduleBlock[]> {
  const rows = await client.clubSchedule.findMany({
    where: {
      isActive: true,
      OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
    },
    select: {
      id: true,
      clubId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      instructorId: true,
      club: { select: { instructorId: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    clubId: r.clubId,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    instructorId: resolveScheduleInstructorId(r),
  }))
}

export async function loadActiveInstructorOcgBlocks(
  client: DbClient = prisma,
): Promise<InstructorBusyBlock[]> {
  const rows = await client.studyGroupSession.findMany({
    where: { isActive: true },
    select: {
      teacherId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      studyGroup: { select: { name: true } },
    },
  })

  return rows.map((r) => ({
    teacherId: r.teacherId,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    label: r.studyGroup.name,
  }))
}
