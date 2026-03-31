"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { StudentActivityDetail } from "@/components/ib-faaliyet-dashboard/StudentActivityDetail"
import type { StudentActivityDetailActivity } from "@/components/ib-faaliyet-dashboard/StudentActivityDetail"

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return headers
}

export default function IbOgrenciDetayPage() {
  const params = useParams()
  const router = useRouter()
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
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  const fetchData = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const [studentRes, eventRes, statsRes] = await Promise.all([
        fetch(`/api/students/${studentId}`, { headers: getAuthHeaders() }),
        fetch(`/api/activity-events?studentId=${studentId}&limit=200`, {
          headers: getAuthHeaders(),
        }),
        fetch("/api/activity-events/stats", { headers: getAuthHeaders() }),
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
        const eventRows: StudentActivityDetailActivity[] = (data.events ?? []).flatMap((ev: {
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
          return [{
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
          }]
        })
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
  }, [studentId])

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    const staffId = localStorage.getItem("staff_id")
    if (role !== "teacher" || !staffId) {
      setHasAccess(false)
      router.push("/login")
      return
    }
    fetch(`/api/staff/${staffId}`)
      .then((res) => res.json())
      .then((data) => {
        setHasAccess(!!data.hasIbAccess)
        if (!data.hasIbAccess) router.push("/ogretmen")
      })
      .catch(() => {
        setHasAccess(false)
        router.push("/login")
      })
  }, [router])

  useEffect(() => {
    if (hasAccess === true && studentId) fetchData()
  }, [hasAccess, studentId, fetchData])

  if (hasAccess === null || loading) {
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

  if (hasAccess === false) return null

  return (
    <StudentActivityDetail
      student={student}
      activities={activities}
      totalInSystem={totalInSystem}
      backHref="/ogretmen/ib-yonetimi"
      backLabel="IB Yönetimine Dön"
    />
  )
}
