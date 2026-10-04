"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { DAY_NAMES, WEEKDAY_INDEXES, normalizeTime } from "@/lib/schedules/lesson-slots"
import { normalizeSlotKind } from "@/lib/schedules/day-templates"

type Teacher = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

type StudySession = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  topic: string
  teacher: Teacher
  studyGroup?: { id: string; name: string } | null
}

type StudyGroupRow = {
  id: string
  name: string
  gradeLevels: number[]
  sessions: StudySession[]
  _count?: { students?: number }
  students?: unknown[]
}

type EtutSlot = {
  label: string
  startTime: string
  endTime: string
}

type GradeEtutExamRow = {
  id: string
  grade: number
  dayOfWeek: number
  startTime: string
  endTime: string
  title: string
}

type Props = {
  refreshKey?: number
}

export function StudySchedulesPanel({ refreshKey = 0 }: Props) {
  const [groups, setGroups] = useState<StudyGroupRow[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [gradeEtutExams, setGradeEtutExams] = useState<GradeEtutExamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [groupsRes, templatesRes, denemeRes] = await Promise.all([
        fetch("/api/study-groups", { cache: "no-store" }),
        fetch("/api/schedules/day-templates?band=all", { cache: "no-store" }),
        fetch("/api/schedules/grade-etut-exams", { cache: "no-store" }),
      ])
      if (!groupsRes.ok) throw new Error("ÖÇG grupları alınamadı")
      const gData = await groupsRes.json()
      setGroups(Array.isArray(gData.groups) ? gData.groups : [])

      if (templatesRes.ok) {
        const tmpl = await templatesRes.json()
        const templates = Array.isArray(tmpl.templates) ? tmpl.templates : []
        const seen = new Set<string>()
        const slots: EtutSlot[] = []
        for (const t of templates) {
          for (const s of Array.isArray(t.slots) ? t.slots : []) {
            if (normalizeSlotKind(s.kind, s.label) !== "ETUT") continue
            const start = normalizeTime(s.startTime)
            const end = normalizeTime(s.endTime)
            const key = `${start}|${end}`
            if (seen.has(key)) continue
            seen.add(key)
            slots.push({ label: s.label, startTime: start, endTime: end })
          }
        }
        setEtutSlots(slots)
      }

      if (denemeRes.ok) {
        const d = await denemeRes.json()
        setGradeEtutExams(Array.isArray(d.exams) ? d.exams : [])
      } else {
        setGradeEtutExams([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const allSessions = useMemo(() => {
    const out: Array<StudySession & { groupName: string; gradeLevels: number[] }> = []
    for (const g of groups) {
      for (const s of g.sessions ?? []) {
        out.push({
          ...s,
          groupName: g.name,
          gradeLevels: g.gradeLevels ?? [],
          studyGroup: { id: g.id, name: g.name },
        })
      }
    }
    return out
  }, [groups])

  const cellEntries = useCallback(
    (day: number, start: string, end: string) =>
      allSessions.filter(
        (s) =>
          s.dayOfWeek === day &&
          normalizeTime(s.startTime) === normalizeTime(start) &&
          normalizeTime(s.endTime) === normalizeTime(end)
      ),
    [allSessions]
  )

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Haftalık etüt programı — ÖÇG</h2>
        <p className="text-sm text-gray-600">
          Tüm özel çalışma gruplarının etüt atamaları burada görünür. Atama grup kartındaki{" "}
          <strong>Program ata</strong> ile yapılır.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {etutSlots.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
          Henüz etüt saati yok. <strong>Ders saatleri</strong> içinde türü <strong>Etüt</strong> olan
          satırlar ekleyin.
        </div>
      ) : allSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
          Henüz ÖÇG etüt ataması yok. Grup kartından <strong>Program ata</strong> ile ekleyin.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-r border-gray-200 p-2 text-xs font-semibold text-gray-700 w-28">
                  Etüt
                </th>
                {WEEKDAY_INDEXES.map((day) => (
                  <th
                    key={day}
                    className="border-b border-gray-200 p-2 text-xs font-semibold text-gray-700"
                  >
                    {DAY_NAMES[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {etutSlots.map((slot) => (
                <tr key={`${slot.startTime}-${slot.endTime}`}>
                  <td className="border-b border-r border-gray-200 p-2 text-xs font-medium bg-violet-50 text-violet-900">
                    <div>{slot.label}</div>
                    <div className="text-[10px] opacity-70 font-normal">
                      {slot.startTime}–{slot.endTime}
                    </div>
                  </td>
                  {WEEKDAY_INDEXES.map((day) => {
                    const entries = cellEntries(day, slot.startTime, slot.endTime)
                    const denemeGrades = [
                      ...new Set(
                        gradeEtutExams
                          .filter(
                            (e) =>
                              e.dayOfWeek === day &&
                              normalizeTime(e.startTime) === normalizeTime(slot.startTime) &&
                              normalizeTime(e.endTime) === normalizeTime(slot.endTime)
                          )
                          .map((e) => e.grade)
                      ),
                    ].sort((a, b) => a - b)
                    return (
                      <td
                        key={`${day}-${slot.startTime}`}
                        className="border-b border-gray-100 p-1.5 align-top min-h-[4rem]"
                      >
                        {denemeGrades.length > 0 && (
                          <div className="mb-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-1">
                            <p className="text-[10px] font-semibold text-rose-900 leading-tight">
                              Deneme · {denemeGrades.map((g) => `${g}.`).join(" ")} sınıf
                            </p>
                          </div>
                        )}
                        {entries.length === 0 ? (
                          denemeGrades.length === 0 ? (
                            <div className="flex h-14 items-center justify-center text-gray-200 text-xs">
                              —
                            </div>
                          ) : null
                        ) : (
                          <div className="space-y-1">
                            {entries.map((row) => (
                              <div
                                key={row.id}
                                className="w-full rounded-md border border-violet-200 bg-violet-50 px-1.5 py-1 text-left"
                                title={`${row.topic}${row.room ? ` · ${row.room}` : ""}`}
                              >
                                <p className="text-xs font-semibold text-gray-900 leading-tight truncate">
                                  {row.groupName}
                                </p>
                                <p className="text-[10px] text-violet-800 truncate">
                                  {row.teacher.firstName} {row.teacher.lastName}
                                </p>
                                {row.topic && (
                                  <p className="text-[10px] text-gray-500 truncate">{row.topic}</p>
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
      )}

      <p className="text-xs text-gray-500">
        Toplam {allSessions.length} etüt ataması · {groups.length} grup
      </p>
    </div>
  )
}
