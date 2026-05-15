"use client"

import { useState } from "react"
import type { LeaveType } from "@prisma/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LEAVE_TYPE_LABELS } from "@/lib/hr/constants"
import { getAuthHeaders } from "./hr-utils"

interface LeaveRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffId?: string // admin başkası için talep oluştururken set edilir
  onCreated?: () => void
}

const TYPES: LeaveType[] = ["ANNUAL", "SICK_REPORT", "EXCUSE", "UNPAID", "HOURLY"]

export function LeaveRequestDialog({ open, onOpenChange, staffId, onCreated }: LeaveRequestDialogProps) {
  const [type, setType] = useState<LeaveType>("ANNUAL")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setType("ANNUAL")
    setStartDate("")
    setEndDate("")
    setReason("")
    setError(null)
  }

  async function handleSubmit() {
    setError(null)
    if (!startDate || !endDate) {
      setError("Başlangıç ve bitiş tarihi zorunlu")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type,
          startDate,
          endDate,
          reason: reason.trim() || null,
          staffId,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "İzin oluşturulamadı")
      }
      reset()
      onOpenChange(false)
      onCreated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni İzin Talebi</DialogTitle>
          <DialogDescription>
            Talebiniz yöneticiniz onayladıktan sonra geçerli olacaktır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="leave-type">İzin Tipi</label>
            <select
              id="leave-type"
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAVE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="leave-start">Başlangıç</label>
              <input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="leave-end">Bitiş</label>
              <input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="leave-reason">Açıklama (opsiyonel)</label>
            <textarea
              id="leave-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kısa açıklama"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Vazgeç
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Gönderiliyor…" : "Talep Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
