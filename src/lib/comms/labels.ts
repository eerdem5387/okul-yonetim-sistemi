import type { CommsTemplateKind, OfficialNoticeType, StaffCommsRequestStatus } from "@prisma/client"

export const TEMPLATE_KIND_LABEL: Record<CommsTemplateKind, string> = {
  IHTAR: "İhtar",
  TALIMAT: "Talimat",
  PERSONEL_DUYURU: "Personel duyurusu",
  PERSONEL_TALEP: "Personel talebi",
  SINIF_DUYURU: "Sınıf duyurusu",
}

export const NOTICE_TYPE_LABEL: Record<OfficialNoticeType, string> = {
  IHTAR: "İhtar",
  TALIMAT: "Talimat",
  PERSONEL_DUYURU: "Personel duyurusu",
}

/** Liste / detay etiket renkleri */
export const NOTICE_TYPE_TEXT_CLASS: Record<OfficialNoticeType, string> = {
  IHTAR: "text-red-700",
  TALIMAT: "text-emerald-700",
  PERSONEL_DUYURU: "text-blue-700",
}

export const REQUEST_STATUS_LABEL: Record<StaffCommsRequestStatus, string> = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
}

export function formatCommsDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
