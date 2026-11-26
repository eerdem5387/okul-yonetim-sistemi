import type { NotificationPriority } from "@prisma/client"
import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendExpoPush, type ExpoPushMessage } from "@/lib/notifications/expo-push"

/**
 * İç haberleşme bildirimleri: uygulama içi bildirim (Notification, personel) + mobil push.
 * Gönderim yanıttan sonra (`after`) çalışır; hata asıl işlemi bozmaz.
 */

/** Android bildirim kanalları — mobil uygulama `register.ts` ile aynı kimlikler */
export const COMMS_CHANNEL_OFFICIAL = "comms-official"
export const COMMS_CHANNEL_CHAT = "comms-chat"

export type CommsPushKind =
  | "comms_notice"
  | "comms_notice_reminder"
  | "comms_request_new"
  | "comms_request_decided"
  | "comms_class_announcement"
  | "comms_group_message"

export type CommsPushData = {
  kind: CommsPushKind
  /** Mobilde açılacak sekme: inbox | requests | groups */
  tab?: "inbox" | "requests" | "groups" | "sent"
  id?: string
  groupId?: string
}

function clip(text: string, max = 180) {
  const t = text.replace(/\s+/g, " ").trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function buildMessages(
  tokens: string[],
  title: string,
  body: string,
  data: CommsPushData,
  opts: { channelId: string; priority: "default" | "high" }
): ExpoPushMessage[] {
  return tokens.map((to) => ({
    to,
    title,
    body: clip(body),
    sound: "default",
    priority: opts.priority,
    channelId: opts.channelId,
    data: { type: data.kind, href: "/mesajlar", ...data },
  }))
}

function runLater(task: () => Promise<void>) {
  const safe = async () => {
    try {
      await task()
    } catch (error) {
      console.error("[comms-notify] Bildirim gönderilemedi:", error)
    }
  }
  try {
    after(safe)
  } catch {
    // İstek bağlamı dışında (script/test) çağrıldıysa doğrudan çalıştır
    void safe()
  }
}

export function notifyStaffComms(params: {
  staffIds: string[]
  title: string
  body: string
  data: CommsPushData
  /** Zil (Notification) kaydı da oluşturulsun mu */
  inApp?: boolean
  priority?: NotificationPriority
  official?: boolean
}) {
  const ids = [...new Set(params.staffIds.filter(Boolean))]
  if (!ids.length) return
  runLater(async () => {
    if (params.inApp !== false) {
      await prisma.notification.createMany({
        data: ids.map((id) => ({
          type: "ILETISIM" as const,
          title: params.title,
          message: clip(params.body, 500),
          targetUserId: id,
          priority: params.priority ?? "NORMAL",
        })),
      })
    }
    const devices = await prisma.staffPushDevice.findMany({
      where: { staffId: { in: ids } },
      select: { token: true },
    })
    const tokens = [...new Set(devices.map((d) => d.token))]
    await sendExpoPush(
      buildMessages(tokens, params.title, params.body, params.data, {
        channelId: params.official ? COMMS_CHANNEL_OFFICIAL : COMMS_CHANNEL_CHAT,
        priority: params.official ? "high" : "default",
      })
    )
  })
}

export function notifyParentsComms(params: {
  parentIds: string[]
  title: string
  body: string
  data: CommsPushData
  official?: boolean
}) {
  const ids = [...new Set(params.parentIds.filter(Boolean))]
  if (!ids.length) return
  runLater(async () => {
    const devices = await prisma.parentPushDevice.findMany({
      where: { parentId: { in: ids } },
      select: { token: true },
    })
    const tokens = [...new Set(devices.map((d) => d.token))]
    await sendExpoPush(
      buildMessages(tokens, params.title, params.body, params.data, {
        channelId: params.official ? COMMS_CHANNEL_OFFICIAL : COMMS_CHANNEL_CHAT,
        priority: params.official ? "high" : "default",
      })
    )
  })
}

/** Talep onay mercileri (Kurucu + Müdür + Sistem yöneticisi) */
export async function listRequestApproverIds(): Promise<string[]> {
  const rows = await prisma.staff.findMany({
    where: { isActive: true, department: { in: ["KURUCU", "MUDUR", "SUPER_ADMIN"] } },
    select: { id: true },
  })
  return rows.map((r) => r.id)
}
