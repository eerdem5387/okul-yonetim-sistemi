/** Personel oturum token süresi — varsayılan 15 gün */
const DEFAULT_STAFF_TOKEN_MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000

export function getStaffTokenMaxAgeMs(): number {
  if (typeof process !== "undefined" && process.env.STAFF_TOKEN_MAX_AGE_MS) {
    const parsed = Number.parseInt(process.env.STAFF_TOKEN_MAX_AGE_MS, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_STAFF_TOKEN_MAX_AGE_MS
}

/** İstemci tarafı süre kontrolü (sunucu `.env` ile farklı olabilir; varsayılan 15 gün). */
export const STAFF_TOKEN_MAX_AGE_MS = DEFAULT_STAFF_TOKEN_MAX_AGE_MS

export const REMEMBER_STAFF_TC_KEY = "remember_staff_tc"

const STAFF_ROLES = new Set([
  "admin",
  "principal",
  "student_affairs",
  "teacher",
  "counselor",
  "head_counselor",
])

export function isStaffAuthRole(role: string | null | undefined): role is string {
  return Boolean(role && STAFF_ROLES.has(role))
}

export function parseStaffToken(
  token: string
): { role: string; staffId: string; timestamp: number } | null {
  const parts = token.split("_")
  if (parts.length < 3) return null
  if (parts[0] === "parent") return null

  const timestamp = Number(parts[parts.length - 1])
  const staffId = parts[parts.length - 2]
  if (!staffId || !Number.isFinite(timestamp)) return null

  const role = parts.slice(0, parts.length - 2).join("_")
  return { role, staffId, timestamp }
}

export function isStaffTokenExpired(
  token: string,
  maxAgeMs: number = STAFF_TOKEN_MAX_AGE_MS
): boolean {
  const parsed = parseStaffToken(token)
  if (!parsed) return true
  return Date.now() - parsed.timestamp > maxAgeMs
}
