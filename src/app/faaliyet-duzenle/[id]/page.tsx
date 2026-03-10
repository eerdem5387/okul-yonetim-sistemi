"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { FaaliyetDuzenlePage } from "@/components/faaliyet-ekle/FaaliyetDuzenlePage"

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

export default function FaaliyetDuzenleRoute() {
  const params = useParams()
  const activityId = typeof params.id === "string" ? params.id : ""
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string; grade: string; tcNumber: string }>>([])
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])

  useEffect(() => {
    if (!activityId) return
    Promise.all([
      fetch("/api/students?limit=1000", { headers: getAuthHeaders() }),
      fetch("/api/staff?limit=200", { headers: getAuthHeaders() }),
    ])
      .then(async ([stRes, staffRes]) => {
        const stData = await stRes.json()
        const staffData = await staffRes.json()
        const stList = Array.isArray(stData) ? stData : stData?.students ?? []
        const staffList = Array.isArray(staffData) ? staffData : staffData?.staff ?? []
        setStudents(stList)
        setTeachers(
          staffList.map((s: { id: string; firstName: string; lastName: string }) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
          }))
        )
      })
      .catch(() => {})
  }, [activityId])

  if (!activityId) return null

  return (
    <FaaliyetDuzenlePage
      activityId={activityId}
      backHref="/activities"
      backLabel="IB Faaliyet Yönetimine Dön"
      students={students}
      teachers={teachers}
    />
  )
}
