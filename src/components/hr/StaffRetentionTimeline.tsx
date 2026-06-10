"use client"

import { useState } from "react"
import type { StaffRetentionOutcome } from "@prisma/client"
import { Pencil, Trash2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RETENTION_OUTCOME_LABELS, RETENTION_OUTCOMES } from "@/lib/hr/retention"
import { RetentionOutcomeBadge } from "./RetentionOutcomeBadge"
import { removeStaffFromList, updateRetentionMeeting } from "@/lib/hr/retention-client"
import { RetentionMeetingForm } from "./RetentionMeetingForm"
import { RetentionWillNotContinueDialog } from "./RetentionWillNotContinueDialog"
import { formatDateTime, getAuthHeaders } from "./hr-utils"

export interface RetentionMeetingItem {
  id: string
  meetingAt: string
  outcome: StaffRetentionOutcome
  notes: string | null
  conductedBy: { id: string; firstName: string; lastName: string } | null
}

interface StaffRetentionTimelineProps {
  staffId: string
  staffName?: string
  targetYearLabel: string | null
  meetings: RetentionMeetingItem[]
  canEdit: boolean
  onChanged: () => void
  onStaffRemoved?: () => void
}

export function StaffRetentionTimeline({
  staffId,
  staffName,
  targetYearLabel,
  meetings,
  canEdit,
  onChanged,
  onStaffRemoved,
}: StaffRetentionTimelineProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMeetingAt, setEditMeetingAt] = useState("")
  const [editOutcome, setEditOutcome] = useState<StaffRetentionOutcome>("UNCERTAIN")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmEditOpen, setConfirmEditOpen] = useState(false)

  const startEdit = (m: RetentionMeetingItem) => {
    const d = new Date(m.meetingAt)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setEditingId(m.id)
    setEditMeetingAt(d.toISOString().slice(0, 16))
    setEditOutcome(m.outcome)
    setEditNotes(m.notes ?? "")
  }

  const persistEdit = async (removeFromList: boolean) => {
    if (!editingId) return
    setSaving(true)
    try {
      await updateRetentionMeeting(editingId, {
        meetingAt: new Date(editMeetingAt).toISOString(),
        outcome: editOutcome,
        notes: editNotes.trim() || null,
      })

      if (removeFromList) {
        await removeStaffFromList(staffId)
        setConfirmEditOpen(false)
        setEditingId(null)
        onStaffRemoved?.()
        return
      }

      setConfirmEditOpen(false)
      setEditingId(null)
      onChanged()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hata")
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = () => {
    if (!editingId) return
    if (editOutcome === "WILL_NOT_CONTINUE") {
      setConfirmEditOpen(true)
      return
    }
    void persistEdit(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu görüşme kaydını silmek istediğinize emin misiniz?")) return
    const res = await fetch(`/api/hr/retention/meetings/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || "Silinemedi")
      return
    }
    onChanged()
  }

  return (
    <div className="space-y-4">
      {targetYearLabel && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
          <span className="font-medium">Hedef akademik yıl:</span> {targetYearLabel}
        </div>
      )}

      {canEdit && (
        <>
          {showForm ? (
            <RetentionMeetingForm
              staffId={staffId}
              staffName={staffName}
              compact
              onSuccess={() => {
                setShowForm(false)
                onChanged()
              }}
              onStaffRemoved={() => {
                setShowForm(false)
                onStaffRemoved?.()
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Yeni Görüşme Ekle
            </Button>
          )}
        </>
      )}

      {meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Bu personel için henüz görüşme kaydı yok.
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              {editingId === m.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Tarih</Label>
                      <input
                        type="datetime-local"
                        value={editMeetingAt}
                        onChange={(e) => setEditMeetingAt(e.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <Label>Sonuç</Label>
                      <select
                        value={editOutcome}
                        onChange={(e) => setEditOutcome(e.target.value as StaffRetentionOutcome)}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
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
                    <Label>Notlar</Label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={saving}>
                      Kaydet
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDateTime(m.meetingAt)}
                      </p>
                      {m.conductedBy && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Görüşmeyi yapan: {m.conductedBy.firstName} {m.conductedBy.lastName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <RetentionOutcomeBadge outcome={m.outcome} />
                      {canEdit && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEdit(m)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-600"
                            onClick={() => handleDelete(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {m.notes && (
                    <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-3">
                      {m.notes}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <RetentionWillNotContinueDialog
        open={confirmEditOpen}
        onOpenChange={(open) => {
          if (!saving) setConfirmEditOpen(open)
        }}
        staffName={staffName}
        loading={saving}
        onKeepOnly={() => void persistEdit(false)}
        onRemoveFromList={() => void persistEdit(true)}
      />
    </div>
  )
}
