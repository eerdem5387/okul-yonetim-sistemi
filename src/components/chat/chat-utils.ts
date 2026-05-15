import type { ChatActorKind, ChatConversation, ChatParticipant } from "./types"

export function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" }
  const token = localStorage.getItem("auth_token")
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

export function detectAreaActorKind(): ChatActorKind | null {
  if (typeof window === "undefined") return null
  const role = localStorage.getItem("auth_role")
  if (!role) return null
  if (role === "parent") return "parent"
  return "staff"
}

export function localActorId(): string | null {
  if (typeof window === "undefined") return null
  const role = localStorage.getItem("auth_role")
  if (role === "parent") return localStorage.getItem("parent_id")
  return localStorage.getItem("staff_id")
}

/**
 * Aktör bakış açısından sohbet adı.
 * - PRIVATE: karşı tarafın display name'i
 * - GROUP / ANNOUNCEMENT: title (yoksa "İsimsiz Sohbet")
 */
export function conversationDisplayTitle(
  conv: ChatConversation,
  actor: { kind: ChatActorKind; id: string }
): string {
  if (conv.type !== "PRIVATE") return conv.title?.trim() || "İsimsiz Sohbet"
  const other = otherSideOfPrivate(conv, actor)
  if (!other) return "Özel Sohbet"
  if (other.staff) {
    return `${other.staff.firstName} ${other.staff.lastName}`.trim()
  }
  if (other.parent) return other.parent.displayName
  return "Özel Sohbet"
}

export function conversationSubtitle(conv: ChatConversation): string {
  if (conv.type === "ANNOUNCEMENT") return "Duyuru Kanalı"
  if (conv.type === "GROUP") {
    const count = conv.participants.length
    return `${count} katılımcı`
  }
  return ""
}

export function otherSideOfPrivate(
  conv: ChatConversation,
  actor: { kind: ChatActorKind; id: string }
): ChatParticipant | null {
  return (
    conv.participants.find((p) => {
      if (actor.kind === "staff") return !(p.staff && p.staff.id === actor.id)
      return !(p.parent && p.parent.id === actor.id)
    }) ?? null
  )
}

export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  if (sameDay) {
    return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate()
  if (isYesterday) return "Dün"
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })
}

export function lastMessagePreview(conv: ChatConversation): string {
  const m = conv.lastMessage
  if (!m) return "Henüz mesaj yok"
  if (m.type === "IMAGE") return "[Görsel]"
  if (m.type === "DOCUMENT") return "[Belge]"
  return m.body.length > 60 ? `${m.body.slice(0, 60)}…` : m.body
}

export function avatarInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const DEPARTMENT_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Sistem Yöneticisi",
  OGRETMEN: "Öğretmen",
  OGRENCI_ISLERI: "Öğrenci İşleri",
  MUDUR: "Müdür",
  MUDUR_YARDIMCISI: "Müdür Yardımcısı",
  REHBERLIK: "Rehberlik",
  BAS_REHBERLIK: "Baş Rehberlik",
  MUHASEBE: "Muhasebe",
  GUZEL_SANATLAR: "Güzel Sanatlar",
  SPOR: "Spor",
  KUTUPHANE: "Kütüphane",
  TEKNIK: "Teknik",
  TEMIZLIK: "Temizlik",
  GUVENLIK: "Güvenlik",
  DIGER: "Diğer",
}

export function departmentLabel(dep: string): string {
  return DEPARTMENT_LABELS[dep] || dep
}
