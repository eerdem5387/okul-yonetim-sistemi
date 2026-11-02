import { prisma } from "@/lib/prisma"
import { DAY_LABELS } from "@/lib/schedules/time-conflict"
import {
  clubProgramsConflict,
  scheduleBlocksConflict,
  type ScheduleBlock,
} from "@/lib/clubs/schedule-blocks"

export type { ScheduleBlock }

/** Öğrencinin ÖÇG oturumlarından gelen meşgul bloklar */
export async function loadStudentStudyBusyBlocks(studentId: string): Promise<ScheduleBlock[]> {
  const sessions = await prisma.studyGroupSession.findMany({
    where: {
      studyGroup: {
        isActive: true,
        students: { some: { studentId } },
      },
    },
    select: { dayOfWeek: true, startTime: true, endTime: true },
  })
  return sessions.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
  }))
}

/**
 * Kulübün veli seçiminde kullanılan program blokları.
 * Yalnızca kulüp seviyesi (clubGroupId null) — yönetim sayfasından atanan program.
 */
export async function loadClubProgramBlocks(clubIds: string[]): Promise<Map<string, ScheduleBlock[]>> {
  const map = new Map<string, ScheduleBlock[]>()
  if (clubIds.length === 0) return map

  const schedules = await prisma.clubSchedule.findMany({
    where: {
      clubId: { in: clubIds },
      isActive: true,
      clubGroupId: null,
    },
    select: { clubId: true, dayOfWeek: true, startTime: true, endTime: true },
  })

  for (const s of schedules) {
    const list = map.get(s.clubId) || []
    list.push({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })
    map.set(s.clubId, list)
  }
  return map
}

export type ClubCompatibility = {
  clubId: string
  hasSchedule: boolean
  conflictsWithStudy: boolean
  conflictsWithSelection: boolean
  /** Veliye gösterilebilir mi (programı var ve ÖÇG ile çakışmıyor) */
  selectable: boolean
  scheduleSummary: string[]
  scheduleBlocks: ScheduleBlock[]
}

function summarizeBlocks(blocks: ScheduleBlock[]): string[] {
  return blocks
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
    .map((b) => `${DAY_LABELS[b.dayOfWeek] || `Gün ${b.dayOfWeek}`} ${b.startTime}–${b.endTime}`)
}

/**
 * Aday kulüpleri öğrencinin ÖÇG programı ve (opsiyonel) seçili diğer kulüplerle karşılaştırır.
 * Programsız kulüpler selectable=false (veli görmesin / seçemesin).
 */
export async function evaluateClubCompatibilityForStudent(opts: {
  studentId: string
  clubIds: string[]
  /** Çift yönlü kulüp-kulüp çakışması için seçili / seçilecek kulüp id'leri */
  selectionClubIds?: string[]
}): Promise<Map<string, ClubCompatibility>> {
  const { studentId, clubIds, selectionClubIds = [] } = opts
  const result = new Map<string, ClubCompatibility>()
  if (clubIds.length === 0) return result

  const [busy, clubBlocks] = await Promise.all([
    loadStudentStudyBusyBlocks(studentId),
    loadClubProgramBlocks([...new Set([...clubIds, ...selectionClubIds])]),
  ])

  for (const clubId of clubIds) {
    const blocks = clubBlocks.get(clubId) || []
    const hasSchedule = blocks.length > 0
    const conflictsWithStudy =
      hasSchedule && blocks.some((cb) => busy.some((bb) => scheduleBlocksConflict(cb, bb)))

    let conflictsWithSelection = false
    if (hasSchedule && selectionClubIds.length > 0) {
      for (const otherId of selectionClubIds) {
        if (otherId === clubId) continue
        if (clubProgramsConflict(blocks, clubBlocks.get(otherId))) {
          conflictsWithSelection = true
          break
        }
      }
    }

    result.set(clubId, {
      clubId,
      hasSchedule,
      conflictsWithStudy,
      conflictsWithSelection,
      selectable: hasSchedule && !conflictsWithStudy && !conflictsWithSelection,
      scheduleSummary: summarizeBlocks(blocks),
      scheduleBlocks: blocks,
    })
  }

  return result
}

/** Seçim listesindeki kulüpler kendi aralarında veya ÖÇG ile çakışıyor mu? */
export async function assertClubSelectionScheduleCompatible(
  studentId: string,
  clubIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (clubIds.length === 0) return { ok: true }

  const compat = await evaluateClubCompatibilityForStudent({
    studentId,
    clubIds,
    selectionClubIds: clubIds,
  })

  const noProgram = clubIds.filter((id) => !compat.get(id)?.hasSchedule)
  if (noProgram.length > 0) {
    return {
      ok: false,
      error: "Seçilen kulüplerden bazılarında henüz program tanımlanmamış",
    }
  }

  const studyClash = clubIds.filter((id) => compat.get(id)?.conflictsWithStudy)
  if (studyClash.length > 0) {
    return {
      ok: false,
      error: "Seçilen kulüp(ler) öğrencinin ÖÇG programıyla çakışıyor",
    }
  }

  // Pairwise among selection
  const blocksMap = await loadClubProgramBlocks(clubIds)
  for (let i = 0; i < clubIds.length; i++) {
    for (let j = i + 1; j < clubIds.length; j++) {
      if (clubProgramsConflict(blocksMap.get(clubIds[i]), blocksMap.get(clubIds[j]))) {
        return {
          ok: false,
          error: "Seçilen kulüpler kendi aralarında program çakışması yaşıyor",
        }
      }
    }
  }

  return { ok: true }
}
