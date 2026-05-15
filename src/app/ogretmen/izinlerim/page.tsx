"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"
import type { LeaveStatus, LeaveType, StaffDepartment } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { LeaveMonthCalendar } from "@/components/hr/LeaveMonthCalendar"
import { LeaveRequestDialog } from "@/components/hr/LeaveRequestDialog"
import {
  formatDateRange,
  getAuthHeaders,
  leaveStatusBadgeClass,
  leaveStatusLabel,
  leaveTypeLabel,
} from "@/components/hr/hr-utils"

interface LeaveRow {
  id: string
  type: LeaveType
  status: LeaveStatus
  startDate: string
  endDate: string
  reason: string | null
  decisionNote: string | null
  approvedAt: string | null
  rejectedAt: string | null
  staff: {
    id: string
    firstName: string
    lastName: string
    department: StaffDepartment
    subject: string | null
  }
}

export default function TeacherLeavesPage() {
  const router = useRouter()
  const [leaves, setLeaves] = useState<LeaveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    if (role !== "teacher") {
      router.replace("/login")
      return
    }
    setAuthChecked(true)
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/hr/leaves", { headers: getAuthHeaders(), cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setLeaves(data.leaves || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authChecked) return
    void load()
  }, [authChecked, load])

  async function handleCancel(id: string) {
    if (!confirm("Bu izin talebini iptal etmek istiyor musunuz?")) return
    const res = await fetch(`/api/hr/leaves/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    if (res.ok) void load()
  }

  const calendarItems = useMemo(
    () =>
      leaves.map((l) => ({
        id: l.id,
        type: l.type,
        status: l.status,
        startDate: l.startDate,
        endDate: l.endDate,
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
    <div className="px-4 py-6 sm:px-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İzinlerim</h1>
          <p className="text-sm text-gray-600">İzin taleplerinizi oluşturup takip edebilirsiniz.</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-1 h-4 w-4" /> Yeni Talep
        </Button>
      </div>

      <LeaveMonthCalendar items={calendarItems} height={420} />

      <div className="space-y-2">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            Henüz izin talebiniz yok.
          </div>
        ) : (
          leaves.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900">
                    {leaveTypeLabel(l.type)}
                    <span className="mx-2 text-gray-300">·</span>
                    <span className="text-gray-700">{formatDateRange(l.startDate, l.endDate)}</span>
                  </div>
                  {l.reason && <p className="text-sm text-gray-600">{l.reason}</p>}
                  {l.decisionNote && (
                    <p className="text-xs italic text-gray-500">Karar notu: {l.decisionNote}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${leaveStatusBadgeClass(l.status)}`}
                  >
                    {leaveStatusLabel(l.status)}
                  </span>
                  {l.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(l.id)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="h-3 w-3" /> İptal Et
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <LeaveRequestDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onCreated={load}
      />
    </div>
  )
}
