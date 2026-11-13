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
 * A ↔ B slot takası bir öğretmene aynı gün/saatte iki farklı kulüp verir mi?
 */
export function wouldInstructorConflictAfterClubSwap(options: {
  clubAId: string
  clubBId: string
  aBlocks: ClubScheduleBlock[]
  bBlocks: ClubScheduleBlock[]
  /** Takas dışı diğer aktif kulüp programları (A/B dahil olabilir; filtrelenir) */
  otherBlocks: ClubScheduleBlock[]
}): string | null {
  const { clubAId, clubBId, aBlocks, bBlocks, otherBlocks } = options

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
