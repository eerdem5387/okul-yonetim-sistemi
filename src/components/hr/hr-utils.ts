import type { LeaveStatus, LeaveType, StaffDepartment } from "@prisma/client"
import { LEAVE_TYPE_LABELS, STAFF_DEPARTMENT_LABELS, DAY_OF_WEEK_LABELS } from "@/lib/hr/constants"

export function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" }
  const token = localStorage.getItem("auth_token")
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

export function leaveTypeLabel(type: LeaveType): string {
  return LEAVE_TYPE_LABELS[type] ?? type
}

export function leaveStatusLabel(status: LeaveStatus): string {
  switch (status) {
    case "PENDING":
      return "Onay Bekliyor"
    case "APPROVED":
      return "Onaylandı"
    case "REJECTED":
      return "Reddedildi"
  }
}

export function leaveStatusBadgeClass(status: LeaveStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
    case "APPROVED":
      return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
    case "REJECTED":
      return "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
  }
}

export function departmentLabel(dep: StaffDepartment | string): string {
  return (STAFF_DEPARTMENT_LABELS as Record<string, string>)[dep] ?? dep
}

export function dayLabel(day: number): string {
  return DAY_OF_WEEK_LABELS[day] ?? String(day)
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const s = typeof start === "string" ? new Date(start) : start
  const e = typeof end === "string" ? new Date(end) : end
  const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
  if (s.toDateString() === e.toDateString()) return fmt(s)
  return `${fmt(s)} – ${fmt(e)}`
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function isHrAdminClient(): boolean {
  if (typeof window === "undefined") return false
  const department = localStorage.getItem("staff_department")
  return department === "SUPER_ADMIN" || department === "MUDUR" || department === "MUDUR_YARDIMCISI"
}
