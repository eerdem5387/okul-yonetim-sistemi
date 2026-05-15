"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { LeaveStatus } from "@prisma/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LeaveApprovalRow, type LeaveItem } from "@/components/hr/LeaveApprovalRow"
import { LeaveMonthCalendar } from "@/components/hr/LeaveMonthCalendar"
import { getAuthHeaders, isHrAdminClient } from "@/components/hr/hr-utils"

export default function HrLeavesPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [leaves, setLeaves] = useState<LeaveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"PENDING" | "ALL">("PENDING")

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isHrAdminClient()) {
      router.replace("/personel")
      return
    }
    setAuthChecked(true)
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = tab === "PENDING" ? "/api/hr/leaves?status=PENDING" : "/api/hr/leaves"
      const res = await fetch(url, { headers: getAuthHeaders(), cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setLeaves(data.leaves || [])
      }
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    if (!authChecked) return
    void load()
  }, [authChecked, load])

  const calendarItems = useMemo(
    () =>
      leaves.map((l) => ({
        id: l.id,
        type: l.type,
        status: l.status as LeaveStatus,
        startDate: l.startDate,
        endDate: l.endDate,
        staffLabel: `${l.staff.firstName} ${l.staff.lastName}`,
      })),
    [leaves]
  )

  if (!authChecked) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">İzin Yönetimi</h1>
        <p className="text-sm text-gray-600">
          Personel izin taleplerini onaylayın veya reddedin.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="PENDING">Bekleyen</TabsTrigger>
          <TabsTrigger value="ALL">Tümü</TabsTrigger>
        </TabsList>

        <TabsContent value="PENDING" className="space-y-3">
          <ListSection loading={loading} leaves={leaves} onChanged={load} />
        </TabsContent>

        <TabsContent value="ALL" className="space-y-4">
          <LeaveMonthCalendar items={calendarItems} height={500} />
          <ListSection loading={loading} leaves={leaves} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ListSection({
  loading,
  leaves,
  onChanged,
}: {
  loading: boolean
  leaves: LeaveItem[]
  onChanged: () => void
}) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }
  if (leaves.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        Kayıt yok.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {leaves.map((l) => (
        <LeaveApprovalRow key={l.id} leave={l} isAdmin onChanged={onChanged} />
      ))}
    </div>
  )
}
