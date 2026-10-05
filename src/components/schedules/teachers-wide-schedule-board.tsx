"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  DAY_NAMES,
  WEEKDAY_INDEXES,
  normalizeTime,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"
import type { SlotKind } from "@/lib/schedules/day-templates"
import { hasTimeConflict } from "@/lib/schedules/time-conflict"

type TeacherCol = {
  id: string
  firstName: string
  lastName: string
  subject: string | null
  name: string
  itemCount: number
}

type WideItem = {
  id: string
  teacherId: string
  kind: "class" | "study" | "club"
  label: string
  detail: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
}

type PeriodRow = {
  key: string
  dayOfWeek: number
  dayLabel: string
  periodLabel: string
  isEtut: boolean
  starts: string[]
}

type KindFilter = "all" | "class" | "study" | "club"

function basePeriodLabel(label: string): string {
  return label.replace(/\s*[·\-–]\s*(Ortaokul|Lise)\s*$/i, "").trim()
}

function isEtutLabel(label: string): boolean {
  return /et[uü]t/i.test(label)
}

function periodSortKey(label: string): number {
  const ders = label.match(/(\d+)\s*\.\s*Ders/i)
  if (ders) return Number(ders[1])
  const etut = label.match(/(\d+)\s*\.\s*Et[uü]t/i)
  if (etut) return 100 + Number(etut[1])
  if (isEtutLabel(label)) return 100
  return 50
}

function buildPeriodRows(
  ortaokulSlots: Array<LessonSlot & { kind?: SlotKind }>,
  liseSlots: Array<LessonSlot & { kind?: SlotKind }>
): PeriodRow[] {
  const usable = [...ortaokulSlots, ...liseSlots].filter((s) => {
    const k = s.kind ?? "LESSON"
    return k === "LESSON" || k === "ETUT"
  })

  const labelOrder: string[] = []
  const startsByLabel = new Map<string, Set<string>>()

  for (const s of usable) {
    const label = basePeriodLabel(s.label) || `${s.startTime}`
    if (!startsByLabel.has(label)) {
      labelOrder.push(label)
      startsByLabel.set(label, new Set())
    }
    startsByLabel.get(label)!.add(normalizeTime(s.startTime))
  }

  labelOrder.sort((a, b) => periodSortKey(a) - periodSortKey(b))

  const rows: PeriodRow[] = []
  for (const day of WEEKDAY_INDEXES) {
    for (const periodLabel of labelOrder) {
      rows.push({
        key: `${day}|${periodLabel}`,
        dayOfWeek: day,
        dayLabel: DAY_NAMES[day],
        periodLabel,
        isEtut: isEtutLabel(periodLabel),
        starts: [...(startsByLabel.get(periodLabel) ?? [])],
      })
    }
  }
  return rows
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return name
  return parts[parts.length - 1]
}

function cellStyles(kind: WideItem["kind"] | "conflict") {
  if (kind === "conflict") {
    return "bg-rose-50 ring-1 ring-rose-300 text-rose-950"
  }
  if (kind === "club") {
    return "bg-amber-50 ring-1 ring-amber-200 text-amber-950"
  }
  if (kind === "study") {
    return "bg-violet-50 ring-1 ring-violet-200 text-violet-950"
  }
  return "bg-indigo-50 ring-1 ring-indigo-200 text-indigo-950"
}

