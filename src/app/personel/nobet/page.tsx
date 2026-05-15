"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { StaffDepartment } from "@prisma/client"
import { DutyWeeklyEditor } from "@/components/hr/DutyWeeklyEditor"
import { getAuthHeaders, isHrAdminClient } from "@/components/hr/hr-utils"

interface StaffOption {
  id: string
  firstName: string
  lastName: string
  department: StaffDepartment
  subject: string | null
}

export default function HrDutiesPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isHrAdminClient()) {
      router.replace("/personel")
      return
    }
    setAuthChecked(true)
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/staff?isActive=true&limit=500", {
          headers: getAuthHeaders(),
          cache: "no-store",
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled)
            setStaff(
              (data.staff || []).map((s: StaffOption) => ({
                id: s.id,
                firstName: s.firstName,
                lastName: s.lastName,
                department: s.department,
                subject: s.subject ?? null,
              }))
            )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [authChecked])

  if (!authChecked || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nöbet Çizelgesi</h1>
        <p className="text-sm text-gray-600">
          Haftalık nöbet noktalarını ve görevli personeli yönetin.
        </p>
      </div>

      <DutyWeeklyEditor staffOptions={staff} />
    </div>
  )
}
