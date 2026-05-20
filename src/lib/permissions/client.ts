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