export function TeachersWideScheduleBoard({
  ortaokulSlots,
  liseSlots,
  onlyScheduled = true,
  kindFilter = "all",
  search = "",
}: {
  ortaokulSlots: Array<LessonSlot & { kind?: SlotKind }>
  liseSlots: Array<LessonSlot & { kind?: SlotKind }>
  onlyScheduled?: boolean
  kindFilter?: KindFilter
  search?: string
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [teachers, setTeachers] = useState<TeacherCol[]>([])
  const [items, setItems] = useState<WideItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/schedules/teachers-wide", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Yüklenemedi")
      setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setTeachers([])
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const periodRows = useMemo(
    () => buildPeriodRows(ortaokulSlots, liseSlots),
    [ortaokulSlots, liseSlots]
  )

  const startToPeriod = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of periodRows) {
      for (const start of row.starts) {
        if (!map.has(`${row.dayOfWeek}|${start}`)) {
          map.set(`${row.dayOfWeek}|${start}`, row.periodLabel)
        }
      }
    }
    return map
  }, [periodRows])

  const filteredItems = useMemo(() => {
    if (kindFilter === "all") return items
    return items.filter((it) => it.kind === kindFilter)
  }, [items, kindFilter])

  const cellMap = useMemo(() => {
    const map = new Map<string, WideItem[]>()
    for (const it of filteredItems) {
      const start = normalizeTime(it.startTime)
      const period =
        startToPeriod.get(`${it.dayOfWeek}|${start}`) ??
        periodRows.find(
          (r) => r.dayOfWeek === it.dayOfWeek && r.starts.includes(start)
        )?.periodLabel
      if (!period) {
        // Şablonda yoksa yine de göster: saat etiketli satır yoksa atla
        continue
      }
      const key = `${it.teacherId}|${it.dayOfWeek}|${period}`
      const list = map.get(key) ?? []
      list.push(it)
      map.set(key, list)
    }
    return map
  }, [filteredItems, startToPeriod, periodRows])

  const visibleTeachers = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr")
    return teachers
      .filter((t) => {
        if (onlyScheduled && !filteredItems.some((it) => it.teacherId === t.id)) {
          return false
        }
        if (!q) return true
        const hay = `${t.name} ${t.subject ?? ""}`.toLocaleLowerCase("tr")
        return hay.includes(q)
      })
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          "tr"
        )
      )
  }, [teachers, onlyScheduled, filteredItems, search])

  const dayRowSpans = useMemo(() => {
    const map = new Map<number, number>()
    for (const day of WEEKDAY_INDEXES) {
      map.set(
        day,
        periodRows.filter((r) => r.dayOfWeek === day).length
      )
    }
    return map
  }, [periodRows])

  const firstPeriodKeyByDay = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of periodRows) {
      if (!map.has(row.dayOfWeek)) map.set(row.dayOfWeek, row.key)
    }
    return map
  }, [periodRows])

  const conflictTeacherIds = useMemo(() => {
    const set = new Set<string>()
    for (const t of visibleTeachers) {
      const byDay = new Map<number, WideItem[]>()
      for (const it of filteredItems) {
        if (it.teacherId !== t.id) continue
        const list = byDay.get(it.dayOfWeek) ?? []
        list.push(it)
        byDay.set(it.dayOfWeek, list)
      }
      for (const list of byDay.values()) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            if (
              hasTimeConflict(
                list[i].startTime,
                list[i].endTime,
                list[j].startTime,
                list[j].endTime
              )
            ) {
              set.add(t.id)
            }
          }
        }
      }
    }
    return set
  }, [visibleTeachers, filteredItems])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Öğretmen programları yükleniyor…
      </div>
    )
  }

  if (error) {
    return <p className="py-16 text-center text-rose-600">{error}</p>
  }

  if (periodRows.length === 0) {
    return (
      <p className="py-16 text-center text-amber-800 text-sm">
        Ders saatleri şablonu bulunamadı. Önce <strong>Ders saatleri</strong> tanımlayın.
      </p>
    )
  }

  if (visibleTeachers.length === 0) {
    return (
      <p className="py-16 text-center text-gray-500 text-sm">
        Gösterilecek öğretmen yok. Filtreyi veya “Programı olanlar” seçeneğini değiştirin.
      </p>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 shrink-0 text-[11px] text-gray-600 px-0.5">
        <span>{visibleTeachers.length} öğretmen</span>
        <span className="text-gray-400">
          ({filteredItems.length} satır · {conflictTeacherIds.size} çakışmalı)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-400" /> Ders
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Kulüp
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" /> ÖÇG
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Çakışma
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="border-collapse text-left">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-900 text-white">
              <th className="sticky left-0 z-30 border-b border-r-2 border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-semibold min-w-[4.5rem] w-[4.5rem]">
                Gün
              </th>
              <th className="sticky left-[4.5rem] z-30 border-b border-r-2 border-slate-600 bg-slate-900 px-2 py-2 text-[10px] font-semibold min-w-[4.25rem] w-[4.25rem]">
                Saat
              </th>
              {visibleTeachers.map((t, i) => (
                <th
                  key={t.id}
                  className={`border-b border-slate-700 px-1.5 py-2 text-center min-w-[5.5rem] max-w-[7rem] ${
                    i === 0 ? "" : "border-l-[3px] border-l-slate-500"
                  } ${conflictTeacherIds.has(t.id) ? "bg-rose-950/50" : ""}`}
                >
                  <span className="block text-[10px] font-bold leading-tight line-clamp-2">
                    {shortName(t.name)}
                  </span>
                  <span className="block text-[9px] font-normal text-slate-300 mt-0.5 truncate">
                    {t.subject || "—"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodRows.map((period) => {
              const showDay = firstPeriodKeyByDay.get(period.dayOfWeek) === period.key
              const span = dayRowSpans.get(period.dayOfWeek) ?? 1
              return (
                <tr
                  key={period.key}
                  className={period.isEtut ? "bg-amber-50/40" : undefined}
                >
                  {showDay ? (
                    <th
                      rowSpan={span}
                      className="sticky left-0 z-10 border-b border-r-2 border-slate-300 bg-slate-100 px-2 py-1 align-middle text-[11px] font-bold text-slate-800 w-[4.5rem]"
                    >
                      {period.dayLabel}
                    </th>
                  ) : null}
                  <th
                    className={`sticky left-[4.5rem] z-10 border-b border-r-2 border-slate-200 px-2 py-1 text-left text-[10px] font-medium whitespace-nowrap w-[4.25rem] ${
                      period.isEtut
                        ? "bg-amber-50 text-amber-900"
                        : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {period.periodLabel}
                  </th>
                  {visibleTeachers.map((t, i) => {
                    const cells =
                      cellMap.get(`${t.id}|${period.dayOfWeek}|${period.periodLabel}`) ??
                      []
                    let conflict = false
                    for (let a = 0; a < cells.length; a++) {
                      for (let b = a + 1; b < cells.length; b++) {
                        if (
                          hasTimeConflict(
                            cells[a].startTime,
                            cells[a].endTime,
                            cells[b].startTime,
                            cells[b].endTime
                          )
                        ) {
                          conflict = true
                          break
                        }
                      }
                      if (conflict) break
                    }
                    const primary = cells[0]
                    const kind = conflict
                      ? ("conflict" as const)
                      : primary
                        ? primary.kind
                        : null

                    return (
                      <td
                        key={`${t.id}|${period.key}`}
                        className={`border-b border-slate-200 p-0.5 align-top ${
                          i === 0 ? "" : "border-l-[3px] border-l-slate-300"
                        }`}
                      >
                        {primary ? (
                          <div
                            className={`w-full min-h-[2.75rem] rounded-md px-1 py-0.5 text-left ${cellStyles(kind!)}`}
                            title={cells
                              .map(
                                (c) =>
                                  `${c.label} · ${c.detail}${c.room ? ` · ${c.room}` : ""} (${c.startTime}–${c.endTime})`
                              )
                              .join("\n")}
                          >
                            {cells.slice(0, 3).map((c) => (
                              <div key={c.id} className="mb-0.5 last:mb-0">
                                <p className="text-[10px] font-semibold leading-tight line-clamp-1">
                                  {c.label}
                                </p>
                                <p className="text-[9px] opacity-80 truncate">{c.detail}</p>
                              </div>
                            ))}
                            {cells.length > 3 && (
                              <p className="text-[9px] font-semibold">+{cells.length - 3}</p>
                            )}
                          </div>
                        ) : (
                          <div className="min-h-[2.75rem] rounded-md border border-dashed border-transparent" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
