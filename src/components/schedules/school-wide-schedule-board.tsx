"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  DAY_NAMES,
  WEEKDAY_INDEXES,
  gradeBandFor,
  normalizeTime,
  type GradeBand,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"
import type { SlotKind } from "@/lib/schedules/day-templates"

type ClassRow = {
  id: string
  name: string
  grade: number
  section: string
}

type ScheduleCell = {
  id: string
  classId: string
  subjectName: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  teacherName: string
  isActive?: boolean
}

type PeriodCol = {
  key: string
  dayOfWeek: number
  dayLabel: string
  periodLabel: string
  /** Ortaokul / lise başlangıç saatleri (eşleme için) */
  starts: string[]
}

function basePeriodLabel(label: string): string {
  return label.replace(/\s*[·\-–]\s*(Ortaokul|Lise)\s*$/i, "").trim()
}

function lessonPeriodsFromSlots(slots: Array<LessonSlot & { kind?: SlotKind }>): LessonSlot[] {
  return slots.filter((s) => (s.kind ?? "LESSON") === "LESSON")
}

function buildPeriodColumns(
  ortaokulSlots: Array<LessonSlot & { kind?: SlotKind }>,
  liseSlots: Array<LessonSlot & { kind?: SlotKind }>
): PeriodCol[] {
  const orta = lessonPeriodsFromSlots(ortaokulSlots)
  const lise = lessonPeriodsFromSlots(liseSlots)

  // Dönem sırası: 1. Ders … 8. Ders (etiket birleşimi)
  const labelOrder: string[] = []
  const startsByLabel = new Map<string, Set<string>>()

  for (const s of [...orta, ...lise]) {
    const label = basePeriodLabel(s.label) || `${s.startTime}`
    if (!startsByLabel.has(label)) {
      labelOrder.push(label)
      startsByLabel.set(label, new Set())
    }
    startsByLabel.get(label)!.add(normalizeTime(s.startTime))
  }

  labelOrder.sort((a, b) => {
    const na = Number(a.match(/(\d+)/)?.[1] ?? 99)
    const nb = Number(b.match(/(\d+)/)?.[1] ?? 99)
    return na - nb
  })

  const cols: PeriodCol[] = []
  for (const day of WEEKDAY_INDEXES) {
    for (const periodLabel of labelOrder) {
      cols.push({
        key: `${day}|${periodLabel}`,
        dayOfWeek: day,
        dayLabel: DAY_NAMES[day],
        periodLabel,
        starts: [...(startsByLabel.get(periodLabel) ?? [])],
      })
    }
  }
  return cols
}

function shortTeacher(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return name
  return parts[parts.length - 1]
}

