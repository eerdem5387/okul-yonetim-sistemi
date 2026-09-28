"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2, Plus, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type ConflictAssignment = {
  key: string
  kind: "CLUB" | "STUDY_GROUP"
  label: string
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherName: string | null
  clubId: string | null
  clubGroupId: string | null
  studyGroupId: string | null
}

type ClubApplication = {
  clubId: string
  clubName: string
}

type SafeClubOption = {
  clubId: string
  clubName: string
  clubGroupId: string
  clubGroupName: string
  teacherName: string | null
  memberCount: number
  schedules: Array<{
    dayOfWeek: number
    dayLabel: string
    startTime: string
    endTime: string
  }>
}

type ConflictCluster = {
  dayOfWeek: number
  dayLabel: string
  timeLabel: string
  assignments: ConflictAssignment[]
}

type StudentConflictDetail = {
  studentId: string
  firstName: string
  lastName: string
  grade: string
  gradeLevel: number | null
  applications: ClubApplication[]
  clusters: ConflictCluster[]
  conflictingAssignments: ConflictAssignment[]
  safeAlternatives: SafeClubOption[]
}

const GRADE_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12] as const

export function StudentConflictsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [students, setStudents] = useState<StudentConflictDetail[]>([])
  const [gradeCounts, setGradeCounts] = useState<Record<string, number>>({})
  const [totalCount, setTotalCount] = useState(0)
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all")
  const [search, setSearch] = useState("")

  const load = useCallback(async (grade: number | "all" = gradeFilter) => {
    setLoading(true)
    setError("")
    try {
      const qs = grade === "all" ? "" : `?grade=${grade}`
      const res = await fetch(`/api/schedules/student-conflicts${qs}`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Çakışmalar alınamadı")
      setStudents(Array.isArray(data.students) ? data.students : [])
      setGradeCounts(
        data.gradeCounts && typeof data.gradeCounts === "object" ? data.gradeCounts : {}
      )
      setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0)
    } catch (e) {
      setStudents([])
      setError(e instanceof Error ? e.message : "Yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [gradeFilter])

  useEffect(() => {
    if (open) void load(gradeFilter)
  }, [open, gradeFilter, load])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr")
    if (!q) return students
    return students.filter((s) => {
      const hay = `${s.firstName} ${s.lastName} ${s.grade}`.toLocaleLowerCase("tr")
      return hay.includes(q)
    })
  }, [students, search])

  const removeAssignment = async (studentId: string, assignmentKey: string) => {
    const busy = `remove:${studentId}:${assignmentKey}`
    setBusyKey(busy)
    try {
      const res = await fetch("/api/schedules/student-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          studentId,
          assignmentKey,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Çıkarma başarısız")
        return
      }
      // Kartı yerinde tut: çıkar → sonra alternatif ata akışı bozulmasın
      setStudents((prev) =>
        prev.map((s) => {
          if (s.studentId !== studentId) return s
          const clusters = s.clusters
            .map((c) => ({
              ...c,
              assignments: c.assignments.filter((a) => a.key !== assignmentKey),
            }))
            .filter((c) => c.assignments.length >= 2)
          const seen = new Set<string>()
          const conflictingAssignments: ConflictAssignment[] = []
          for (const c of clusters) {
            for (const a of c.assignments) {
              if (seen.has(a.key)) continue
              seen.add(a.key)
              conflictingAssignments.push(a)
            }
          }
          return { ...s, conflictingAssignments, clusters }
        })
      )
    } finally {
      setBusyKey(null)
    }
  }

  const assignToGroup = async (studentId: string, clubGroupId: string) => {
    const busy = `assign:${studentId}:${clubGroupId}`
    setBusyKey(busy)
    try {
      const res = await fetch("/api/schedules/student-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          studentId,
          clubGroupId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Atama başarısız")
        return
      }
      // Atama sonrası listeden taze veri
      await load(gradeFilter)
    } finally {
      setBusyKey(null)
    }
  }

  const dismissStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.studentId !== studentId))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[min(96vw,72rem)] max-w-6xl flex-col overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-5 pb-4 pt-5 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Çakışan öğrenciler
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Sınıfa göre filtreleyin. Öğrenciyle konuşurken başvurularını, çakışan kulüpleri ve
            çakışmasız gidebileceği alternatifleri görün. Çakışandan{" "}
            <strong>Çıkar</strong>, alternatife <strong>Ata</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-gray-100 bg-gray-50/80 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={gradeFilter === "all" ? "default" : "outline"}
              className="h-8"
              onClick={() => setGradeFilter("all")}
            >
              Tümü ({totalCount})
            </Button>
            {GRADE_LEVELS.map((g) => {
              const count = gradeCounts[String(g)] ?? 0
              return (
                <Button
                  key={g}
                  type="button"
                  size="sm"
                  variant={gradeFilter === g ? "default" : "outline"}
                  className="h-8 min-w-12"
                  disabled={count === 0 && gradeFilter !== g}
                  onClick={() => setGradeFilter(g)}
                >
                  {g}. <span className="ml-1 opacity-70">({count})</span>
                </Button>
              )
            })}
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Öğrenci ara…"
            className="h-10 bg-white"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center gap-2 py-20 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Taranıyor...
            </div>
          ) : error ? (
            <p className="py-12 text-center text-rose-600">{error}</p>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium text-emerald-800">
                {students.length === 0 ? "Çakışma yok" : "Sonuç yok"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {students.length === 0
                  ? "Seçili filtrede örtüşen kulüp / ÖÇG öğrencisi bulunamadı."
                  : "Arama kriterine uyan öğrenci yok."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-medium text-amber-800">
                {filteredStudents.length} öğrenci
                {gradeFilter !== "all" ? ` · ${gradeFilter}. sınıf` : ""}
              </p>

              {filteredStudents.map((s) => {
                const conflictingClubIds = new Set(
                  s.conflictingAssignments
                    .filter((a) => a.kind === "CLUB" && a.clubId)
                    .map((a) => a.clubId as string)
                )
                const conflictCleared = s.clusters.length === 0

                return (
                  <article
                    key={s.studentId}
                    className={`rounded-2xl border shadow-sm overflow-hidden ${
                      conflictCleared
                        ? "border-emerald-200 bg-white"
                        : "border-amber-200/80 bg-white"
                    }`}
                  >
                    <header
                      className={`flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3 sm:px-5 ${
                        conflictCleared
                          ? "border-emerald-100 bg-emerald-50/60"
                          : "border-amber-100 bg-amber-50/60"
                      }`}
                    >
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{s.grade}</p>
                        {conflictCleared ? (
                          <p className="mt-1 text-xs font-medium text-emerald-800">
                            Çakışma kalmadı — isterseniz aşağıdaki alternatiflerden atayın
                          </p>
                        ) : null}
                      </div>
                      {conflictCleared ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissStudent(s.studentId)}
                        >
                          Kartı kapat
                        </Button>
                      ) : null}
                    </header>

                    <div className="grid gap-0 lg:grid-cols-3">
                      {/* Başvurular */}
                      <section className="border-b border-gray-100 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Başvurduğu kulüpler
                        </h3>
                        {s.applications.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-500">Başvuru kaydı yok</p>
                        ) : (
                          <ul className="mt-3 space-y-1.5">
                            {s.applications.map((app) => {
                              const isConflict = conflictingClubIds.has(app.clubId)
                              return (
                                <li
                                  key={app.clubId}
                                  className={`rounded-lg px-3 py-2 text-sm ${
                                    isConflict
                                      ? "bg-rose-50 text-rose-900 border border-rose-200"
                                      : "bg-gray-50 text-gray-800 border border-gray-100"
                                  }`}
                                >
                                  <span className="font-medium">{app.clubName}</span>
                                  {isConflict ? (
                                    <span className="mt-0.5 block text-[11px] text-rose-700">
                                      Programda çakışıyor
                                    </span>
                                  ) : null}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </section>

                      {/* Çakışanlar */}
                      <section className="border-b border-gray-100 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                          Çakışan atamalar
                        </h3>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Vazgeçilecek kulübün yanındaki Çıkar’a basın.
                        </p>

                        {conflictCleared ? (
                          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                            Bu öğrencide aktif çakışma kalmadı.
                          </p>
                        ) : (
                          s.clusters.map((cluster) => (
                            <div key={`${cluster.dayOfWeek}-${cluster.timeLabel}`} className="mt-3">
                              <p className="mb-1.5 text-xs font-medium text-gray-700">
                                {cluster.dayLabel} · {cluster.timeLabel}
                              </p>
                              <ul className="space-y-2">
                                {cluster.assignments.map((a) => {
                                  const busy =
                                    busyKey === `remove:${s.studentId}:${a.key}`
                                  return (
                                    <li
                                      key={a.key}
                                      className="flex items-start justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 leading-snug">
                                          {a.label}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-gray-600">
                                          {a.startTime}–{a.endTime}
                                          {a.teacherName ? ` · ${a.teacherName}` : ""}
                                          {a.kind === "STUDY_GROUP" ? " · ÖÇG" : ""}
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100"
                                        disabled={busy || busyKey !== null}
                                        onClick={() => {
                                          if (
                                            !confirm(
                                              `${s.firstName} ${s.lastName} bu atamadan çıkarılsın mı?\n\n${a.label}`
                                            )
                                          ) {
                                            return
                                          }
                                          void removeAssignment(s.studentId, a.key)
                                        }}
                                      >
                                        {busy ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <>
                                            <UserMinus className="mr-1 h-3.5 w-3.5" />
                                            Çıkar
                                          </>
                                        )}
                                      </Button>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          ))
                        )}
                      </section>

                      {/* Alternatifler */}
                      <section className="p-4 sm:p-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Çakışmasız gidebileceği kulüpler
                        </h3>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Başvurularından, diğer programıyla çakışmayan gruplar.
                        </p>

                        {s.safeAlternatives.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-500">
                            Şu an çakışmasız alternatif yok. Önce bir çakışandan çıkarın veya
                            başvurularına bakın.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {s.safeAlternatives.map((opt) => {
                              const busy =
                                busyKey === `assign:${s.studentId}:${opt.clubGroupId}`
                              return (
                                <li
                                  key={opt.clubGroupId}
                                  className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                        {opt.clubName}
                                        {opt.clubGroupName !== opt.clubName
                                          ? ` · ${opt.clubGroupName}`
                                          : ""}
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-gray-600">
                                        {opt.schedules
                                          .map(
                                            (sch) =>
                                              `${sch.dayLabel} ${sch.startTime}–${sch.endTime}`
                                          )
                                          .join(" · ")}
                                        {opt.teacherName ? ` · ${opt.teacherName}` : ""}
                                        {` · ${opt.memberCount} öğrenci`}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="shrink-0 bg-emerald-700 hover:bg-emerald-800"
                                      disabled={busy || busyKey !== null}
                                      onClick={() => {
                                        if (
                                          !confirm(
                                            `${s.firstName} ${s.lastName} bu gruba atansın mı?\n\n${opt.clubName} / ${opt.clubGroupName}`
                                          )
                                        ) {
                                          return
                                        }
                                        void assignToGroup(s.studentId, opt.clubGroupId)
                                      }}
                                    >
                                      {busy ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <>
                                          <Plus className="mr-1 h-3.5 w-3.5" />
                                          Ata
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </section>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 py-3 flex justify-between gap-2 sm:px-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(gradeFilter)}
            disabled={loading}
          >
            Yenile
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
