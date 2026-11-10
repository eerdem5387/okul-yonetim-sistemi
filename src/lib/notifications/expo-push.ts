import { prisma } from "@/lib/prisma"

export type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: "default" | null
  priority?: "default" | "normal" | "high"
  channelId?: string
}

type ExpoTicket = {
  status?: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return

  const chunks: ExpoPushMessage[][] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  for (const chunk of chunks) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    })

    if (!res.ok) {
      console.error("[expo-push] HTTP", res.status, await res.text().catch(() => ""))
      continue
    }

    const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null
    const tickets = json?.data ?? []
    const staleTokens: string[] = []

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i]
      const token = chunk[i]?.to
      if (!ticket || ticket.status !== "error" || !token) continue
      const err = ticket.details?.error
      if (err === "DeviceNotRegistered" || err === "InvalidCredentials") {
        staleTokens.push(token)
      } else {
        console.error("[expo-push] ticket error", ticket.message, err)
      }
    }

    if (staleTokens.length > 0) {
      await prisma.staffPushDevice.deleteMany({ where: { token: { in: staleTokens } } })
    }
  }
}
