import type { HrApplicationStatus } from "@prisma/client"

export const HR_STATUS_LABELS: Record<HrApplicationStatus, string> = {
  YENI: "Yeni",
  INCELENDI: "İncelendi",
  GORUSME: "Görüşme",
  RED: "Red",
  ISE_ALINDI: "İşe Alındı",
}

export const HR_STATUS_OPTIONS = Object.entries(HR_STATUS_LABELS).map(([value, label]) => ({
  value: value as HrApplicationStatus,
  label,
}))

export const HR_STATUS_COLORS: Record<HrApplicationStatus, string> = {
  YENI: "bg-blue-100 text-blue-800",
  INCELENDI: "bg-slate-100 text-slate-800",
  GORUSME: "bg-amber-100 text-amber-900",
  RED: "bg-red-100 text-red-800",
  ISE_ALINDI: "bg-emerald-100 text-emerald-800",
}
