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

type PeriodCol = {
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

function buildPeriodCols(
  ortaokulSlots: Array<LessonSlot & { kind?: SlotKind }>,
  liseSlots: Array<LessonSlot & { kind?: SlotKind }>
): PeriodCol[] {
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

  const cols: PeriodCol[] = []
  for (const day of WEEKDAY_INDEXES) {
    for (const periodLabel of labelOrder) {
      cols.push({
        key: `${day}|${periodLabel}`,
        dayOfWeek: day,
        dayLabel: DAY_NAMES[day],
        periodLabel,
        isEtut: isEtutLabel(periodLabel),
        starts: [...(startsByLabel.get(periodLabel) ?? [])],
      })
    }
  }
  return cols
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

function renderCell(cells: WideItem[]) {
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
  if (!primary) {
    return <div className="min-h-[3.25rem] rounded-md border border-dashed border-transparent" />
  }
  const kind = conflict ? ("conflict" as const) : primary.kind
  return (
    <div
      className={`w-full min-h-[3.25rem] rounded-md px-1.5 py-1 text-left ${cellStyles(kind)}`}
      title={cells
        .map(
          (c) =>
            `${c.label} · ${c.detail}${c.room ? ` · ${c.room}` : ""} (${c.startTime}–${c.endTime})`
        )
        .join("\n")}
    >
      {cells.map((c) => (
        <div key={c.id} className="mb-1 last:mb-0">
          <p className="text-[11px] font-semibold leading-snug">{c.label}</p>
          <p className="text-[10px] opacity-90 leading-snug">{c.detail}</p>
          {c.room ? <p className="text-[10px] text-gray-600">{c.room}</p> : null}
        </div>
      ))}
    </div>
  )
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

  const periodCols = useMemo(
    () => buildPeriodCols(ortaokulSlots, liseSlots),
    [ortaokulSlots, liseSlots]
  )

  const periodLabels = useMemo(() => {
    const seen = new Set<string>()
    const labels: string[] = []
    for (const c of periodCols) {
      if (seen.has(c.periodLabel)) continue
      seen.add(c.periodLabel)
      labels.push(c.periodLabel)
    }
    return labels
  }, [periodCols])

  const startToPeriod = useMemo(() => {
    const map = new Map<string, string>()
    for (const col of periodCols) {
      for (const start of col.starts) {
        if (!map.has(`${col.dayOfWeek}|${start}`)) {
          map.set(`${col.dayOfWeek}|${start}`, col.periodLabel)
        }
      }
    }
    return map
  }, [periodCols])

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
        periodCols.find(
          (r) => r.dayOfWeek === it.dayOfWeek && r.starts.includes(start)
        )?.periodLabel
      if (!period) continue
      const key = `${it.teacherId}|${it.dayOfWeek}|${period}`
      const list = map.get(key) ?? []
      list.push(it)
      map.set(key, list)
    }
    return map
  }, [filteredItems, startToPeriod, periodCols])

  const visibleTeachers = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr")
    return teachers
      .filter((t) => {
        if (onlyScheduled && !filteredItems.some((it) => it.teacherId === t.id)) {
          return false
        }
        if (!q) return true
        const hay = `${t.firstName} ${t.lastName} ${t.subject ?? ""}`.toLocaleLowerCase("tr")
        return hay.includes(q)
      })
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          "tr"
        )
      )
  }, [teachers, onlyScheduled, filteredItems, search])

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

  if (periodCols.length === 0) {
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

  const periodsPerDay = periodLabels.length

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

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-slate-800 bg-white shadow-sm">
        <table className="border-collapse text-left border border-slate-800">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-900 text-white">
              <th
                rowSpan={2}
                className="sticky left-0 z-30 border-b border-r-2 border-slate-700 bg-slate-950 px-3 py-2 text-[12px] font-semibold min-w-[14rem] w-[14rem] align-middle"
              >
                Öğretmen
              </th>
              {WEEKDAY_INDEXES.map((day, di) => (
                <th
                  key={day}
                  colSpan={periodsPerDay}
                  className={`border-b border-slate-700 px-1 py-1.5 text-center text-[12px] font-bold ${
                    di === 0 ? "" : "border-l-[3px] border-l-slate-500"
                  }`}
                >
                  {DAY_NAMES[day]}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-800 text-white">
              {periodCols.map((col, i) => {
                const isDayStart = col.periodLabel === periodLabels[0]
                return (
                  <th
                    key={col.key}
                    className={`border-b border-slate-700 px-1 py-1.5 text-center text-[10px] font-semibold min-w-[6.5rem] whitespace-nowrap ${
                      isDayStart && i > 0 ? "border-l-[3px] border-l-slate-500" : "border-l border-l-slate-700/60"
                    } ${col.isEtut ? "bg-amber-950/50 text-amber-100" : ""}`}
                  >
                    {col.periodLabel}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visibleTeachers.map((t) => {
              const conflict = conflictTeacherIds.has(t.id)
              const fullName = `${t.firstName} ${t.lastName}`.trim()
              return (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <th
                    className={`sticky left-0 z-10 border border-slate-800 border-r-2 px-3 py-2 text-left align-middle min-w-[14rem] w-[14rem] ${
                      conflict
                        ? "bg-rose-100 text-rose-950"
                        : "bg-slate-50 text-slate-900"
                    }`}
                  >
                    <span className="block text-[13px] font-semibold leading-snug">
                      {fullName}
                    </span>
                    <span className="block text-[11px] font-normal text-slate-600 mt-0.5 leading-snug">
                      {t.subject || "—"}
                    </span>
                  </th>
                  {periodCols.map((col, i) => {
                    const cells =
                      cellMap.get(`${t.id}|${col.dayOfWeek}|${col.periodLabel}`) ?? []
                    const isDayStart = col.periodLabel === periodLabels[0]
                    return (
                      <td
                        key={`${t.id}|${col.key}`}
                        className={`border border-slate-800 p-0.5 align-top ${
                          isDayStart && i > 0
                            ? "border-l-[2px] border-l-slate-900"
                            : ""
                        } ${col.isEtut ? "bg-amber-50/30" : ""}`}
                      >
                        {renderCell(cells)}
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
