"use client"

import { useEffect, useState } from "react"
import { useChatRealtime } from "./useChatRealtime"
import { detectAreaActorKind, getAuthHeaders, localActorId } from "./chat-utils"

interface Props {
  className?: string
}

/**
 * Sidebar/menü ikonlarının yanında gösterilecek küçük "okunmamış mesaj" rozeti.
 */
export function UnreadBadge({ className = "" }: Props) {
  const [count, setCount] = useState(0)
  const [actorKind, setActorKind] = useState<"staff" | "parent" | null>(null)
  const [actorId, setActorId] = useState<string | null>(null)

  useEffect(() => {
    const k = detectAreaActorKind()
    const id = localActorId()
    setActorKind(k)
    setActorId(id)
  }, [])

  const refresh = async () => {
    try {
      const res = await fetch("/api/chat/unread-count", {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      if (!res.ok) return
      const json = await res.json()
      if (typeof json.count === "number") setCount(json.count)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!actorKind || !actorId) return
    void refresh()
    const interval = setInterval(refresh, 60_000)
    return () => clearInterval(interval)
  }, [actorKind, actorId])

  useChatRealtime({
    conversationId: null,
    actorKind,
    actorId,
    onConversationUpdated: () => {
      void refresh()
    },
  })

  if (count <= 0) return null
  return (
    <span
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white ${className}`}
      aria-label={`${count} okunmamış mesaj`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
