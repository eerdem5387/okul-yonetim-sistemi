import { clearStaffSession, redirectToStaffLogin } from "@/lib/permissions/client"
import { isStaffAuthRole, isStaffTokenExpired } from "@/lib/auth/token"

const AUTH_API_EXEMPT = [
  "/api/auth/tc-login",
  "/api/auth/login",
  "/api/auth/parent-login",
  "/api/ib/auth",
]

/** Veli token süresi (sunucu: session-token.ts PARENT_TOKEN_MAX_AGE_MS ile aynı) */
const PARENT_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

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

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  if (input instanceof Request) return input.url
  return String(input)
}

/** Yalnızca bu sitenin kendi `/api/` adresleri (dış sitelere token gönderilmez). */
function isSameOriginApi(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/")
  } catch {
    return false
  }
}

/**
 * Oturum token'ını, `Authorization` başlığı eklemeyen eski `fetch("/api/...")` çağrılarına ekler.
 * Çağıran zaten bir `Authorization` başlığı gönderiyorsa (örn. IB izleyici) dokunulmaz.
 */
function withSessionAuthorization(
  input: RequestInfo | URL,
  init: RequestInit | undefined
): RequestInit | undefined {
  const token = localStorage.getItem("auth_token")
  if (!token) return init
  if (!isSameOriginApi(requestUrl(input))) return init

  const baseHeaders = init?.headers ?? (input instanceof Request ? input.headers : undefined)
  const headers = new Headers(baseHeaders)
  if (headers.has("authorization")) return init
  headers.set("Authorization", `Bearer ${token}`)
  return { ...init, headers }
}

function parentTokenExpired(token: string): boolean {
  const dot = token.lastIndexOf(".")
  const payload = dot === -1 ? token : token.slice(0, dot)
  const parts = payload.split("_")
  if (parts[0] !== "parent" || parts.length < 3) return true
  const ts = Number(parts[parts.length - 1])
  if (!Number.isFinite(ts)) return true
  return Date.now() - ts > PARENT_TOKEN_MAX_AGE_MS
}

let parentRedirecting = false

/** Veli oturumu sona erdiyse (24 saat) veli giriş sayfasına yönlendirir. */
function handleParentUnauthorized(): void {
  if (parentRedirecting) return
  if (localStorage.getItem("auth_role") !== "parent") return
  const token = localStorage.getItem("auth_token")
  if (token && !parentTokenExpired(token)) return
  parentRedirecting = true
  for (const key of [
    "auth_role",
    "auth_token",
    "parent_id",
    "student_tc",
    "student_id",
    "student_name",
    "parent_name",
    "parent_relation",
  ]) {
    localStorage.removeItem(key)
  }
  window.location.href = "/veli-login"
}

/**
 * Global fetch sarmalayıcı:
 *  - `/api/` isteklerine oturum token'ını ekler,
 *  - açık sekmede API 401 yanıtlarında login'e yönlendirir.
 */
export function installStaffSessionGuard(): () => void {
  if (typeof window === "undefined") return () => {}

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let finalInit = init
    try {
      finalInit = withSessionAuthorization(input, init)
    } catch {
      finalInit = init
    }
    const response = await originalFetch(input, finalInit)
    if (response.status !== 401) return response

    const url = requestUrl(input)
    if (!url.includes("/api/")) return response
    if (AUTH_API_EXEMPT.some((path) => url.includes(path))) return response

    if (shouldGuardStaffSession()) {
      redirectToStaffLogin("expired")
      return response
    }
    handleParentUnauthorized()
    return response
  }

  return () => {
    window.fetch = originalFetch
  }
}
