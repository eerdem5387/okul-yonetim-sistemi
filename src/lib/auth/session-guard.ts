import { clearStaffSession, redirectToStaffLogin } from "@/lib/permissions/client"
import { isStaffAuthRole, isStaffTokenExpired } from "@/lib/auth/token"

const AUTH_API_EXEMPT = [
  "/api/auth/tc-login",
  "/api/auth/login",
  "/api/auth/parent-login",
  "/api/ib/auth",
]

function shouldGuardStaffSession(): boolean {
  if (typeof window === "undefined") return false
  const role = localStorage.getItem("auth_role")
  const token = localStorage.getItem("auth_token")
  return Boolean(token && isStaffAuthRole(role))
}

/** Süresi dolmuş personel oturumunu temizler; gerekirse login'e yönlendirir. */
export function invalidateExpiredStaffSession(options?: {
  redirect?: boolean
}): boolean {
  if (!shouldGuardStaffSession()) return false

  const token = localStorage.getItem("auth_token")
  if (!token || !isStaffTokenExpired(token)) return false

  if (options?.redirect !== false) {
    redirectToStaffLogin("expired")
  } else {
    clearStaffSession()
  }
  return true
}

/** Açık sekmede API 401 yanıtlarında login'e yönlendirir. */
export function installStaffSessionGuard(): () => void {
  if (typeof window === "undefined") return () => {}

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init)
    if (response.status !== 401 || !shouldGuardStaffSession()) return response

    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input)

    if (!url.includes("/api/")) return response
    if (AUTH_API_EXEMPT.some((path) => url.includes(path))) return response

    redirectToStaffLogin("expired")
    return response
  }

  return () => {
    window.fetch = originalFetch
  }
}
