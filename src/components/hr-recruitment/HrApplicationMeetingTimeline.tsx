"use client"

import { useCallback, useEffect, useState } from "react"
import type { HrApplicationMeetingOutcome } from "@prisma/client"
import { Loader2, MessageSquare, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/components/hr/hr-utils"
import { staffAuthHeaders } from "@/lib/permissions/client"
import {
  APPLICATION_MEETING_OUTCOME_LABELS,
  APPLICATION_MEETING_OUTCOMES,
} from "@/lib/hr-recruitment/meetings"
import {
  fetchApplicationMeetings,
  updateApplicationMeeting,
} from "@/lib/hr-recruitment/meetings-client"
import { HrApplicationMeetingForm } from "./HrApplicationMeetingForm"
import { HrApplicationMeetingOutcomeBadge } from "./HrApplicationMeetingOutcomeBadge"

export interface ApplicationMeetingItem {
  id: string
  meetingAt: string
  outcome: HrApplicationMeetingOutcome
  notes: string | null
  conductedBy: { id: string; firstName: string; lastName: string } | null
}

interface HrApplicationMeetingTimelineProps {
  applicationId: string
  applicantName?: string
  canEdit: boolean
  onChanged?: () => void
}

export function HrApplicationMeetingTimeline({
  applicationId,
  applicantName,
  canEdit,
  onChanged,
}: HrApplicationMeetingTimelineProps) {
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<ApplicationMeetingItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMeetingAt, setEditMeetingAt] = useState("")
  const [editOutcome, setEditOutcome] = useState<HrApplicationMeetingOutcome>("KARARSIZ")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchApplicationMeetings(applicationId)
      setMeetings(data.meetings)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Yüklenemedi")
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    void load()
  }, [load])

  const handleChanged = () => {
    void load()
    onChanged?.()
  }

  const startEdit = (m: ApplicationMeetingItem) => {
    const d = new Date(m.meetingAt)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setEditingId(m.id)
    setEditMeetingAt(d.toISOString().slice(0, 16))
    setEditOutcome(m.outcome)
    setEditNotes(m.notes ?? "")
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      await updateApplicationMeeting(editingId, {
        meetingAt: new Date(editMeetingAt).toISOString(),
        outcome: editOutcome,
        notes: editNotes.trim() || null,
      })
      setEditingId(null)
      handleChanged()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hata")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu görüşme kaydını silmek istediğinize emin misiniz?")) return
    const res = await fetch(`/api/ik-basvurular/meetings/${id}`, {
      method: "DELETE",
      headers: staffAuthHeaders(),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || "Silinemedi")
      return
    }
    handleChanged()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (loadError) {
    return <p className="text-sm text-rose-600 py-4">{loadError}</p>
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <>
          {showForm ? (
            <HrApplicationMeetingForm
              applicationId={applicationId}
              applicantName={applicantName}
              compact
              onSuccess={() => {
                setShowForm(false)
                handleChanged()
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
          Bu başvuru için henüz görüşme kaydı yok.
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
                        onChange={(e) =>
                          setEditOutcome(e.target.value as HrApplicationMeetingOutcome)
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        {APPLICATION_MEETING_OUTCOMES.map((o) => (
                          <option key={o} value={o}>
                            {APPLICATION_MEETING_OUTCOME_LABELS[o]}
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
                    <Button size="sm" onClick={() => void saveEdit()} disabled={saving}>
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
                      <HrApplicationMeetingOutcomeBadge outcome={m.outcome} />
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
                            onClick={() => void handleDelete(m.id)}
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
    </div>
  )
}
