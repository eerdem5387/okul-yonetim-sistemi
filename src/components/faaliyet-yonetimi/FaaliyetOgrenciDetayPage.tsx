"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { StudentActivityDetail } from "@/components/ib-faaliyet-dashboard/StudentActivityDetail"
import type { StudentActivityDetailActivity } from "@/components/ib-faaliyet-dashboard/StudentActivityDetail"
import {
  readActivityYearFromUrl,
  withActivityYear,
  ACTIVITY_YEAR_QUERY_KEY,
  type IBDashboardAcademicYear,
  type IBDashboardAcademicYearOption,
} from "@/components/ib-faaliyet-dashboard/IBFaaliyetDashboard"

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return headers
}

export interface FaaliyetOgrenciDetayPageProps {
  backHref: string
  backLabel?: string
}

export function FaaliyetOgrenciDetayPage({
  backHref,
  backLabel = "Faaliyet Yönetimine Dön",
}: FaaliyetOgrenciDetayPageProps) {
  const params = useParams()
  const studentId = typeof params.id === "string" ? params.id : ""
  const [student, setStudent] = useState<{
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber: string
  } | null>(null)
  const [activities, setActivities] = useState<StudentActivityDetailActivity[]>([])
  const [totalInSystem, setTotalInSystem] = useState(0)
  const [loading, setLoading] = useState(true)
  /** "" = aktif akademik yıl; <id> = geçmiş yıl; "all" = tüm yıllar (null: URL henüz okunmadı) */
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [yearOptions, setYearOptions] = useState<IBDashboardAcademicYearOption[]>([])
  const [activeYear, setActiveYear] = useState<IBDashboardAcademicYear | null>(null)

  useEffect(() => {
    setAcademicYearId(readActivityYearFromUrl())
    fetch("/api/activity-events/academic-years", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setYearOptions(data.years ?? [])
        setActiveYear(data.active ?? null)
      })
      .catch(() => setYearOptions([]))
  }, [])

  const selectYear = (yearId: string) => {
    setAcademicYearId(yearId)
    const url = new URL(window.location.href)
    if (yearId) url.searchParams.set(ACTIVITY_YEAR_QUERY_KEY, yearId)
    else url.searchParams.delete(ACTIVITY_YEAR_QUERY_KEY)
    window.history.replaceState(window.history.state, "", url.toString())
  }

  const fetchData = useCallback(async () => {
    if (!studentId || academicYearId === null) return
    setLoading(true)
    const yearParam = academicYearId ? `&academicYearId=${encodeURIComponent(academicYearId)}` : ""
    try {
      const [studentRes, eventRes, statsRes] = await Promise.all([
        fetch(`/api/students/${studentId}`, { headers: getAuthHeaders() }),
        fetch(`/api/activity-events?studentId=${studentId}&limit=100${yearParam}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`/api/activity-events/stats?${yearParam.slice(1)}`, { headers: getAuthHeaders() }),
      ])
      if (studentRes.ok) {
        const data = await studentRes.json()
        const s = data.student ?? data
        setStudent({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          grade: s.grade ?? "",
          tcNumber: s.tcNumber ?? "",
        })
      }
      if (eventRes.ok) {
        const data = await eventRes.json()
        const eventRows: StudentActivityDetailActivity[] = (data.events ?? []).flatMap(
          (ev: {
            id: string
            title: string
            description?: string | null
            startDate: string
            location?: string | null
            organizerName: string
            outcome?: string | null
            participants: Array<{
              id: string
              studentId: string
              score?: number | null
              languageLevel?: string | null
              participationPhotoUrl?: string | null
              extraDocumentUrl?: string | null
              projectRole?: string | null
              tournamentPlacement?: string | null
              artworkDescription?: string | null
              signedDocumentUrls?: string[]
              verificationStatus?: "IMZA_SURECINDE" | "ONAY_BEKLIYOR" | "ONAYLANDI"
              isVerified?: boolean
            }>
          }) => {
            const p = (ev.participants ?? []).find((x) => x.studentId === studentId)
            if (!p) return []
            return [
              {
                id: `event:${ev.id}:${p.id}`,
                source: "event",
                detailHref: `/faaliyet-yonetimi/${ev.id}/katilimci/${p.id}`,
                studentId,
                type: "ETKINLIK",
                title: ev.title,
                description: ev.description ?? null,
                activityDate: ev.startDate,
                location: ev.location ?? null,
                organizer: ev.organizerName ?? null,
                outcome: ev.outcome ?? null,
                isVerified: !!p.isVerified,
                verificationStatus: p.verificationStatus ?? "IMZA_SURECINDE",
                category: null,
                subtype: null,
                participationPhotoUrl: p.participationPhotoUrl ?? null,
                extraDocumentUrl: p.extraDocumentUrl ?? null,
                signedDocumentUrls: p.signedDocumentUrls ?? [],
                score: p.score ?? null,
                languageLevel: p.languageLevel ?? null,
                projectRole: p.projectRole ?? null,
                tournamentPlacement: p.tournamentPlacement ?? null,
                artworkDescription: p.artworkDescription ?? null,
              },
            ]
          }
        )
        setActivities(eventRows)
      }
      if (statsRes.ok) {
        const stats = await statsRes.json()
        setTotalInSystem(stats.total ?? stats.totalEvents ?? 0)
      }
    } catch {
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [studentId, academicYearId])

  useEffect(() => {
    if (studentId) fetchData()
  }, [studentId, fetchData])

  const scopeLabel =
    academicYearId === "all"
      ? "Tüm yıllar"
      : academicYearId
        ? yearOptions.find((y) => y.id === academicYearId)?.name ?? "Arşiv"
        : activeYear?.name ?? ""

  const yearSelector = (
    <div className="flex flex-col gap-1 sm:items-end">
      <label htmlFor="ogrenci-faaliyet-yil" className="text-xs font-medium text-gray-500">
        Akademik yıl
      </label>
      <select
        id="ogrenci-faaliyet-yil"
        value={academicYearId ?? ""}
        onChange={(e) => selectYear(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      >
        <option value="">{activeYear ? `${activeYear.name} (aktif)` : "Aktif yıl"}</option>
        {yearOptions
          .filter((y) => !y.isActive && (y.eventCount > 0 || y.id === academicYearId))
          .map((y) => (
            <option key={y.id} value={y.id}>
              {y.name} — arşiv
            </option>
          ))}
        <option value="all">Tüm yıllar</option>
      </select>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Yükleniyor...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <StudentActivityDetail
      student={student}
      activities={activities}
      totalInSystem={totalInSystem}
      backHref={withActivityYear(backHref, academicYearId ?? "")}
      backLabel={backLabel}
      headerExtra={yearSelector}
      scopeLabel={scopeLabel}
    />
  )
}
