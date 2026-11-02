import { hasTimeConflict } from "@/lib/schedules/time-conflict"

export type ScheduleBlock = {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export function scheduleBlocksConflict(a: ScheduleBlock, b: ScheduleBlock) {
  return (
    a.dayOfWeek === b.dayOfWeek &&
    hasTimeConflict(a.startTime, a.endTime, b.startTime, b.endTime)
  )
}

/** İki kulübün programları çakışıyor mu? */
export function clubProgramsConflict(
  a: ScheduleBlock[] | undefined | null,
  b: ScheduleBlock[] | undefined | null
) {
  if (!a?.length || !b?.length) return false
  return a.some((x) => b.some((y) => scheduleBlocksConflict(x, y)))
}
