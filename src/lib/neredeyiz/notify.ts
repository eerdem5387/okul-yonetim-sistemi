import type { NotificationPriority, NotificationType, StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sendExpoPush } from "@/lib/notifications/expo-push"

/**
 * Neredeyiz bildirimleri: uygulama içi bildirim (Notification) + kayıtlı cihazlara mobil push.
 * Hata bildirimi asıl işlemi bozmaz.
 */
export async function notifyStaff(params: {
  staffIds: string[]
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  relatedSubjectId?: string | null
  relatedTopicId?: string | null
  relatedStaffId?: string | null
  /** Mobil uygulamada dokununca açılacak ekran (push data) */
  push?: { kind: string; href: string; extra?: Record<string, unknown> }
}): Promise<void> {
  const ids = [...new Set(params.staffIds.filter(Boolean))]
  if (!ids.length) return
  try {
    await prisma.notification.createMany({
      data: ids.map((id) => ({
        type: params.type,
        title: params.title,
        message: params.message,
        targetUserId: id,
        priority: params.priority ?? "NORMAL",
        relatedSubjectId: params.relatedSubjectId ?? null,
        relatedTopicId: params.relatedTopicId ?? null,
        relatedStaffId: params.relatedStaffId ?? null,
      })),
    })
    if (params.push) {
      const devices = await prisma.staffPushDevice.findMany({ where: { staffId: { in: ids } }, select: { token: true } })
      const tokens = [...new Set(devices.map((d) => d.token))]
      await sendExpoPush(
        tokens.map((to) => ({
          to,
          title: params.title,
          body: params.message.length > 180 ? `${params.message.slice(0, 177)}…` : params.message,
          sound: "default",
          channelId: "default",
          data: { type: params.push!.kind, href: params.push!.href, ...(params.push!.extra ?? {}) },
        })),
      )
    }
  } catch (error) {
    console.error("[neredeyiz] Bildirim gönderilemedi:", error)
  }
}

/** Departmana göre (ör. tüm öğretmenler) uygulama içi bildirim. */
export async function notifyRole(params: {
  role: StaffDepartment
  type: NotificationType
  title: string
  message: string
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: { type: params.type, title: params.title, message: params.message, targetRole: params.role },
    })
  } catch (error) {
    console.error("[neredeyiz] Bildirim gönderilemedi:", error)
  }
}
