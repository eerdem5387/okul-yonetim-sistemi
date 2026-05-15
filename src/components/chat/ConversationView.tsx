"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Megaphone, Users } from "lucide-react"
import { MessageBubble } from "./MessageBubble"
import { MessageComposer } from "./MessageComposer"
import { useChatRealtime } from "./useChatRealtime"
import {
  conversationDisplayTitle,
  conversationSubtitle,
  getAuthHeaders,
} from "./chat-utils"
import { Avatar } from "./Avatar"
import type {
  ChatActorKind,
  ChatConversation,
  ChatMessage,
} from "./types"

interface Props {
  conversation: ChatConversation | null
  actor: { kind: ChatActorKind; id: string }
  onConversationsChanged?: () => void
}

type ConversationDetail = ChatConversation

export function ConversationView({ conversation, actor, onConversationsChanged }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // İlk yükleme
  useEffect(() => {
    if (!conversation) {
      setMessages([])
      setDetail(null)
      setNextCursor(null)
      return
    }
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

  const myRole = detail?.myRole ?? conversation.myRole
  const composerDisabled =
    conversation.type === "ANNOUNCEMENT" && myRole !== "ADMIN"

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
        {myName && (
          <span className="hidden text-xs text-gray-400 sm:inline">Siz: {myName}</span>
        )}
      </header>

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
          return <MessageBubble key={m.id} message={m} isOwn={isOwn} actorKind={actor.kind} />
        })}
      </div>

      <MessageComposer
        disabled={composerDisabled}
        disabledMessage="Bu duyuru kanalında yalnızca yöneticiler mesaj gönderebilir."
        onSend={sendMessage}
        onUpload={uploadFile}
      />
    </div>
  )
}
