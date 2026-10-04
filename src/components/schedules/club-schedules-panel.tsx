"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { ClubScheduleRosterDialog } from "@/components/schedules/club-schedule-roster-dialog"
import { DAY_NAMES, WEEKDAY_INDEXES } from "@/lib/schedules/lesson-slots"

type Instructor = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

type ClubRow = {
  id: string
  name: string
  capacity: number
  gradeLevels: number[]
  instructorId?: string | null
  instructor: Instructor | null
  _count: { selections: number }
}

type ClubGroupRow = {
  id: string
  name: string
  clubId: string
  club: {
    id: string
    name: string
    capacity: number
    instructorId?: string | null
    instructor: Instructor | null
  }
  _count: { students: number; schedules: number }
}

type EtutSlot = {
  label: string
  startTime: string
  endTime: string
  band: string
}

type ClubScheduleRow = {
  id: string
  clubId: string
  clubGroupId?: string | null
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  notes: string | null
  club: ClubRow
  clubGroup?: { id: string; name: string; _count: { students: number } } | null
  exclusions?: Array<{ studentId: string }>
}

type Props = {
  refreshKey?: number
  onRosterChanged?: () => void
}

export function ClubSchedulesPanel({ refreshKey = 0, onRosterChanged }: Props) {
  const [groups, setGroups] = useState<ClubGroupRow[]>([])
  const [schedules, setSchedules] = useState<ClubScheduleRow[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rosterId, setRosterId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/schedules/clubs", { cache: "no-store" })
      if (!res.ok) throw new Error("Kulüp programları alınamadı")
      const data = await res.json()
      setGroups(Array.isArray(data.groups) ? data.groups : [])
      setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
      setEtutSlots(Array.isArray(data.etutSlots) ? data.etutSlots : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setGroups([])
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const cellEntries = useCallback(
    (day: number, start: string, end: string) =>
      schedules.filter(
        (s) => s.dayOfWeek === day && s.startTime === start && s.endTime === end
      ),
    [schedules]
  )

  const unassignedGroups = useMemo(() => {
    const assigned = new Set(
      schedules.map((s) => s.clubGroupId || s.clubGroup?.id).filter(Boolean) as string[]
    )
    return groups.filter((g) => !assigned.has(g.id))
  }, [groups, schedules])

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
        <h2 className="text-lg font-semibold text-gray-900">Haftalık etüt programı — Kulüpler</h2>
        <p className="text-sm text-gray-600">
          Bir kulüp hücresine tıklayarak o gün/saatteki öğrencileri görüp ekleyip çıkarabilirsiniz.
          Program ataması grup kartındaki <strong>Program ata</strong> ile yapılır.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {etutSlots.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
          Henüz etüt saati yok. <strong>Ders saatleri</strong> içinde türü{" "}
          <strong>Etüt</strong> olan satırlar ekleyin.
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
                  <td className="border-b border-r border-gray-200 p-2 text-xs font-medium bg-emerald-50 text-emerald-900">
                    <div>{slot.label}</div>
                    <div className="text-[10px] opacity-70 font-normal">
                      {slot.startTime}–{slot.endTime}
                    </div>
                  </td>
                  {WEEKDAY_INDEXES.map((day) => {
                    const entries = cellEntries(day, slot.startTime, slot.endTime)
                    return (
                      <td
                        key={`${day}-${slot.startTime}`}
                        className="border-b border-gray-100 p-1.5 align-top min-h-[4rem]"
                      >
                        {entries.length === 0 ? (
                          <div className="flex h-14 items-center justify-center text-gray-200 text-xs">
                            —
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {entries.map((row) => {
                              const total = row.clubGroup
                                ? row.clubGroup._count.students
                                : row.club._count.selections
                              const muaf = row.exclusions?.length ?? 0
                              const active = Math.max(0, total - muaf)
                              return (
                                <button
                                  key={row.id}
                                  type="button"
                                  onClick={() => setRosterId(row.id)}
                                  className="w-full rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-left transition hover:border-emerald-400 hover:bg-emerald-100/80 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                  title="Öğrenci listesini aç"
                                >
                                  <p className="text-xs font-semibold text-gray-900 leading-tight truncate">
                                    {row.clubGroup
                                      ? `${row.club.name} · ${row.clubGroup.name}`
                                      : row.club.name}
                                  </p>
                                  <p className="text-[10px] text-gray-600">
                                    {active} öğrenci
                                    {muaf > 0 ? ` · ${muaf} muaf` : ""}
                                  </p>
                                  {row.club.instructor && (
                                    <p className="text-[10px] text-indigo-700 truncate">
                                      {row.club.instructor.firstName}{" "}
                                      {row.club.instructor.lastName}
                                    </p>
                                  )}
                                  {row.room && (
                                    <p className="text-[10px] text-gray-500">{row.room}</p>
                                  )}
                                </button>
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
      )}

      {unassignedGroups.length > 0 && (
        <p className="text-xs text-gray-500">
          Henüz programa alınmayan grup: {unassignedGroups.length} (
          {unassignedGroups
            .slice(0, 5)
            .map((g) => `${g.club.name}/${g.name}`)
            .join(", ")}
          {unassignedGroups.length > 5 ? "…" : ""})
        </p>
      )}

      {groups.length === 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Önce yukarıdan kulüp gruplarını oluşturun; ardından karttan Program ata ile etüt
          yerleştirin.
        </p>
      )}

      <ClubScheduleRosterDialog
        open={!!rosterId}
        clubScheduleId={rosterId}
        onOpenChange={(o) => {
          if (!o) setRosterId(null)
        }}
        onChanged={() => {
          void load()
          onRosterChanged?.()
        }}
      />
    </div>
  )
}
