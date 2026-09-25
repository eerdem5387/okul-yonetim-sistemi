"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

export type AttendanceKind = "CLASS" | "STUDY_GROUP" | "CLUB"
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"

export type StudentAttendanceRecord = {
  id: string
  kind?: AttendanceKind | string | null
  status: string
  date: string
  lessonName: string
  startTime?: string | null
  endTime?: string | null
  note?: string | null
  teacher?: { firstName: string; lastName: string } | null
  class?: { name: string } | null
  studyGroupSession?: {
    topic?: string | null
    studyGroup?: { name: string; gradeLevel?: number } | null
  } | null
  clubSchedule?: { club?: { name: string } | null } | null
}

export type AttendanceKindStats = {
  PRESENT: number
  ABSENT: number
  LATE: number
  EXCUSED: number
  total: number
  rate: number | null
}

export type AttendanceByKind = Partial<
  Record<AttendanceKind, AttendanceKindStats>
>

const KIND_TABS: Array<{ id: "ALL" | AttendanceKind; label: string }> = [
  { id: "ALL", label: "Tümü" },
  { id: "CLASS", label: "Ders" },
  { id: "STUDY_GROUP", label: "ÖÇG" },
  { id: "CLUB", label: "Kulüp" },
]

const KIND_LABEL: Record<AttendanceKind, string> = {
  CLASS: "Ders",
  STUDY_GROUP: "ÖÇG",
  CLUB: "Kulüp",
}

const KIND_BADGE: Record<AttendanceKind, string> = {
  CLASS: "bg-emerald-50 text-emerald-800",
  STUDY_GROUP: "bg-sky-50 text-sky-800",
  CLUB: "bg-violet-50 text-violet-800",
}

const STATUS_TR: Record<string, string> = {
  PRESENT: "Geldi",
  ABSENT: "Gelmedi",
  LATE: "Geç",
  EXCUSED: "İzinli",
}

const STATUS_CLASS: Record<string, string> = {
  PRESENT: "bg-emerald-50 text-emerald-800",
  ABSENT: "bg-rose-50 text-rose-800",
  LATE: "bg-amber-50 text-amber-800",
  EXCUSED: "bg-sky-50 text-sky-800",
}

function asKind(kind?: string | null): AttendanceKind {
  if (kind === "STUDY_GROUP" || kind === "CLUB") return kind
  return "CLASS"
}

export function attendanceContextLabel(a: StudentAttendanceRecord): {
  title: string
  subtitle: string
} {
  const kind = asKind(a.kind)
  if (kind === "STUDY_GROUP") {
    const group = a.studyGroupSession?.studyGroup?.name
    const topic = a.studyGroupSession?.topic || a.lessonName
    const grade = a.studyGroupSession?.studyGroup?.gradeLevel
    return {
      title: topic,
      subtitle: [
        "ÖÇG",
        group,
        grade ? `${grade}. sınıf` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }
  }
  if (kind === "CLUB") {
    const club = a.clubSchedule?.club?.name || a.lessonName
    return { title: club, subtitle: "Kulüp" }
  }
  return {
    title: a.lessonName || "Ders",
    subtitle: a.class?.name ? `Sınıf · ${a.class.name}` : "Ders",
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function StudentAttendancePanel({
  attendances,
  byKind,
  overallRate,
  presentCount,
  totalCount,
  limit,
  emptyText = "Henüz yoklama kaydı yok",
  showFilters = true,
}: {
  attendances: StudentAttendanceRecord[]
  byKind?: AttendanceByKind | null
  overallRate?: number
  presentCount?: number
  totalCount?: number
  /** Kart önizlemesi için satır limiti */
  limit?: number
  emptyText?: string
  showFilters?: boolean
}) {
  const [kindFilter, setKindFilter] = useState<"ALL" | AttendanceKind>("ALL")

  const filtered = useMemo(() => {
    const list =
      kindFilter === "ALL"
        ? attendances
        : attendances.filter((a) => asKind(a.kind) === kindFilter)
    return typeof limit === "number" ? list.slice(0, limit) : list
  }, [attendances, kindFilter, limit])

  return (
    <div className="space-y-3">
      {(overallRate != null || byKind) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {overallRate != null && (
            <span className="inline-flex rounded-md bg-gray-100 px-2.5 py-1 font-medium text-gray-800">
              Genel devam %{overallRate}
              {totalCount != null && presentCount != null
                ? ` · ${presentCount}/${totalCount}`
                : ""}
            </span>
          )}
          {(["CLASS", "STUDY_GROUP", "CLUB"] as AttendanceKind[]).map((k) => {
            const s = byKind?.[k]
            if (!s || s.total === 0) return null
            return (
              <span
                key={k}
                className={`inline-flex rounded-md px-2.5 py-1 font-medium ${KIND_BADGE[k]}`}
              >
                {KIND_LABEL[k]} %{s.rate ?? 0}
                {s.ABSENT + s.LATE > 0
                  ? ` · sorun ${s.ABSENT + s.LATE}`
                  : ""}
              </span>
            )
          })}
        </div>
      )}

      {showFilters && (
        <div className="flex flex-wrap gap-1.5">
          {KIND_TABS.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={kindFilter === t.id ? "default" : "outline"}
              className="h-8"
              onClick={() => setKindFilter(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-8 text-center">
          <Calendar className="mx-auto mb-2 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const kind = asKind(a.kind)
            const ctx = attendanceContextLabel(a)
            const teacher = a.teacher
              ? `${a.teacher.firstName} ${a.teacher.lastName}`
              : null
            const time =
              a.startTime && a.endTime ? `${a.startTime}–${a.endTime}` : null
            return (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_BADGE[kind]}`}
                    >
                      {KIND_LABEL[kind]}
                    </span>
                    <p className="truncate text-sm font-medium text-gray-900">
                      {ctx.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {[ctx.subtitle, formatDate(a.date), time, teacher]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {a.note && (
                    <p className="mt-1 text-xs text-gray-500">Not: {a.note}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    STATUS_CLASS[a.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {STATUS_TR[a.status] || a.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
