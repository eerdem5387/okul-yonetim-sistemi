/** İstemci tarafı yetki API yardımcıları */

export function staffAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("auth_token")
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export type PermissionsMeResponse = {
  staffId: string
  department: string
  isSuperAdmin: boolean
  permissions: string[]
  firstName?: string
  lastName?: string
  fullName?: string
  subject?: string | null
  hasGeziAccess?: boolean
  hasIbAccess?: boolean
  isActive?: boolean
}

export async function fetchPermissionsMe(): Promise<PermissionsMeResponse | null> {
  try {
    const res = await fetch("/api/permissions/me", { headers: staffAuthHeaders() })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function hasPermissionKey(
  permissions: string[] | null | undefined,
  module: string,
  action: string
): boolean {
  if (!permissions) return false
  return permissions.includes(`${module}.${action}`)
}

/** Personel faaliyet istatistikleri — süper yönetici veya activity_staff_stats.view */
export function canViewActivityStaffStats(me: PermissionsMeResponse | null): boolean {
  if (!me) return false
  if (me.isSuperAdmin) return true
  return hasPermissionKey(me.permissions, "activity_staff_stats", "view")
}

/** Faaliyet yönetimi — matris izni veya (geriye uyum) hasIbAccess */
export function canViewActivityEvents(me: PermissionsMeResponse | null): boolean {
  if (!me) return false
  if (me.isSuperAdmin) return true
  if (hasPermissionKey(me.permissions, "activity_events", "view")) return true
  return me.hasIbAccess === true
}

/** Faaliyet oluşturma — matris izni veya (geriye uyum) hasIbAccess */
export function canCreateActivityEvents(me: PermissionsMeResponse | null): boolean {
  if (!me) return false
  if (me.isSuperAdmin) return true
  if (hasPermissionKey(me.permissions, "activity_events", "create")) return true
  return me.hasIbAccess === true
}

/** Gezi yönetimi — matris izni veya (geriye uyum) hasGeziAccess */
export function canViewGezi(me: PermissionsMeResponse | null): boolean {
  if (!me) return false
  if (me.isSuperAdmin) return true
  if (hasPermissionKey(me.permissions, "gezi", "view")) return true
  return me.hasGeziAccess === true
}

export function canViewHrRecruitment(me: PermissionsMeResponse | null): boolean {
  if (!me) return false
  if (me.isSuperAdmin) return true
  return hasPermissionKey(me.permissions, "hr_recruitment", "view")
}

export function canViewHrRetention(me: PermissionsMeResponse | null): boolean {
  if (!me) return false
  if (me.isSuperAdmin) return true
  if (me.department === "MUDUR" || me.department === "MUDUR_YARDIMCISI") return true
  return hasPermissionKey(me.permissions, "hr_retention", "view")
}

export function canEditHrRetention(me: PermissionsMeResponse | null): boolean {
  if (!me) return false
  if (me.isSuperAdmin) return true
  if (me.department === "MUDUR" || me.department === "MUDUR_YARDIMCISI") return true
  return hasPermissionKey(me.permissions, "hr_retention", "edit")
}
