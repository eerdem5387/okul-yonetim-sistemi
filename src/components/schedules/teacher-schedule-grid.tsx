"use client"

import { useMemo } from "react"
import {
  DAY_NAMES,
  DEFAULT_LESSON_SLOTS,
  DEFAULT_SATURDAY_SLOTS,
  SATURDAY_INDEX,
  WEEKDAY_INDEXES,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"

export type TeacherScheduleItem = {
  id: string
  subjectName: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room?: string | null
  className: string
  kind?: "class" | "study"
}

export type TeacherGridSlot = LessonSlot & {
  kind?: "LESSON" | "BREAK" | "ETUT"
  band?: "ortaokul" | "lise"
}

type PeriodRow = {
  key: string
  label: string
  /** Bu döneme ait tüm şablon başlangıç saatleri (ortaokul + lise) */
  startTimes: string[]
  sortTime: string
}

function basePeriodLabel(label: string): string {
  return label.replace(/\s*[·\-–]\s*(Ortaokul|Lise)\s*$/i, "").trim()
}

function periodSortKey(label: string): number {
  const m = label.match(/(\d+)\s*\.\s*Ders/i)
  if (m) return Number(m[1])
  if (/et[uü]t/i.test(label)) return 100
  return 50
}

/**
 * Ortaokul/lise şablonlarını dönem adına (1. Ders, 5. Ders…) göre birleştirir.
 * Aynı dönem tek satır olur; hücrede dersin gerçek saati gösterilir.
 */
function buildPeriodRows(
  weekdaySlots: TeacherGridSlot[],
  saturdaySlots: TeacherGridSlot[],
  items: TeacherScheduleItem[],
  includeSaturday: boolean
): { rows: PeriodRow[]; startToPeriod: Map<string, string> } {
  const source = [
    ...weekdaySlots.filter((s) => (s.kind ?? "LESSON") === "LESSON"),
    ...(includeSaturday
      ? saturdaySlots.filter((s) => (s.kind ?? "LESSON") === "LESSON")
      : []),
  ]

  /** startTime → dönem etiketi (5. Ders) */
  const startToPeriod = new Map<string, string>()
  /** dönem etiketi → start times */
  const periodStarts = new Map<string, Set<string>>()

  for (const s of source) {
    const label = basePeriodLabel(s.label) || `${s.startTime}–${s.endTime}`
    startToPeriod.set(s.startTime, label)
    const set = periodStarts.get(label) ?? new Set<string>()
    set.add(s.startTime)
    periodStarts.set(label, set)
  }

  // Şablonda olmayan saatler: kendi etiketiyle dönem
  for (const item of items) {
    if (!includeSaturday && item.dayOfWeek === SATURDAY_INDEX) continue
    if (item.dayOfWeek < 1 || item.dayOfWeek > 6) continue
    if (startToPeriod.has(item.startTime)) continue
    const label = `${item.startTime}–${item.endTime}`
    startToPeriod.set(item.startTime, label)
    const set = periodStarts.get(label) ?? new Set<string>()
    set.add(item.startTime)
    periodStarts.set(label, set)
  }

  const usedPeriodKeys = new Set<string>()
  for (const item of items) {
    if (!includeSaturday && item.dayOfWeek === SATURDAY_INDEX) continue
    if (item.dayOfWeek < 1 || item.dayOfWeek > 6) continue
    const key = startToPeriod.get(item.startTime)
    if (key) usedPeriodKeys.add(key)
  }

  const rows: PeriodRow[] = [...usedPeriodKeys].map((label) => {
    const starts = [...(periodStarts.get(label) ?? [])].sort()
    return {
      key: label,
      label,
      startTimes: starts,
      sortTime: starts[0] ?? "99:99",
    }
  })

  rows.sort((a, b) => {
    const na = periodSortKey(a.label)
    const nb = periodSortKey(b.label)
    if (na !== nb) return na - nb
    return a.sortTime.localeCompare(b.sortTime)
  })

  return { rows, startToPeriod }
}

export function TeacherScheduleGrid({
  items,
  weekdaySlots,
  saturdaySlots,
  title,
}: {
  items: TeacherScheduleItem[]
  weekdaySlots?: TeacherGridSlot[]
  saturdaySlots?: TeacherGridSlot[]
  title?: string
}) {
  const hasSaturday = items.some((i) => i.dayOfWeek === SATURDAY_INDEX)
  const dayIndexes = useMemo(
    () =>
      hasSaturday
        ? ([...WEEKDAY_INDEXES, SATURDAY_INDEX] as number[])
        : ([...WEEKDAY_INDEXES] as number[]),
    [hasSaturday]
  )

  const { rows, startToPeriod } = useMemo(
    () =>
      buildPeriodRows(
        weekdaySlots && weekdaySlots.length > 0
          ? weekdaySlots
          : DEFAULT_LESSON_SLOTS.map((s) => ({ ...s, kind: "LESSON" as const })),
        saturdaySlots && saturdaySlots.length > 0
          ? saturdaySlots
          : DEFAULT_SATURDAY_SLOTS.map((s) => ({ ...s, kind: "LESSON" as const })),
        items,
        hasSaturday
      ),
    [weekdaySlots, saturdaySlots, items, hasSaturday]
  )

  const byCell = useMemo(() => {
    const map = new Map<string, TeacherScheduleItem[]>()
    for (const item of items) {
      if (!dayIndexes.includes(item.dayOfWeek)) continue
      const period = startToPeriod.get(item.startTime)
      if (!period) continue
      const key = `${item.dayOfWeek}|${period}`
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [items, dayIndexes, startToPeriod])

  const unmatched = useMemo(() => {
    return items.filter(
      (i) => dayIndexes.includes(i.dayOfWeek) && !startToPeriod.has(i.startTime)
    )
  }, [items, dayIndexes, startToPeriod])

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-10">Bu öğretmene atanmış ders yok.</p>
    )
  }

  return (
    <div className="space-y-3">
      {title && (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{title}</span> haftalık ders programı
          {hasSaturday ? " (cumartesi dahil)" : ""}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="border-b border-r border-gray-200 p-2 text-xs font-semibold text-gray-700 w-28">
                Saat
              </th>
              {dayIndexes.map((day) => (
                <th
                  key={day}
                  className={`border-b border-gray-200 p-2 text-xs font-semibold ${
                    day === SATURDAY_INDEX ? "text-violet-800 bg-violet-50/60" : "text-gray-700"
                  }`}
                >
                  {DAY_NAMES[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="border-b border-r border-gray-200 p-2 text-xs font-medium text-gray-700 bg-gray-50/80">
                  <div>{row.label}</div>
                </td>
                {dayIndexes.map((day) => {
                  const cellItems = byCell.get(`${day}|${row.key}`) ?? []
                  const isSat = day === SATURDAY_INDEX
                  return (
                    <td
                      key={`${day}-${row.key}`}
                      className={`border-b border-gray-100 p-1.5 align-top min-h-[3rem] ${
                        cellItems.length > 0
                          ? isSat
                            ? "bg-violet-50/80"
                            : "bg-emerald-50/80"
                          : ""
                      }`}
                    >
                      {cellItems.length === 0 ? (
                        <div className="h-12" />
                      ) : (
                        <div className="space-y-1.5">
                          {cellItems.map((item) => (
                            <div key={item.id} className="space-y-0.5 px-1 py-0.5">
                              <p className="text-xs font-semibold text-gray-900 leading-tight">
                                {item.subjectName}
                              </p>
                              <p className="text-[10px] text-gray-600 leading-tight">
                                {item.className}
                                {item.kind === "study" ? " · ÖÇG" : ""}
                              </p>
                              <p className="text-[10px] text-gray-500 leading-tight">
                                {item.startTime}–{item.endTime}
                              </p>
                              {item.room && (
                                <p className="text-[10px] text-gray-500">{item.room}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unmatched.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Şablon dışı saatler:{" "}
          {unmatched
            .map(
              (i) =>
                `${DAY_NAMES[i.dayOfWeek]} ${i.startTime}–${i.endTime} ${i.subjectName} (${i.className})`
            )
            .join(" · ")}
        </div>
      )}
    </div>
  )
}
