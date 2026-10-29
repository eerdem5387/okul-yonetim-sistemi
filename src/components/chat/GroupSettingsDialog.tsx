"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Trash2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAuthHeaders } from "./chat-utils"
import type { ChatConversation, ChatParticipant } from "./types"

type PostingMode = "all" | "admin" | "selected"

function participantKey(p: ChatParticipant) {
  if (p.staff) return `s:${p.staff.id}`
  if (p.parent) return `p:${p.parent.id}`
  return p.id || ""
}

function participantName(p: ChatParticipant) {
  if (p.staff) return `${p.staff.firstName} ${p.staff.lastName}`.trim()
  if (p.parent) return p.parent.displayName
  return "Üye"
}

function detectMode(conv: ChatConversation): PostingMode {
  if (conv.membersCanPost !== false) return "all"
  const members = conv.participants.filter((p) => p.role !== "ADMIN")
  if (members.some((p) => p.canPost)) return "selected"
  return "admin"
}

export function GroupSettingsDialog({
  open,
  onOpenChange,
  conversation,
  actorId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: ChatConversation
  actorId: string
  onSaved: () => void
}) {
  const [title, setTitle] = useState(conversation.title || "")
  const [mode, setMode] = useState<PostingMode>("all")
  const [allowed, setAllowed] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [removingKey, setRemovingKey] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(conversation.title || "")
    setMode(detectMode(conversation))
    const next: Record<string, boolean> = {}
    for (const p of conversation.participants) {
      if (p.role === "ADMIN") continue
      next[participantKey(p)] = Boolean(p.canPost)
    }
    setAllowed(next)
  }, [open, conversation])

  const members = useMemo(
    () => conversation.participants.filter((p) => p.role !== "ADMIN" || p.staff?.id !== actorId),
    [conversation.participants, actorId]
  )

  const toggleAllowed = (key: string) => {
    setAllowed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const allowedPosters =
        mode === "selected"
          ? conversation.participants
              .filter((p) => p.role !== "ADMIN" && allowed[participantKey(p)])
              .map((p) => (p.staff ? { staffId: p.staff.id } : { parentId: p.parent!.id }))
          : undefined

      const res = await fetch(`/api/chat/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          postingMode: mode,
          allowedPosters,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json?.error || "Ayarlar kaydedilemedi")
        return
      }
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async (p: ChatParticipant) => {
    const name = participantName(p)
    if (!window.confirm(`${name} gruptan çıkarılsın mı?`)) return
    const key = participantKey(p)
    setRemovingKey(key)
    try {
      const qs = p.staff
        ? `staffId=${encodeURIComponent(p.staff.id)}`
        : `parentId=${encodeURIComponent(p.parent!.id)}`
      const res = await fetch(`/api/chat/conversations/${conversation.id}/participants?${qs}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json?.error || "Üye çıkarılamadı")
        return
      }
      onSaved()
    } finally {
      setRemovingKey(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base">Grup ayarları</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Grup adı
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Grup adı"
              disabled={Boolean(conversation.systemKey)}
            />
            {conversation.systemKey ? (
              <p className="text-[11px] text-gray-400">Kalıcı kanal adı otomatik güncellenir.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Kimler yazabilir?
            </p>
            {(
              [
                { key: "all", label: "Tüm üyeler", hint: "Herkes mesaj gönderebilir" },
                { key: "admin", label: "Yalnızca yöneticiler", hint: "Üyeler sadece okur" },
                {
                  key: "selected",
                  label: "Seçtiğim üyeler",
                  hint: "Aşağıdan işaretledikleriniz + yöneticiler yazar",
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                  mode === opt.key ? "border-blue-500 bg-blue-50/60" : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="postingMode"
                  className="mt-1"
                  checked={mode === opt.key}
                  onChange={() => setMode(opt.key)}
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
                  <span className="block text-xs text-gray-500">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Üyeler ({conversation.participants.length})
            </p>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {conversation.participants.map((p) => {
                const key = participantKey(p)
                const isAdmin = p.role === "ADMIN"
                const isSelf = p.staff?.id === actorId
                return (
                  <li key={key} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {participantName(p)}
                        {isSelf ? " (siz)" : ""}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {isAdmin ? "Yönetici" : "Üye"}
                        {mode === "selected" && !isAdmin && allowed[key] ? " · yazabilir" : ""}
                      </p>
                    </div>
                    {mode === "selected" && !isAdmin ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={Boolean(allowed[key])}
                        onChange={() => toggleAllowed(key)}
                        aria-label={`${participantName(p)} yazabilsin`}
                      />
                    ) : null}
                    {!isSelf && !conversation.systemKey ? (
                      <button
                        type="button"
                        title="Üyeyi çıkar"
                        disabled={removingKey === key}
                        onClick={() => void removeMember(p)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {removingKey === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : null}
                  </li>
                )
              })}
              {members.length === 0 && conversation.participants.length === 0 ? (
                <li className="px-3 py-3 text-sm text-gray-500">Üye yok.</li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" />
            Kapat
          </Button>
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
