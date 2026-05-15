import Pusher from "pusher"

/**
 * Pusher sunucu instance'ı (lazy).
 * Env değişkenleri eksikse mesaj akışı kırılmaz; trigger çağrıları sessizce no-op olur.
 */
let cached: Pusher | null = null
let warned = false

function getPusher(): Pusher | null {
  if (cached) return cached
  const appId = process.env.PUSHER_APP_ID
  const key = process.env.PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER

  if (!appId || !key || !secret || !cluster) {
    if (!warned) {
      warned = true
      console.warn("[chat] Pusher env değişkenleri eksik; real-time event'ler devre dışı.")
    }
    return null
  }

  cached = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  })
  return cached
}

export function conversationChannel(conversationId: string): string {
  return `private-conversation-${conversationId}`
}

export function userStaffChannel(staffId: string): string {
  return `private-user-staff-${staffId}`
}

export function userParentChannel(parentId: string): string {
  return `private-user-parent-${parentId}`
}

export interface PusherAuthArgs {
  socketId: string
  channel: string
}

export function authorizeChannel({ socketId, channel }: PusherAuthArgs): { auth: string } | null {
  const pusher = getPusher()
  if (!pusher) return null
  return pusher.authorizeChannel(socketId, channel)
}

interface NewMessagePayload {
  id: string
  conversationId: string
  body: string
  type: "TEXT" | "IMAGE" | "DOCUMENT"
  attachmentUrl: string | null
  createdAt: string
  sender:
    | { kind: "staff"; id: string; displayName: string }
    | { kind: "parent"; id: string; displayName: string }
    | null
}

export async function triggerNewMessage(
  conversationId: string,
  payload: NewMessagePayload,
  recipientChannels: string[] = []
): Promise<void> {
  const pusher = getPusher()
  if (!pusher) return
  try {
    await pusher.trigger(conversationChannel(conversationId), "new-message", payload)
    if (recipientChannels.length > 0) {
      await pusher.trigger(recipientChannels, "conversation-updated", {
        conversationId,
        updatedAt: payload.createdAt,
      })
    }
  } catch (err) {
    console.error("[chat] Pusher trigger error (new-message):", err)
  }
}

export async function triggerReadReceipt(
  conversationId: string,
  payload: { reader: { kind: "staff" | "parent"; id: string }; readAt: string; markedCount: number }
): Promise<void> {
  const pusher = getPusher()
  if (!pusher) return
  try {
    await pusher.trigger(conversationChannel(conversationId), "read-receipt", payload)
  } catch (err) {
    console.error("[chat] Pusher trigger error (read-receipt):", err)
  }
}

export async function triggerConversationUpdated(
  channels: string[],
  payload: { conversationId: string; reason?: string }
): Promise<void> {
  const pusher = getPusher()
  if (!pusher || channels.length === 0) return
  try {
    await pusher.trigger(channels, "conversation-updated", payload)
  } catch (err) {
    console.error("[chat] Pusher trigger error (conversation-updated):", err)
  }
}
