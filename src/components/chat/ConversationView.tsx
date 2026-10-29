"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Megaphone, Settings, Trash2, Users } from "lucide-react"
import { MessageBubble } from "./MessageBubble"
import { MessageComposer } from "./MessageComposer"
import { useChatRealtime } from "./useChatRealtime"
import {
  canDeleteConversationUi,
  conversationDisplayTitle,
  conversationSubtitle,
  getAuthHeaders,
} from "./chat-utils"
import { Avatar } from "./Avatar"
import { GroupSettingsDialog } from "./GroupSettingsDialog"
import type {
  ChatActorKind,
  ChatConversation,
  ChatMessage,
} from "./types"

interface Props {
  conversation: ChatConversation | null
  actor: { kind: ChatActorKind; id: string }
  onConversationsChanged?: () => void
  onDeleted?: (id: string) => void
}

type ConversationDetail = ChatConversation

export function ConversationView({ conversation, actor, onConversationsChanged, onDeleted }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [readFor, setReadFor] = useState<string | null>(null)
  const [readReport, setReadReport] = useState<{ read: { name: string; readAt: string }[]; unread: { name: string }[] } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // İlk yükleme
  useEffect(() => {
    if (!conversation) {
      setMessages([])
      setDetail(null)
      setNextCursor(null)
      setSettingsOpen(false)
      setReadFor(null)
      return
    }
    setSettingsOpen(false)
    setReadFor(null)
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [detailRes, messagesRes] = await Promise.all([
          fetch(`/api/chat/conversations/${conversation.id}`, {
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
          fetch(`/api/chat/conversations/${conversation.id}/messages?limit=30`, {
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
        ])
        const dJson = await detailRes.json().catch(() => ({}))
        const mJson = await messagesRes.json().catch(() => ({}))
        if (cancelled) return
        if (detailRes.ok && dJson.conversation) {
          setDetail(dJson.conversation as ConversationDetail)
        }
        if (messagesRes.ok && Array.isArray(mJson.messages)) {
          setMessages(mJson.messages)
          setNextCursor(mJson.nextCursor ?? null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id])

  // Yeni mesajda en alta kaydır
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length, conversation?.id])

  const markRead = useCallback(async () => {
    if (!conversation) return
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    try {
      await fetch(`/api/chat/conversations/${conversation.id}/read`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ uptoMessageId: last.id }),
      })
      onConversationsChanged?.()
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, messages, onConversationsChanged])

  // Sohbet açıldığında okundu işaretle
  useEffect(() => {
    if (!conversation) return
    void markRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, messages.length, markRead])

  useChatRealtime({
    conversationId: conversation?.id ?? null,
    actorKind: actor.kind,
    actorId: actor.id,
    onNewMessage: (msg) => {
      if (!conversation || msg.conversationId !== conversation.id) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      onConversationsChanged?.()
    },
  })

  const loadOlder = async () => {
    if (!conversation || !nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversation.id}/messages?cursor=${encodeURIComponent(
          nextCursor
        )}&limit=30`,
        { headers: getAuthHeaders(), cache: "no-store" }
      )
      const json = await res.json()
      if (res.ok && Array.isArray(json.messages)) {
        // Cursor pagination: backend en yeniden eskiye gider, ama "messages" listesini
        // kronolojik (eski → yeni) sırada döndürüyor (repository.reverse).
        // Bu yüzden yeni gelen "older" listesini başa ekliyoruz.
        setMessages((prev) => [...json.messages, ...prev])
        setNextCursor(json.nextCursor ?? null)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const sendMessage = async (input: {
    body: string
    type: "TEXT" | "IMAGE" | "DOCUMENT"
    attachmentUrl?: string | null
  }) => {
    if (!conversation) return
    const res = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data?.error || "Mesaj gönderilemedi")
      return
    }
    onConversationsChanged?.()
  }

  const uploadFile = async (
    file: File
  ): Promise<{ url: string; type: "IMAGE" | "DOCUMENT" } | null> => {
    const fd = new FormData()
    fd.append("file", file)
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    const headers: HeadersInit = {}
    if (token) headers["Authorization"] = `Bearer ${token}`
    const res = await fetch(`/api/chat/upload`, {
      method: "POST",
      headers,
      body: fd,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(json?.error || "Dosya yüklenemedi")
      return null
    }
    return { url: json.url, type: json.type }
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Görüntülemek için bir sohbet seçin.
      </div>
    )
  }

  const title = conversationDisplayTitle(conversation, actor)
  const subtitle = conversationSubtitle(detail || conversation)
  const variant: "user" | "group" | "announcement" =
    conversation.type === "ANNOUNCEMENT"
      ? "announcement"
      : conversation.type === "GROUP"
        ? "group"
        : "user"

  const view = detail || conversation
  const myRole = view.myRole
  const membersCanPost = view.membersCanPost !== false
  const myParticipant = view.participants.find((p) =>
    actor.kind === "staff" ? p.staff?.id === actor.id : p.parent?.id === actor.id
  )
  const canManageSettings =
    actor.kind === "staff" &&
    (conversation.type === "GROUP" || conversation.type === "ANNOUNCEMENT") &&
    myRole === "ADMIN"
  const canDelete = canDeleteConversationUi(view, actor)
  const composerDisabled =
    (conversation.type === "ANNOUNCEMENT" && myRole !== "ADMIN") ||
    (conversation.type === "GROUP" &&
      !membersCanPost &&
      myRole !== "ADMIN" &&
      !myParticipant?.canPost)
  const disabledMessage =
    conversation.type === "ANNOUNCEMENT"
      ? "Bu duyuruda yalnızca yöneticiler yazabilir. Siz okuyabilirsiniz."
      : "Bu grupta mesaj yazma yetkiniz yok. Yalnızca okuyabilirsiniz."

  const reloadDetail = async () => {
    const detailRes = await fetch(`/api/chat/conversations/${conversation.id}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
    const dJson = await detailRes.json().catch(() => ({}))
    if (detailRes.ok && dJson.conversation) {
      setDetail(dJson.conversation as ConversationDetail)
    }
    onConversationsChanged?.()
  }

  const deleteConversation = async () => {
    if (
      !window.confirm(
        `“${title}” sohbetini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json?.error || "Sohbet silinemedi")
        return
      }
      onDeleted?.(conversation.id)
      onConversationsChanged?.()
    } finally {
      setDeleting(false)
    }
  }

  const openReceipts = async (messageId: string) => {
    setReadFor(messageId)
    setReadReport(null)
    const res = await fetch(
      `/api/chat/conversations/${conversation.id}/receipts?messageId=${encodeURIComponent(messageId)}`,
      { headers: getAuthHeaders(), cache: "no-store" }
    )
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(json?.error || "Okundu listesi alınamadı")
      setReadFor(null)
      return
    }
    setReadReport(json)
  }

  const myName =
    typeof window !== "undefined"
      ? (actor.kind === "staff"
          ? localStorage.getItem("staff_name")
          : localStorage.getItem("parent_name")) || ""
      : ""

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Avatar name={title} variant={variant} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {conversation.type === "ANNOUNCEMENT" && (
              <Megaphone className="h-4 w-4 text-amber-600" />
            )}
            {conversation.type === "GROUP" && (
              <Users className="h-4 w-4 text-indigo-600" />
            )}
            <h2 className="truncate text-base font-semibold text-gray-900">{title}</h2>
          </div>
          {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
        </div>
        {canManageSettings && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Grup ayarları"
            title="Grup ayarları"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
        {canDelete ? (
          <button
            type="button"
            onClick={() => void deleteConversation()}
            disabled={deleting}
            className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label="Sohbeti sil"
            title="Sohbeti sil"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        ) : null}
        {myName && (
          <span className="hidden text-xs text-gray-400 sm:inline">Siz: {myName}</span>
        )}
      </header>

      {canManageSettings ? (
        <GroupSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          conversation={view}
          actorId={actor.id}
          onSaved={() => void reloadDetail()}
        />
      ) : null}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 space-y-3"
      >
        {nextCursor && (
          <div className="text-center">
            <button
              type="button"
              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
              onClick={loadOlder}
              disabled={loadingMore}
            >
              {loadingMore ? "Yükleniyor…" : "Daha önceki mesajlar"}
            </button>
          </div>
        )}
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            Bu sohbette henüz mesaj yok.
          </div>
        )}
        {messages.map((m) => {
          const isOwn =
            actor.kind === "staff"
              ? m.sender?.kind === "staff" && m.sender.id === actor.id
              : m.sender?.kind === "parent" && m.sender.id === actor.id
          return (
            <div key={m.id}>
              <MessageBubble message={m} isOwn={isOwn} actorKind={actor.kind} />
              {conversation.type === "ANNOUNCEMENT" && myRole === "ADMIN" ? (
                <button
                  type="button"
                  className="mb-2 ml-12 text-xs text-blue-700 hover:underline"
                  onClick={() => void openReceipts(m.id)}
                >
                  Kimler okudu
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {readFor && readReport ? (
        <div className="max-h-40 overflow-y-auto border-t bg-white px-4 py-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium text-gray-900">Okundu bilgisi</p>
            <button type="button" className="text-xs text-gray-500" onClick={() => setReadFor(null)}>
              Kapat
            </button>
          </div>
          <p className="text-xs font-medium text-gray-500">Okuyanlar ({readReport.read.length})</p>
          <ul className="mb-2 text-gray-800">
            {readReport.read.map((row) => (
              <li key={row.name}>{row.name}</li>
            ))}
            {readReport.read.length === 0 ? <li className="text-gray-400">Henüz yok</li> : null}
          </ul>
          <p className="text-xs font-medium text-gray-500">Okumayanlar ({readReport.unread.length})</p>
          <ul className="text-gray-800">
            {readReport.unread.map((row) => (
              <li key={row.name}>{row.name}</li>
            ))}
            {readReport.unread.length === 0 ? <li className="text-gray-400">Herkes okudu</li> : null}
          </ul>
        </div>
      ) : null}

      <MessageComposer
        disabled={composerDisabled}
        disabledMessage={disabledMessage}
        onSend={sendMessage}
        onUpload={uploadFile}
      />
    </div>
  )
}
