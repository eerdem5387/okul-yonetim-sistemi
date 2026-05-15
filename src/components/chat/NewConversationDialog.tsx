"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, Megaphone, Users, MessageSquare } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  departmentLabel,
  getAuthHeaders,
} from "./chat-utils"
import type {
  ChatActorKind,
  ContactsResponse,
} from "./types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  actorKind: ChatActorKind
  canCreateGroup: boolean
  canCreateAnnouncement: boolean
  onCreated: (conversationId: string) => void
}

type DialogTab = "PRIVATE" | "GROUP" | "ANNOUNCEMENT"

export function NewConversationDialog({
  open,
  onOpenChange,
  actorKind,
  canCreateGroup,
  canCreateAnnouncement,
  onCreated,
}: Props) {
  const [tab, setTab] = useState<DialogTab>("PRIVATE")
  const [search, setSearch] = useState("")
  const [data, setData] = useState<ContactsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [selected, setSelected] = useState<Record<string, { staffId?: string; parentId?: string }>>({})

  useEffect(() => {
    if (!open) {
      setSearch("")
      setSelected({})
      setTitle("")
      setTab("PRIVATE")
      return
    }
    let cancelled = false
    setLoading(true)
    fetch("/api/chat/contacts", { headers: getAuthHeaders(), cache: "no-store" })
      .then(async (r) => (await r.json()) as ContactsResponse)
      .then((j) => {
        if (!cancelled) setData(j)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const filteredStaff = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.staff.filter((s) => {
      if (!q) return true
      return (
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.subject && s.subject.toLowerCase().includes(q)) ||
        departmentLabel(s.department).toLowerCase().includes(q)
      )
    })
  }, [data, search])

  const filteredParents = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.parents.filter((p) => {
      if (!q) return true
      return (
        p.displayName.toLowerCase().includes(q) ||
        p.studentNames.some((n) => n.toLowerCase().includes(q)) ||
        p.studentClasses.some((c) => c.toLowerCase().includes(q))
      )
    })
  }, [data, search])

  const toggleSelect = (key: string, target: { staffId?: string; parentId?: string }) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = target
      return next
    })
  }

  const selectedCount = Object.keys(selected).length

  const startPrivate = async (target: { staffId?: string; parentId?: string }) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: "PRIVATE", target }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || "Sohbet açılamadı")
        return
      }
      onCreated(j.id)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const createGroup = async (kind: "GROUP" | "ANNOUNCEMENT") => {
    if (!title.trim()) {
      alert("Başlık zorunlu")
      return
    }
    if (selectedCount === 0) {
      alert("En az bir katılımcı seçin")
      return
    }
    setSubmitting(true)
    try {
      const participants = Object.values(selected)
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: kind, title, participants }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || "Sohbet oluşturulamadı")
        return
      }
      onCreated(j.id)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Yeni Sohbet</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 border-b">
          <TabBtn active={tab === "PRIVATE"} onClick={() => setTab("PRIVATE")} icon={<MessageSquare className="h-4 w-4" />}>
            Özel Sohbet
          </TabBtn>
          {canCreateGroup && (
            <TabBtn active={tab === "GROUP"} onClick={() => setTab("GROUP")} icon={<Users className="h-4 w-4" />}>
              Grup
            </TabBtn>
          )}
          {canCreateAnnouncement && (
            <TabBtn active={tab === "ANNOUNCEMENT"} onClick={() => setTab("ANNOUNCEMENT")} icon={<Megaphone className="h-4 w-4" />}>
              Duyuru
            </TabBtn>
          )}
        </div>

        {(tab === "GROUP" || tab === "ANNOUNCEMENT") && (
          <div className="pt-3">
            <Input
              placeholder={tab === "GROUP" ? "Grup adı" : "Duyuru kanalı adı"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        )}

        <div className="relative pt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 mt-1.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, sınıf, branş veya departman ara…"
            className="pl-9"
          />
        </div>

        <div className="mt-3 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStaff.length > 0 && (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Personel
                  </h3>
                  <ul className="divide-y divide-gray-100">
                    {filteredStaff.map((s) => {
                      const key = `s:${s.id}`
                      const isSelected = !!selected[key]
                      return (
                        <li key={s.id} className="flex items-center justify-between py-2">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {s.firstName} {s.lastName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {departmentLabel(s.department)}
                              {s.subject ? ` · ${s.subject}` : ""}
                            </div>
                          </div>
                          {tab === "PRIVATE" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={submitting}
                              onClick={() => startPrivate({ staffId: s.id })}
                            >
                              Sohbet Başlat
                            </Button>
                          ) : (
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={isSelected}
                              onChange={() => toggleSelect(key, { staffId: s.id })}
                              aria-label={`${s.firstName} ${s.lastName} seç`}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {filteredParents.length > 0 && actorKind === "staff" && (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Veliler
                  </h3>
                  <ul className="divide-y divide-gray-100">
                    {filteredParents.map((p) => {
                      const key = `p:${p.id}`
                      const isSelected = !!selected[key]
                      return (
                        <li key={p.id} className="flex items-center justify-between py-2">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {p.displayName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {p.studentNames.join(", ")}
                              {p.studentClasses.length > 0 ? ` · ${p.studentClasses.join(", ")}` : ""}
                            </div>
                          </div>
                          {tab === "PRIVATE" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={submitting}
                              onClick={() => startPrivate({ parentId: p.id })}
                            >
                              Sohbet Başlat
                            </Button>
                          ) : (
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={isSelected}
                              onChange={() => toggleSelect(key, { parentId: p.id })}
                              aria-label={`${p.displayName} seç`}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {filteredStaff.length === 0 && filteredParents.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  Eşleşen kişi bulunamadı.
                </div>
              )}
            </div>
          )}
        </div>

        {(tab === "GROUP" || tab === "ANNOUNCEMENT") && (
          <div className="border-t pt-3 flex items-center justify-between gap-2">
            <span className="text-sm text-gray-600">{selectedCount} kişi seçildi</span>
            <Button
              onClick={() => createGroup(tab)}
              disabled={submitting || !title.trim() || selectedCount === 0}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tab === "GROUP" ? "Grubu Oluştur" : "Duyuru Kanalını Oluştur"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
        active ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
