"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { departmentLabel, getAuthHeaders } from "./chat-utils"
import type { ContactsResponse } from "./types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent: () => void
}

export function MassMessageDialog({ open, onOpenChange, onSent }: Props) {
  const [data, setData] = useState<ContactsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Record<string, { staffId?: string; parentId?: string }>>({})
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelected({})
      setBody("")
      setSearch("")
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
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open])

  const filteredStaff = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.staff.filter(
      (s) =>
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        departmentLabel(s.department).toLowerCase().includes(q) ||
        (s.subject && s.subject.toLowerCase().includes(q))
    )
  }, [data, search])
  const filteredParents = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.parents.filter(
      (p) =>
        !q ||
        p.displayName.toLowerCase().includes(q) ||
        p.studentNames.some((n) => n.toLowerCase().includes(q)) ||
        p.studentClasses.some((c) => c.toLowerCase().includes(q))
    )
  }, [data, search])

  const toggle = (key: string, target: { staffId?: string; parentId?: string }) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = target
      return next
    })
  }

  const selectAllStaff = (checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev }
      for (const s of filteredStaff) {
        const k = `s:${s.id}`
        if (checked) next[k] = { staffId: s.id }
        else delete next[k]
      }
      return next
    })
  }
  const selectAllParents = (checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev }
      for (const p of filteredParents) {
        const k = `p:${p.id}`
        if (checked) next[k] = { parentId: p.id }
        else delete next[k]
      }
      return next
    })
  }

  const count = Object.keys(selected).length

  const handleSend = async () => {
    if (sending) return
    const text = body.trim()
    if (!text) {
      alert("Mesaj gövdesi zorunludur")
      return
    }
    if (count === 0) {
      alert("En az bir alıcı seçin")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/chat/mass-message", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          body: text,
          recipients: Object.values(selected),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || "Gönderilemedi")
        return
      }
      alert(`${j.sent} alıcıya gönderildi${j.skipped?.length ? ` (atlanan: ${j.skipped.length})` : ""}`)
      onSent()
      onOpenChange(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Toplu Mesaj (BCC)</DialogTitle>
          <p className="text-xs text-gray-500">
            Seçtiğiniz her alıcıya ayrı bir özel sohbette aynı mesaj iletilir.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mesajınız…"
            rows={3}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad, sınıf, branş ara…"
              className="pl-9"
            />
          </div>
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
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Personel ({filteredStaff.length})
                    </h3>
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        onChange={(e) => selectAllStaff(e.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                      Tümünü seç
                    </label>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {filteredStaff.map((s) => {
                      const k = `s:${s.id}`
                      return (
                        <li key={s.id} className="flex items-center justify-between py-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate text-gray-900">
                              {s.firstName} {s.lastName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {departmentLabel(s.department)}
                              {s.subject ? ` · ${s.subject}` : ""}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={!!selected[k]}
                            onChange={() => toggle(k, { staffId: s.id })}
                          />
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {filteredParents.length > 0 && (
                <section>
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Veliler ({filteredParents.length})
                    </h3>
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        onChange={(e) => selectAllParents(e.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                      Tümünü seç
                    </label>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {filteredParents.map((p) => {
                      const k = `p:${p.id}`
                      return (
                        <li key={p.id} className="flex items-center justify-between py-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate text-gray-900">{p.displayName}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {p.studentNames.join(", ")}
                              {p.studentClasses.length > 0 ? ` · ${p.studentClasses.join(", ")}` : ""}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={!!selected[k]}
                            onChange={() => toggle(k, { parentId: p.id })}
                          />
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

        <div className="border-t pt-3 flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600">{count} alıcı seçildi</span>
          <Button onClick={handleSend} disabled={sending || count === 0 || !body.trim()}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Gönder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
