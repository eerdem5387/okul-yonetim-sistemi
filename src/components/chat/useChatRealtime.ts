"use client"

import { useEffect, useRef } from "react"
import Pusher, { type Channel } from "pusher-js"
import type { ChatActorKind, ChatMessage } from "./types"

let cached: Pusher | null = null

interface PusherCfg {
  key: string
  cluster: string
}

function getPusherConfig(): PusherCfg | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  if (!key || !cluster) return null
  return { key, cluster }
}

function getOrCreatePusher(token: string | null): Pusher | null {
  if (cached) return cached
  const cfg = getPusherConfig()
  if (!cfg) return null
  cached = new Pusher(cfg.key, {
    cluster: cfg.cluster,
    forceTLS: true,
    authEndpoint: "/api/chat/pusher/auth",
    auth: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  })
  return cached
}

interface RealtimeArgs {
  conversationId?: string | null
  actorKind: ChatActorKind | null
  actorId: string | null
  onNewMessage?: (msg: ChatMessage) => void
  onConversationUpdated?: (payload: { conversationId: string; reason?: string }) => void
  onReadReceipt?: (payload: {
    reader: { kind: ChatActorKind; id: string }
    readAt: string
    markedCount: number
  }) => void
}

/**
 * useChatRealtime
 *
 * - Conversation kanalına abone olur (varsa)
 * - Kullanıcının kendi user-* kanalına abone olur (badge için)
 * - Pusher creds yoksa sessizce no-op
 */
export function useChatRealtime({
  conversationId,
  actorKind,
  actorId,
  onNewMessage,
  onConversationUpdated,
  onReadReceipt,
}: RealtimeArgs): void {
  const cbs = useRef({ onNewMessage, onConversationUpdated, onReadReceipt })
  cbs.current = { onNewMessage, onConversationUpdated, onReadReceipt }

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    const pusher = getOrCreatePusher(token)
    if (!pusher) return

    const channels: Channel[] = []

    if (conversationId) {
      const ch = pusher.subscribe(`private-conversation-${conversationId}`)
      ch.bind("new-message", (data: ChatMessage) => {
        cbs.current.onNewMessage?.(data)
      })
      ch.bind(
        "read-receipt",
        (data: { reader: { kind: ChatActorKind; id: string }; readAt: string; markedCount: number }) => {
          cbs.current.onReadReceipt?.(data)
        }
      )
      channels.push(ch)
    }

    if (actorKind && actorId) {
      const userChannel =
        actorKind === "staff"
          ? `private-user-staff-${actorId}`
          : `private-user-parent-${actorId}`
      const ch = pusher.subscribe(userChannel)
      ch.bind("conversation-updated", (data: { conversationId: string; reason?: string }) => {
        cbs.current.onConversationUpdated?.(data)
      })
      channels.push(ch)
    }

    return () => {
      for (const ch of channels) {
        try {
          ch.unbind_all()
          pusher.unsubscribe(ch.name)
        } catch {
          // ignore
        }
      }
    }
  }, [conversationId, actorKind, actorId])
}
