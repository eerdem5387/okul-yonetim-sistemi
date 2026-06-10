"use client"

import { useState } from "react"
import type { StaffRetentionOutcome } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RETENTION_OUTCOME_LABELS, RETENTION_OUTCOMES } from "@/lib/hr/retention"
import { removeStaffFromList, saveRetentionMeeting } from "@/lib/hr/retention-client"
import { RetentionWillNotContinueDialog } from "./RetentionWillNotContinueDialog"

interface RetentionMeetingFormProps {
  staffId: string
  staffName?: string
  onSuccess: () => void
  onStaffRemoved?: () => void
  onCancel?: () => void
  compact?: boolean
}

export function RetentionMeetingForm({
  staffId,
  staffName,
  onSuccess,
  onStaffRemoved,
  onCancel,
  compact = false,
}: RetentionMeetingFormProps) {
  const [meetingAt, setMeetingAt] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [outcome, setOutcome] = useState<StaffRetentionOutcome>("UNCERTAIN")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const persistMeeting = async (removeFromList: boolean) => {
    setSubmitting(true)
    setError(null)
    try {
      await saveRetentionMeeting({
        staffId,
        meetingAt: new Date(meetingAt).toISOString(),
        outcome,
        notes: notes.trim() || null,
      })

      if (removeFromList) {
        await removeStaffFromList(staffId)
        setConfirmOpen(false)
        setNotes("")
        onStaffRemoved?.()
        return
      }

      setConfirmOpen(false)
      setNotes("")
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (outcome === "WILL_NOT_CONTINUE") {
      setConfirmOpen(true)
      return
    }
    await persistMeeting(false)
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={`rounded-xl border border-indigo-100 bg-indigo-50/40 ${compact ? "p-4 space-y-3" : "p-5 space-y-4"}`}
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Yeni Görüşme Kaydı</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Yüz yüze görüşme sonrası sonuç ve notları kaydedin.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="meetingAt">Görüşme Tarihi ve Saati</Label>
            <input
              id="meetingAt"
              type="datetime-local"
              required
              value={meetingAt}
              onChange={(e) => setMeetingAt(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="outcome">Görüşme Sonucu</Label>
            <select
              id="outcome"
              required
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as StaffRetentionOutcome)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {RETENTION_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {RETENTION_OUTCOME_LABELS[o]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Görüşme Notları</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Görüşme özeti, beklentiler, koşullar..."
            rows={compact ? 3 : 4}
            className="mt-1.5"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting} size="sm">
            {submitting ? "Kaydediliyor..." : "Görüşmeyi Kaydet"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
              İptal
            </Button>
          )}
        </div>
      </form>

      <RetentionWillNotContinueDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!submitting) setConfirmOpen(open)
        }}
        staffName={staffName}
        loading={submitting}
        onKeepOnly={() => void persistMeeting(false)}
        onRemoveFromList={() => void persistMeeting(true)}
      />
    </>
  )
}
