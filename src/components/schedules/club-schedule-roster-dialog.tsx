"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, RotateCcw, Search, UserMinus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type RosterStudent = {
  id: string
  firstName: string
  lastName: string
  grade: string
  note?: string | null
}

type RosterPayload = {
  schedule: {
    id: string
    dayLabel: string
    startTime: string
    endTime: string
    room: string | null
    clubName: string
    clubGroupId: string | null
    clubGroupName: string | null
  }
  active: RosterStudent[]
  excluded: RosterStudent[]
  applicantsNotInGroup: RosterStudent[]
}

export function ClubScheduleRosterDialog({
  open,
  clubScheduleId,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  clubScheduleId: string | null
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const [roster, setRoster] = useState<RosterPayload | null>(null)
  const [search, setSearch] = useState("")

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/schedules/clubs/${id}/roster`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Liste alınamadı")
      setRoster(data.roster ?? null)
    } catch (e) {
      setRoster(null)
      setError(e instanceof Error ? e.message : "Yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && clubScheduleId) {
      setSearch("")
      setFlash("")
      void load(clubScheduleId)
    }
  }, [open, clubScheduleId, load])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(""), 3500)
    return () => window.clearTimeout(t)
  }, [flash])

  const runAction = async (
    action: "exclude" | "restore" | "add_to_group",
    studentId: string
  ) => {
    if (!clubScheduleId) return
    setBusyId(`${action}:${studentId}`)
    try {
      const res = await fetch(`/api/schedules/clubs/${clubScheduleId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, studentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "İşlem başarısız")
        return
      }
      if (data.roster) setRoster(data.roster)
      setFlash(typeof data.message === "string" ? data.message : "Kaydedildi")
      onChanged?.()
    } finally {
      setBusyId(null)
    }
  }

  const q = search.trim().toLocaleLowerCase("tr")
  const match = (s: RosterStudent) => {
    if (!q) return true
    return `${s.firstName} ${s.lastName} ${s.grade}`.toLocaleLowerCase("tr").includes(q)
  }

  const active = useMemo(() => (roster?.active ?? []).filter(match), [roster, q])
  const excluded = useMemo(() => (roster?.excluded ?? []).filter(match), [roster, q])
  const applicants = useMemo(
    () => (roster?.applicantsNotInGroup ?? []).filter(match),
    [roster, q]
  )

  const title = roster
    ? `${roster.schedule.clubName}${
        roster.schedule.clubGroupName ? ` · ${roster.schedule.clubGroupName}` : ""
      }`
    : "Öğrenci listesi"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[min(96vw,36rem)] max-w-xl flex-col overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-emerald-700" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {roster
              ? `${roster.schedule.dayLabel} · ${roster.schedule.startTime}–${roster.schedule.endTime}${
                  roster.schedule.room ? ` · ${roster.schedule.room}` : ""
                }`
              : "Bu etüt saatindeki öğrenciler"}
            <span className="mt-1 block text-[11px] text-gray-500">
              Çıkar = yalnızca bu gün/saat (diğer günler devam eder). Geri al = o saate döner.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2 border-b border-gray-100 bg-gray-50/80 px-5 py-3">
          {flash ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900">
              {flash}
            </p>
          ) : null}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Öğrenci ara…"
              className="h-9 bg-white pl-8 text-sm"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex justify-center gap-2 py-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor…
            </div>
          ) : error ? (
            <p className="py-8 text-center text-rose-600">{error}</p>
          ) : !roster ? (
            <p className="py-8 text-center text-gray-500">Kayıt yok</p>
          ) : (
            <>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Bu saatte ({roster.active.length})
                </h3>
                {active.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">Bu saatte öğrenci yok.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {active.map((s) => {
                      const busy = busyId === `exclude:${s.id}`
                      return (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-[11px] text-gray-500">{s.grade}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 shrink-0 border-rose-200 text-rose-800 hover:bg-rose-50"
                            disabled={busyId !== null}
                            onClick={() => {
                              if (
                                !confirm(
                                  `${s.firstName} ${s.lastName} yalnızca bu saatten çıkarılsın mı?\n\nGrup üyeliği kalır; diğer günler devam eder.`
                                )
                              ) {
                                return
                              }
                              void runAction("exclude", s.id)
                            }}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="mr-1 h-3.5 w-3.5" />
                                Bu saatten çıkar
                              </>
                            )}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Bu saatten muaf ({roster.excluded.length})
                </h3>
                {excluded.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">Muaf öğrenci yok.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {excluded.map((s) => {
                      const busy = busyId === `restore:${s.id}`
                      return (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-[11px] text-gray-500">{s.grade}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 shrink-0 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                            disabled={busyId !== null}
                            onClick={() => void runAction("restore", s.id)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Geri al
                              </>
                            )}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              {roster.schedule.clubGroupId ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Gruba eklenebilir ({roster.applicantsNotInGroup.length})
                  </h3>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Kulübe başvurmuş, bu grupta olmayan öğrenciler. Eklenince tüm günlere dahil olur.
                  </p>
                  {applicants.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">Eklenecek başvuru yok.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {applicants.map((s) => {
                        const busy = busyId === `add_to_group:${s.id}`
                        return (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {s.firstName} {s.lastName}
                              </p>
                              <p className="text-[11px] text-gray-500">{s.grade}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 shrink-0 bg-emerald-700 hover:bg-emerald-800"
                              disabled={busyId !== null}
                              onClick={() => {
                                if (
                                  !confirm(
                                    `${s.firstName} ${s.lastName} bu gruba eklensin mi?`
                                  )
                                ) {
                                  return
                                }
                                void runAction("add_to_group", s.id)
                              }}
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="mr-1 h-3.5 w-3.5" />
                                  Gruba ekle
                                </>
                              )}
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              ) : null}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 py-3 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
