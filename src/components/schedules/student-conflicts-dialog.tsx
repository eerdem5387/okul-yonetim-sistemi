"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  UserX,
} from "lucide-react"
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
  dayLabel: string
  startTime: string
  endTime: string
  teacherName: string | null
  clubId: string | null
  clubGroupId: string | null
  studyGroupId: string | null
  canExcludeDay: boolean
  otherDaysKeep: string[]
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
  const [exporting, setExporting] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [flash, setFlash] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentConflictDetail[]>([])
  const [gradeCounts, setGradeCounts] = useState<Record<string, number>>({})
  const [totalCount, setTotalCount] = useState(0)
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all")
  const [search, setSearch] = useState("")

  const load = useCallback(
    async (grade: number | "all" = gradeFilter) => {
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
          data.gradeCounts && typeof data.gradeCounts === "object"
            ? data.gradeCounts
            : {}
        )
        setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0)
      } catch (e) {
        setStudents([])
        setError(e instanceof Error ? e.message : "Yüklenemedi")
      } finally {
        setLoading(false)
      }
    },
    [gradeFilter]
  )

  useEffect(() => {
    if (open) {
      setFlash(null)
      void load(gradeFilter)
    }
  }, [open, gradeFilter, load])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 4500)
    return () => window.clearTimeout(t)
  }, [flash])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr")
    if (!q) return students
    return students.filter((s) => {
      const hay = `${s.firstName} ${s.lastName} ${s.grade}`.toLocaleLowerCase("tr")
      return hay.includes(q)
    })
  }, [students, search])

  const resolveAssignment = async (
    studentId: string,
    assignmentKey: string,
    action: "leave_group" = "leave_group"
  ) => {
    const busy = `${action}:${studentId}:${assignmentKey}`
    setBusyKey(busy)
    try {
      const res = await fetch("/api/schedules/student-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, studentId, assignmentKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "İşlem başarısız")
        return
      }
      setFlash(
        typeof (data as { message?: string }).message === "string"
          ? (data as { message: string }).message
          : "Kaydedildi"
      )
      await load(gradeFilter)
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
      setFlash(
        typeof (data as { message?: string }).message === "string"
          ? (data as { message: string }).message
          : "Atandı"
      )
      await load(gradeFilter)
    } finally {
      setBusyKey(null)
    }
  }

  const dismissStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.studentId !== studentId))
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/schedules/student-conflicts/export", {
        cache: "no-store",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || "Excel indirilemedi")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const cd = res.headers.get("Content-Disposition") || ""
      const match = cd.match(/filename="([^"]+)"/)
      a.download = match?.[1] || `cakisan-ogrenciler.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert("Excel indirilemedi")
    } finally {
      setExporting(false)
    }
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
            Aynı saatte iki programa düşen öğrenciler. Çözüm: çakışan
            kulüp/ÖÇG atamasından <strong>gruptan çıkar</strong> — üyelik silinir,
            çakışma gerçekten kalkar.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-gray-100 bg-gray-50/80 px-5 py-3 sm:px-6">
          {flash ? (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{flash}</span>
            </div>
          ) : null}
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
                    className={`overflow-hidden rounded-2xl border shadow-sm ${
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
                            Çakışma kalmadı — isterseniz aşağıdaki alternatiflerden
                            atayın
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
                      <section className="border-b border-gray-100 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Başvurduğu kulüpler
                        </h3>
                        {s.applications.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-500">
                            Başvuru kaydı yok
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-1.5">
                            {s.applications.map((app) => {
                              const isConflict = conflictingClubIds.has(app.clubId)
                              return (
                                <li
                                  key={app.clubId}
                                  className={`rounded-lg px-3 py-2 text-sm ${
                                    isConflict
                                      ? "border border-rose-200 bg-rose-50 text-rose-900"
                                      : "border border-gray-100 bg-gray-50 text-gray-800"
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

                      <section className="border-b border-gray-100 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                          Çakışan atamalar
                        </h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                          Aynı günde tek yer kuralı: çakışan atamadan gruptan çıkarın.
                        </p>

                        {conflictCleared ? (
                          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                            Bu öğrencide aktif çakışma kalmadı.
                          </p>
                        ) : (
                          s.clusters.map((cluster) => (
                            <div
                              key={`${cluster.dayOfWeek}-${cluster.timeLabel}`}
                              className="mt-3"
                            >
                              <p className="mb-1.5 text-xs font-medium text-gray-700">
                                {cluster.dayLabel} · {cluster.timeLabel}
                              </p>
                              <ul className="space-y-2.5">
                                {cluster.assignments.map((a) => {
                                  const leaveBusy =
                                    busyKey ===
                                    `leave_group:${s.studentId}:${a.key}`
                                  const hasOtherDays = a.otherDaysKeep.length > 0

                                  return (
                                    <li
                                      key={a.key}
                                      className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium leading-snug text-gray-900">
                                          {a.label}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-gray-600">
                                          {a.dayLabel} {a.startTime}–{a.endTime}
                                          {a.teacherName
                                            ? ` · ${a.teacherName}`
                                            : ""}
                                          {a.kind === "STUDY_GROUP" ? " · ÖÇG" : ""}
                                        </p>
                                        {hasOtherDays ? (
                                          <p className="mt-1.5 text-[11px] text-amber-800">
                                            Bu gruptan çıkınca diğer günler de kalkar:{" "}
                                            {a.otherDaysKeep.join(" · ")}
                                          </p>
                                        ) : null}
                                      </div>

                                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-8 border-rose-300 text-rose-800 hover:bg-rose-100"
                                          disabled={busyKey !== null}
                                          onClick={() => {
                                            const what =
                                              a.kind === "STUDY_GROUP"
                                                ? "ÖÇG grubundan tamamen çıkarılsın mı?"
                                                : hasOtherDays
                                                  ? `Tüm gruptan çıkarılsın mı?\n\nDikkat: ${a.otherDaysKeep.join(", ")} dahil tüm günler iptal olur.`
                                                  : "Kulüp grubundan / seçiminden tamamen çıkarılsın mı?"
                                            if (
                                              !confirm(
                                                `${s.firstName} ${s.lastName}\n\n${a.label}\n\n${what}`
                                              )
                                            ) {
                                              return
                                            }
                                            void resolveAssignment(
                                              s.studentId,
                                              a.key,
                                              "leave_group"
                                            )
                                          }}
                                        >
                                          {leaveBusy ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <>
                                              <UserX className="mr-1 h-3.5 w-3.5" />
                                              {a.kind === "STUDY_GROUP"
                                                ? "Gruptan çıkar"
                                                : "Tüm gruptan çıkar"}
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          ))
                        )}
                      </section>

                      <section className="p-4 sm:p-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Çakışmasız gidebileceği kulüpler
                        </h3>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Başvurularından, diğer programıyla çakışmayan gruplar.
                        </p>

                        {s.safeAlternatives.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-500">
                            Şu an çakışmasız alternatif yok. Önce bir çakışan günü
                            çıkarın veya başvurularına bakın.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {s.safeAlternatives.map((opt) => {
                              const busy =
                                busyKey ===
                                `assign:${s.studentId}:${opt.clubGroupId}`
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
                                        {opt.teacherName
                                          ? ` · ${opt.teacherName}`
                                          : ""}
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
                                        void assignToGroup(
                                          s.studentId,
                                          opt.clubGroupId
                                        )
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

        <div className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-gray-100 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load(gradeFilter)}
              disabled={loading}
            >
              Yenile
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void exportExcel()}
              disabled={exporting || loading}
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Excel indir
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