export function SchoolWideScheduleBoard({
  classes,
  band,
  ortaokulSlots,
  liseSlots,
}: {
  classes: ClassRow[]
  band: GradeBand
  ortaokulSlots: Array<LessonSlot & { kind?: SlotKind }>
  liseSlots: Array<LessonSlot & { kind?: SlotKind }>
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [schedules, setSchedules] = useState<ScheduleCell[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    fetch("/api/schedules", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Program yüklenemedi")
        const rows = Array.isArray(data.schedules) ? data.schedules : []
        if (cancelled) return
        setSchedules(
          rows
            .filter((s: { isActive?: boolean }) => s.isActive !== false)
            .map(
              (s: {
                id: string
                classId: string
                subjectName: string
                dayOfWeek: number
                startTime: string
                endTime: string
                room?: string | null
                teacher?: { firstName?: string; lastName?: string } | null
              }) => ({
                id: s.id,
                classId: s.classId,
                subjectName: s.subjectName,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                room: s.room ?? null,
                teacherName: s.teacher
                  ? `${s.teacher.firstName ?? ""} ${s.teacher.lastName ?? ""}`.trim()
                  : "",
              })
            )
        )
      })
      .catch((e) => {
        if (!cancelled) {
          setSchedules([])
          setError(e instanceof Error ? e.message : "Yüklenemedi")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const periodCols = useMemo(
    () => buildPeriodColumns(ortaokulSlots, liseSlots),
    [ortaokulSlots, liseSlots]
  )

  const visibleClasses = useMemo(() => {
    return [...classes]
      .filter((c) => {
        if (band === "all") return true
        return gradeBandFor(c.grade) === band
      })
      .sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade
        return a.section.localeCompare(b.section, "tr")
      })
  }, [classes, band])

  /** classId|day|periodLabel → cells */
  const cellMap = useMemo(() => {
    const map = new Map<string, ScheduleCell[]>()
    const startToPeriod = new Map<string, string>()
    for (const col of periodCols) {
      for (const start of col.starts) {
        // Aynı start birden fazla etikete düşmesin; ilk kazanır (ortaokul/lise aynı etiket)
        if (!startToPeriod.has(`${col.dayOfWeek}|${start}`)) {
          startToPeriod.set(`${col.dayOfWeek}|${start}`, col.periodLabel)
        }
      }
    }

    for (const s of schedules) {
      const start = normalizeTime(s.startTime)
      const period =
        startToPeriod.get(`${s.dayOfWeek}|${start}`) ??
        // Fallback: sadece saate göre herhangi bir günde eşleşen dönem
        periodCols.find((c) => c.starts.includes(start))?.periodLabel
      if (!period) continue
      const key = `${s.classId}|${s.dayOfWeek}|${period}`
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return map
  }, [schedules, periodCols])

  const daySpans = useMemo(() => {
    const spans: Array<{ day: number; label: string; count: number }> = []
    for (const day of WEEKDAY_INDEXES) {
      const count = periodCols.filter((c) => c.dayOfWeek === day).length
      spans.push({ day, label: DAY_NAMES[day], count })
    }
    return spans
  }, [periodCols])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Tüm okul programı yükleniyor…
      </div>
    )
  }

  if (error) {
    return <p className="py-16 text-center text-rose-600">{error}</p>
  }

  if (visibleClasses.length === 0) {
    return (
      <p className="py-16 text-center text-gray-500">Gösterilecek sınıf yok.</p>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <p className="shrink-0 text-xs text-gray-500 px-0.5">
        {visibleClasses.length} sınıf · sağa-sola ve yukarı-aşağı kaydırın · tıklama gerekmez
      </p>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="border-collapse text-left">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-800 text-white">
              <th
                rowSpan={2}
                className="sticky left-0 z-30 border-b border-r border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold min-w-[5.5rem]"
              >
                Sınıf
              </th>
              {daySpans.map((d) => (
                <th
                  key={d.day}
                  colSpan={d.count}
                  className="border-b border-r border-slate-700 px-1 py-1.5 text-center text-xs font-semibold tracking-wide"
                >
                  {d.label}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-700 text-slate-100">
              {periodCols.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-slate-600 px-1 py-1 text-center text-[10px] font-medium whitespace-nowrap min-w-[4.75rem]"
                  title={`${col.dayLabel} · ${col.periodLabel}`}
                >
                  {col.periodLabel.replace(/\s*Ders\s*/i, ".")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleClasses.map((c, idx) => {
              const bandLabel = gradeBandFor(c.grade) === "ortaokul" ? "O" : "L"
              const rowBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"
              const stickyBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50"
              return (
                <tr key={c.id} className={rowBg}>
                  <th
                    className={`sticky left-0 z-10 border-b border-r border-slate-200 px-2.5 py-1 text-left ${stickyBg}`}
                  >
                    <span className="block text-xs font-bold text-slate-900 whitespace-nowrap">
                      {c.name}
                    </span>
                    <span className="text-[9px] font-normal text-slate-500">
                      {bandLabel}
                    </span>
                  </th>
                  {periodCols.map((col) => {
                    const cells =
                      cellMap.get(`${c.id}|${col.dayOfWeek}|${col.periodLabel}`) ?? []
                    return (
                      <td
                        key={`${c.id}|${col.key}`}
                        className="border-b border-r border-slate-100 px-0.5 py-0.5 align-top min-w-[4.75rem] max-w-[5.5rem]"
                      >
                        {cells.length === 0 ? (
                          <div className="h-9" />
                        ) : (
                          <div className="space-y-0.5">
                            {cells.map((cell) => (
                              <div
                                key={cell.id}
                                className="rounded px-1 py-0.5 bg-indigo-50/90 ring-1 ring-indigo-100/80"
                                title={`${cell.subjectName}${
                                  cell.teacherName ? ` · ${cell.teacherName}` : ""
                                }${cell.room ? ` · ${cell.room}` : ""} · ${normalizeTime(
                                  cell.startTime
                                )}–${normalizeTime(cell.endTime)}`}
                              >
                                <p className="text-[10px] font-semibold leading-tight text-indigo-950 truncate">
                                  {cell.subjectName}
                                </p>
                                {cell.teacherName ? (
                                  <p className="text-[9px] leading-tight text-indigo-800/80 truncate">
                                    {shortTeacher(cell.teacherName)}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
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
