"use client"

import { useMemo } from "react"
import {
  DAY_NAMES,
  DEFAULT_LESSON_SLOTS,
  DEFAULT_SATURDAY_SLOTS,
  normalizeTime,
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
  /** class = ders, study = ÖÇG, club = kulüp etüdü */
  kind?: "class" | "study" | "club"
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
  isEtut: boolean
}

function basePeriodLabel(label: string): string {
  return label.replace(/\s*[·\-–]\s*(Ortaokul|Lise)\s*$/i, "").trim()
}

function periodSortKey(label: string): number {
  const ders = label.match(/(\d+)\s*\.\s*Ders/i)
  if (ders) return Number(ders[1])
  const etut = label.match(/(\d+)\s*\.\s*Et[uü]t/i)
  if (etut) return 100 + Number(etut[1])
  if (/et[uü]t/i.test(label)) return 100
  return 50
}

function isEtutLabel(label: string): boolean {
  return /et[uü]t/i.test(label)
}

/**
 * Ortaokul/lise şablonlarını dönem adına (1. Ders, 1. Etüt…) göre birleştirir.
 * Aynı dönem tek satır olur; hücrede dersin gerçek saati gösterilir.
 * Etüt satırları her zaman gösterilir (boş = o saatte serbest).
 */
function buildPeriodRows(
  weekdaySlots: TeacherGridSlot[],
  saturdaySlots: TeacherGridSlot[],
  items: TeacherScheduleItem[],
  includeSaturday: boolean
): { rows: PeriodRow[]; startToPeriod: Map<string, string> } {
  const source = [
    ...weekdaySlots.filter((s) => {
      const k = s.kind ?? "LESSON"
      return k === "LESSON" || k === "ETUT"
    }),
    ...(includeSaturday
      ? saturdaySlots.filter((s) => {
          const k = s.kind ?? "LESSON"
          return k === "LESSON" || k === "ETUT"
        })
      : []),
  ]

  /** normalizeTime(start) → dönem etiketi */
  const startToPeriod = new Map<string, string>()
  /** dönem etiketi → start times */
  const periodStarts = new Map<string, Set<string>>()

  for (const s of source) {
    const label = basePeriodLabel(s.label) || `${s.startTime}–${s.endTime}`
    const start = normalizeTime(s.startTime)
    startToPeriod.set(start, label)
    const set = periodStarts.get(label) ?? new Set<string>()
    set.add(start)
    periodStarts.set(label, set)
  }

  // Şablonda olmayan saatler: kendi etiketiyle dönem
  for (const item of items) {
    if (!includeSaturday && item.dayOfWeek === SATURDAY_INDEX) continue
    if (item.dayOfWeek < 1 || item.dayOfWeek > 6) continue
    const start = normalizeTime(item.startTime)
    if (startToPeriod.has(start)) continue
    const label = `${normalizeTime(item.startTime)}–${normalizeTime(item.endTime)}`
    startToPeriod.set(start, label)
    const set = periodStarts.get(label) ?? new Set<string>()
    set.add(start)
    periodStarts.set(label, set)
  }

  const usedPeriodKeys = new Set<string>()
  for (const item of items) {
    if (!includeSaturday && item.dayOfWeek === SATURDAY_INDEX) continue
    if (item.dayOfWeek < 1 || item.dayOfWeek > 6) continue
    const key = startToPeriod.get(normalizeTime(item.startTime))
    if (key) usedPeriodKeys.add(key)
  }
  // Etüt satırlarını her zaman göster (boş hücre = öğretmen o saatte serbest)
  for (const label of periodStarts.keys()) {
    if (isEtutLabel(label)) usedPeriodKeys.add(label)
  }

  const rows: PeriodRow[] = [...usedPeriodKeys].map((label) => {
    const starts = [...(periodStarts.get(label) ?? [])].sort()
    return {
      key: label,
      label,
      startTimes: starts,
      sortTime: starts[0] ?? "99:99",
      isEtut: isEtutLabel(label),
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

function itemKindStyles(kind: TeacherScheduleItem["kind"]) {
  if (kind === "study") {
    return {
      block: "bg-sky-100/90 ring-1 ring-sky-200",
      title: "text-sky-950",
      meta: "text-sky-800 font-medium",
      time: "text-sky-700",
      badge: "ÖÇG",
    }
  }
  if (kind === "club") {
    return {
      block: "bg-amber-100/90 ring-1 ring-amber-200",
      title: "text-amber-950",
      meta: "text-amber-800 font-medium",
      time: "text-amber-700",
      badge: "Kulüp",
    }
  }
  return {
    block: "",
    title: "text-gray-900",
    meta: "text-gray-600",
    time: "text-gray-500",
    badge: "",
  }
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
          : [...DEFAULT_LESSON_SLOTS],
        saturdaySlots && saturdaySlots.length > 0
          ? saturdaySlots
          : [...DEFAULT_SATURDAY_SLOTS],
        items,
        hasSaturday
      ),
    [weekdaySlots, saturdaySlots, items, hasSaturday]
  )

  const byCell = useMemo(() => {
    const map = new Map<string, TeacherScheduleItem[]>()
    for (const item of items) {
      if (!dayIndexes.includes(item.dayOfWeek)) continue
      const period = startToPeriod.get(normalizeTime(item.startTime))
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
      (i) =>
        dayIndexes.includes(i.dayOfWeek) &&
        !startToPeriod.has(normalizeTime(i.startTime))
    )
  }, [items, dayIndexes, startToPeriod])

  if (items.length === 0 && rows.every((r) => !r.isEtut)) {
    return (
      <p className="text-sm text-gray-500 text-center py-10">
        Bu öğretmene atanmış ders / etüt yok.
      </p>
    )
  }

  const hasEtutItems = items.some((i) => i.kind === "study" || i.kind === "club")
  const hasClassItems = items.some((i) => !i.kind || i.kind === "class")

  return (
    <div className="space-y-3">
      {title && (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{title}</span> haftalık ders programı
          {hasSaturday ? " (cumartesi dahil)" : ""}
        </p>
      )}

      {(hasClassItems || hasEtutItems || rows.some((r) => r.isEtut)) && (
        <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            Ders
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" />
            ÖÇG etüdü
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
            Kulüp etüdü
          </span>
        </div>
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
              <tr key={row.key} className={row.isEtut ? "bg-amber-50/30" : undefined}>
                <td
                  className={`border-b border-r border-gray-200 p-2 text-xs font-medium ${
                    row.isEtut
                      ? "bg-amber-50/80 text-amber-900"
                      : "bg-gray-50/80 text-gray-700"
                  }`}
                >
                  <div>{row.label}</div>
                </td>
                {dayIndexes.map((day) => {
                  const cellItems = byCell.get(`${day}|${row.key}`) ?? []
                  const isSat = day === SATURDAY_INDEX
                  const onlyStudy =
                    cellItems.length > 0 && cellItems.every((i) => i.kind === "study")
                  const onlyClub =
                    cellItems.length > 0 && cellItems.every((i) => i.kind === "club")
                  const cellBg =
                    cellItems.length === 0
                      ? ""
                      : onlyStudy
                        ? "bg-sky-50/90 border-l-2 border-l-sky-400"
                        : onlyClub
                          ? "bg-amber-50/90 border-l-2 border-l-amber-400"
                          : isSat
                            ? "bg-violet-50/80"
                            : "bg-emerald-50/80"
                  return (
                    <td
                      key={`${day}-${row.key}`}
                      className={`border-b border-gray-100 p-1.5 align-top min-h-[3rem] ${cellBg}`}
                    >
                      {cellItems.length === 0 ? (
                        <div className="h-12" />
                      ) : (
                        <div className="space-y-1.5">
                          {cellItems.map((item) => {
                            const styles = itemKindStyles(item.kind)
                            const accent =
                              (item.kind === "study" || item.kind === "club") &&
                              !(onlyStudy || onlyClub)
                            return (
                              <div
                                key={item.id}
                                className={`space-y-0.5 px-1.5 py-1 rounded-md ${
                                  accent ? styles.block : ""
                                }`}
                              >
                                <p
                                  className={`text-xs font-semibold leading-tight ${styles.title}`}
                                >
                                  {item.subjectName}
                                </p>
                                <p className={`text-[10px] leading-tight ${styles.meta}`}>
                                  {item.className}
                                  {styles.badge ? ` · ${styles.badge}` : ""}
                                </p>
                                <p className={`text-[10px] leading-tight ${styles.time}`}>
                                  {normalizeTime(item.startTime)}–{normalizeTime(item.endTime)}
                                </p>
                                {item.room && (
                                  <p className={`text-[10px] ${styles.time}`}>{item.room}</p>
                                )}
                              </div>
                            )
                          })}
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
