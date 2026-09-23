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
  /** Ortaokul / lise şablonundan geldiyse etiket ayırımı için */
  band?: "ortaokul" | "lise"
}

function slotKey(start: string, end: string) {
  return `${start}|${end}`
}

function basePeriodLabel(label: string): string {
  return label.replace(/\s*[·\-–]\s*(Ortaokul|Lise)\s*$/i, "").trim()
}

function bandSuffix(band?: "ortaokul" | "lise"): string | null {
  if (band === "lise") return "Lise"
  if (band === "ortaokul") return "Ortaokul"
  return null
}

/** Aynı dönem adı (örn. 5. Ders) farklı saatlerdeyse · Lise / · Ortaokul ekle. */
function disambiguateBandLabels(slots: TeacherGridSlot[]): TeacherGridSlot[] {
  const groups = new Map<string, TeacherGridSlot[]>()
  for (const s of slots) {
    const base = basePeriodLabel(s.label)
    const list = groups.get(base) ?? []
    list.push(s)
    groups.set(base, list)
  }

  const out: TeacherGridSlot[] = []
  for (const [base, group] of groups) {
    const uniqueStarts = new Set(group.map((s) => s.startTime))
    const needsBand = uniqueStarts.size > 1
    for (const s of group) {
      if (!needsBand) {
        out.push({ ...s, label: base })
        continue
      }
      const suffix = bandSuffix(s.band)
      out.push({
        ...s,
        label: suffix ? `${base} · ${suffix}` : `${base} · ${s.startTime}`,
      })
    }
  }
  return out
}

/**
 * Şablon dilimlerini birleştirir; öğretmenin programında geçen saatleri tutar.
 * Ortaokul/lise aynı dönem adı + farklı saatteyse etikete band eklenir.
 */
function buildSlotRows(
  weekdaySlots: TeacherGridSlot[],
  saturdaySlots: TeacherGridSlot[],
  items: TeacherScheduleItem[],
  includeSaturday: boolean
): TeacherGridSlot[] {
  const source = [
    ...weekdaySlots.filter((s) => (s.kind ?? "LESSON") === "LESSON"),
    ...(includeSaturday
      ? saturdaySlots.filter((s) => (s.kind ?? "LESSON") === "LESSON")
      : []),
  ]

  const byStart = new Map<string, TeacherGridSlot>()
  for (const s of source) {
    const existing = byStart.get(s.startTime)
    if (!existing) {
      byStart.set(s.startTime, { ...s, kind: "LESSON" })
    } else if (!existing.band && s.band) {
      byStart.set(s.startTime, { ...existing, band: s.band })
    }
  }

  // Şablonda olmayan ama öğretmenin programında olan saatler
  for (const item of items) {
    if (!includeSaturday && item.dayOfWeek === SATURDAY_INDEX) continue
    if (item.dayOfWeek < 1 || item.dayOfWeek > 6) continue
    if (!byStart.has(item.startTime)) {
      byStart.set(item.startTime, {
        id: byStart.size + 1,
        label: `${item.startTime}–${item.endTime}`,
        startTime: item.startTime,
        endTime: item.endTime,
        kind: "LESSON",
      })
    }
  }

  const usedStarts = new Set(
    items
      .filter((i) => includeSaturday || i.dayOfWeek !== SATURDAY_INDEX)
      .filter((i) => i.dayOfWeek >= 1 && i.dayOfWeek <= 6)
      .map((i) => i.startTime)
  )

  const filtered = [...byStart.values()].filter((s) => usedStarts.has(s.startTime))
  return disambiguateBandLabels(filtered).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )
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

  const slots = useMemo(
    () =>
      buildSlotRows(
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
      const key = `${item.dayOfWeek}|${item.startTime}`
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [items, dayIndexes])

  const unmatched = useMemo(() => {
    const starts = new Set(slots.map((s) => s.startTime))
    return items.filter(
      (i) => dayIndexes.includes(i.dayOfWeek) && !starts.has(i.startTime)
    )
  }, [items, slots, dayIndexes])

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
            {slots.map((slot) => (
              <tr key={slotKey(slot.startTime, slot.endTime)}>
                <td className="border-b border-r border-gray-200 p-2 text-xs font-medium text-gray-700 bg-gray-50/80">
                  <div>{slot.label}</div>
                  <div className="text-[10px] opacity-70 font-normal">
                    {slot.startTime}–{slot.endTime}
                  </div>
                </td>
                {dayIndexes.map((day) => {
                  const cellItems = byCell.get(`${day}|${slot.startTime}`) ?? []
                  const isSat = day === SATURDAY_INDEX
                  return (
                    <td
                      key={`${day}-${slot.startTime}`}
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
                              {(item.startTime !== slot.startTime ||
                                item.endTime !== slot.endTime) && (
                                <p className="text-[10px] text-indigo-600">
                                  {item.startTime}–{item.endTime}
                                </p>
                              )}
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
