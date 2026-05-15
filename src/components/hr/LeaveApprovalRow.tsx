"use client"

import { useEffect, useState } from "react"
import type { LeaveStatus, LeaveType, StaffDepartment } from "@prisma/client"
import { AlertTriangle, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  departmentLabel,
  formatDateRange,
  getAuthHeaders,
  leaveStatusBadgeClass,
  leaveStatusLabel,
  leaveTypeLabel,
} from "./hr-utils"

export interface LeaveItem {
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

interface ConflictDay {
  date: string
  dayOfWeek: number
  schedules: Array<{
    id: string
    subjectName: string
    startTime: string
    endTime: string
    room: string | null
    className: string
  }>
}

interface LeaveApprovalRowProps {
  leave: LeaveItem
  isAdmin: boolean
  onChanged?: () => void
  showStaffName?: boolean
}

export function LeaveApprovalRow({
  leave,
  isAdmin,
  onChanged,
  showStaffName = true,
}: LeaveApprovalRowProps) {
  const [conflictCount, setConflictCount] = useState<number | null>(null)
  const [showDecide, setShowDecide] = useState<null | "APPROVE" | "REJECT">(null)
  const [decisionNote, setDecisionNote] = useState("")
  const [conflicts, setConflicts] = useState<ConflictDay[]>([])
  const [loadingConflicts, setLoadingConflicts] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadConflicts() {
      setLoadingConflicts(true)
      try {
        const res = await fetch(`/api/hr/leaves/${leave.id}/conflicts`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        })
        if (!res.ok) return
        const data = (await res.json()) as { conflicts: ConflictDay[] }
        if (cancelled) return
        setConflicts(data.conflicts)
        const count = data.conflicts.reduce((acc, c) => acc + c.schedules.length, 0)
        setConflictCount(count)
      } finally {
        if (!cancelled) setLoadingConflicts(false)
      }
    }
    void loadConflicts()
    return () => {
      cancelled = true
    }
  }, [leave.id])

  async function handleDecide() {
    if (!showDecide) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/hr/leaves/${leave.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          decision: showDecide,
          decisionNote: decisionNote.trim() || null,
        }),
      })
      if (res.ok) {
        setShowDecide(null)
        setDecisionNote("")
        onChanged?.()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {showStaffName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-gray-900">
                  {leave.staff.firstName} {leave.staff.lastName}
                </span>
                <span className="text-xs text-gray-500">
                  {departmentLabel(leave.staff.department)}
                  {leave.staff.subject ? ` · ${leave.staff.subject}` : ""}
                </span>
              </div>
            )}
            <div className="text-sm text-gray-700">
              <span className="font-medium">{leaveTypeLabel(leave.type)}</span>
              <span className="mx-2 text-gray-300">·</span>
              <span>{formatDateRange(leave.startDate, leave.endDate)}</span>
            </div>
            {leave.reason && <p className="text-sm text-gray-600">{leave.reason}</p>}
            {leave.decisionNote && (
              <p className="text-xs italic text-gray-500">Karar notu: {leave.decisionNote}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${leaveStatusBadgeClass(leave.status)}`}>
              {leaveStatusLabel(leave.status)}
            </span>
            {loadingConflicts ? (
              <span className="text-xs text-gray-500">Çakışma kontrol ediliyor…</span>
            ) : conflictCount !== null && conflictCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle className="h-3 w-3" />
                {conflictCount} ders etkilenecek
              </span>
            ) : conflictCount === 0 ? (
              <span className="text-xs text-emerald-700">Çakışma yok</span>
            ) : null}
          </div>
        </div>

        {isAdmin && leave.status === "PENDING" && (
          <div className="mt-3 flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowDecide("REJECT")}>
              <X className="mr-1 h-4 w-4" /> Reddet
            </Button>
            <Button size="sm" onClick={() => setShowDecide("APPROVE")}>
              <Check className="mr-1 h-4 w-4" /> Onayla
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showDecide !== null} onOpenChange={(o) => !o && setShowDecide(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showDecide === "APPROVE" ? "İzni Onayla" : "İzni Reddet"}
            </DialogTitle>
            <DialogDescription>
              {leave.staff.firstName} {leave.staff.lastName} ·{" "}
              {formatDateRange(leave.startDate, leave.endDate)}
            </DialogDescription>
          </DialogHeader>

          {conflictCount !== null && conflictCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Bu izin onaylanırsa {conflictCount} ders etkilenecek
              </div>
              <ul className="space-y-1.5 text-xs text-amber-900">
                {conflicts.map((c) => (
                  <li key={c.date}>
                    <span className="font-medium">{formatDateRange(c.date, c.date)}:</span>{" "}
                    {c.schedules.map((s, i) => (
                      <span key={s.id}>
                        {i > 0 ? ", " : ""}
                        {s.subjectName} ({s.className} · {s.startTime})
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label htmlFor="decision-note">
              {showDecide === "APPROVE" ? "Onay Notu (opsiyonel)" : "Red Sebebi (opsiyonel)"}
            </label>
            <textarea
              id="decision-note"
              rows={3}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecide(null)} disabled={submitting}>
              Vazgeç
            </Button>
            <Button
              variant={showDecide === "REJECT" ? "destructive" : "default"}
              onClick={handleDecide}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : showDecide === "APPROVE" ? (
                "Onayla"
              ) : (
                "Reddet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
