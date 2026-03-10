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

export default function ActivityStudentDetailPage() {
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
      const [studentRes, activitiesRes, statsRes] = await Promise.all([
        fetch(`/api/students/${studentId}`, { headers: getAuthHeaders() }),
        fetch(`/api/activities?studentId=${studentId}&limit=500`, {
          headers: getAuthHeaders(),
        }),
        fetch("/api/activities/stats", { headers: getAuthHeaders() }),
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
      if (activitiesRes.ok) {
        const data = await activitiesRes.json()
        setActivities(data.activities ?? [])
      }
      if (statsRes.ok) {
        const stats = await statsRes.json()
        setTotalInSystem(stats.total ?? 0)
      }
    } catch {
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const staffId = localStorage.getItem("staff_id")
      if (
        role === "admin" ||
        role === "principal" ||
        role === "student_affairs" ||
        role === "counselor" ||
        role === "head_counselor"
      ) {
        setHasAccess(true)
        return
      }
      if (role === "teacher" && staffId) {
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
      } else {
        setHasAccess(false)
        router.push("/login")
      }
    }
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
      backHref="/activities"
      backLabel="IB Faaliyet Yönetimine Dön"
    />
  )
}
