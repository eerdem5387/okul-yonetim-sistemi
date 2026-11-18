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

const AUTH_HEADER_FLAG = "__staffApiAuthHeaderInstalled"

function isSameOriginApi(url: string): boolean {
  if (url.startsWith("/api/")) return true
  try {
    const u = new URL(url, window.location.href)
    return u.origin === window.location.origin && u.pathname.startsWith("/api/")
  } catch {
    return false
  }
}

/**
 * Aynı kökenli /api/ isteklerine, açıkça Authorization verilmemişse personel oturum token'ını ekler.
 * Sunucu tarafı yetki kontrolleri token'a dayandığı için sayfaların tek tek başlık eklemesi gerekmez.
 * Modül yüklenirken (ilk render'dan önce) bir kez kurulur; birden çok çağrı güvenlidir.
 */
export function installStaffApiAuthHeader(): void {
  if (typeof window === "undefined") return
  const w = window as unknown as Record<string, unknown>
  if (w[AUTH_HEADER_FLAG]) return
  w[AUTH_HEADER_FLAG] = true

  const baseFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (!shouldGuardStaffSession()) return baseFetch(input, init)
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (!isSameOriginApi(url)) return baseFetch(input, init)

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    if (headers.has("Authorization")) return baseFetch(input, init)
    const token = localStorage.getItem("auth_token")
    if (!token) return baseFetch(input, init)
    headers.set("Authorization", `Bearer ${token}`)
    return baseFetch(input, { ...init, headers })
  }
}
