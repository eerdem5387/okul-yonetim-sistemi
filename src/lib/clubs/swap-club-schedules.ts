import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  loadActiveClubScheduleBlocks,
  loadActiveInstructorOcgBlocks,
  resolveScheduleInstructorId,
  wouldInstructorConflictAfterClubSwap,
  type ClubScheduleBlock,
} from "@/lib/clubs/club-instructor-conflicts"

type Slot = { dayOfWeek: number; startTime: string; endTime: string }
type ScheduleRow = {
  id: string
  clubGroupId: string | null
  instructorId: string | null
  room: string | null
  notes: string | null
}

function slotKey(s: Slot) {
  return `${s.dayOfWeek}|${s.startTime}|${s.endTime}`
}

function tempSlot(index: number): Slot {
  const dayOfWeek = (index % 7) + 1
  const minute = index % 60
  const hour = 5 + Math.floor(index / 60)
  const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  const endMinute = minute + 1
  const endTime =
    endMinute < 60
      ? `${String(hour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`
      : `${String(hour + 1).padStart(2, "0")}:00`
  return { dayOfWeek, startTime, endTime }
}

async function loadEffectiveRows(tx: Prisma.TransactionClient, clubId: string) {
  const rows = await tx.clubSchedule.findMany({
    where: {
      clubId,
      isActive: true,
      OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
    },
    include: { club: { select: { instructorId: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }, { endTime: "asc" }],
  })
  const clubLevel = rows.filter((r) => r.clubGroupId == null)
  return clubLevel.length > 0 ? clubLevel : rows
}

function toBlocks(clubId: string, rows: Awaited<ReturnType<typeof loadEffectiveRows>>): ClubScheduleBlock[] {
  return rows.map((r) => ({
    id: r.id,
    clubId,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    instructorId: resolveScheduleInstructorId(r),
  }))
}

async function clearSlotOccupants(
  tx: Prisma.TransactionClient,
  clubId: string,
  slot: Slot,
  keepId?: string,
) {
  await tx.clubSchedule.deleteMany({
    where: {
      clubId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      ...(keepId ? { NOT: { id: keepId } } : {}),
    },
  })
}

async function assignSlotsToRows(
  tx: Prisma.TransactionClient,
  opts: {
    clubId: string
    rows: ScheduleRow[]
    slots: Slot[]
    preferClubLevel: boolean
  },
) {
  const { clubId, rows, slots, preferClubLevel } = opts
  const template = rows[0]
  const clubGroupId = preferClubLevel ? null : (template?.clubGroupId ?? null)

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!
    if (i < rows.length) {
      const row = rows[i]!
      await clearSlotOccupants(tx, clubId, slot, row.id)
      await tx.clubSchedule.update({
        where: { id: row.id },
        data: {
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      })
    } else {
      await clearSlotOccupants(tx, clubId, slot)
      await tx.clubSchedule.create({
        data: {
          clubId,
          clubGroupId,
          instructorId: template?.instructorId ?? null,
          room: template?.room ?? null,
          notes: template?.notes ?? null,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: true,
        },
      })
    }
  }

  for (let i = slots.length; i < rows.length; i++) {
    await tx.clubSchedule.delete({ where: { id: rows[i]!.id } })
  }
}

/**
 * İki kulübün etkili program slotlarını (gün/saat) karşılıklı değiştirir.
 * Öneriler sayfasındaki «yer değiştir» mantığıyla aynı etkili satır kümesini kullanır.
 */
export async function swapClubScheduleSlots(clubAId: string, clubBId: string) {
  if (!clubAId || !clubBId || clubAId === clubBId) {
    throw new Error("İki farklı kulüp seçilmelidir.")
  }

  const [clubA, clubB] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubAId }, select: { id: true, name: true } }),
    prisma.club.findUnique({ where: { id: clubBId }, select: { id: true, name: true } }),
  ])
  if (!clubA || !clubB) throw new Error("Kulüp bulunamadı.")

  return prisma.$transaction(async (tx) => {
    const aRows = await loadEffectiveRows(tx, clubAId)
    const bRows = await loadEffectiveRows(tx, clubBId)
    if (aRows.length === 0 || bRows.length === 0) {
      throw new Error("Her iki kulübün de aktif programı olmalıdır.")
    }

    const aSlots: Slot[] = aRows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
    }))
    const bSlots: Slot[] = bRows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
    }))

    if (aSlots.map(slotKey).sort().join(",") === bSlots.map(slotKey).sort().join(",")) {
      throw new Error("Bu iki kulübün programları zaten aynı.")
    }

    const [otherBlocks, ocgBlocks] = await Promise.all([
      loadActiveClubScheduleBlocks(tx),
      loadActiveInstructorOcgBlocks(tx),
    ])
    const conflictErr = wouldInstructorConflictAfterClubSwap({
      clubAId,
      clubBId,
      aBlocks: toBlocks(clubAId, aRows),
      bBlocks: toBlocks(clubBId, bRows),
      otherBlocks,
      ocgBlocks,
    })
    if (conflictErr) throw new Error(conflictErr)

    const preferClubLevelA = aRows.every((r) => r.clubGroupId == null)
    const preferClubLevelB = bRows.every((r) => r.clubGroupId == null)

    for (let i = 0; i < aRows.length; i++) {
      const t = tempSlot(i)
      await clearSlotOccupants(tx, clubAId, t, aRows[i]!.id)
      await tx.clubSchedule.update({
        where: { id: aRows[i]!.id },
        data: t,
      })
    }

    await assignSlotsToRows(tx, {
      clubId: clubBId,
      rows: bRows,
      slots: aSlots,
      preferClubLevel: preferClubLevelB,
    })

    const aStill = await tx.clubSchedule.findMany({
      where: { id: { in: aRows.map((r) => r.id) } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })

    await assignSlotsToRows(tx, {
      clubId: clubAId,
      rows: aStill,
      slots: bSlots,
      preferClubLevel: preferClubLevelA,
    })

    return {
      clubA: { id: clubA.id, name: clubA.name },
      clubB: { id: clubB.id, name: clubB.name },
      swapped: {
        clubASlots: bSlots,
        clubBSlots: aSlots,
      },
    }
  })
}
