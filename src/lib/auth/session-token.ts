import { createHmac, timingSafeEqual } from "crypto"
import { getStaffTokenMaxAgeMs, isStaffAuthRole } from "@/lib/auth/token"

/**
 * İmzalı oturum token'ları (yalnızca sunucu).
 *
 * Biçim: `${payload}.${imza}`
 *   - payload: `${role}_${id}_${timestamp}` (eski biçimle aynı; "student_affairs" gibi roller alt çizgi içerir)
 *       personel: `${role}_${staffId}_${ts}`
 *       veli:     `parent_${parentId}_${ts}`
 *       IB:       `ib_viewer_${viewerId}_${ts}`
 *   - imza: HMAC-SHA256(AUTH_TOKEN_SECRET, payload), base64url
 *
 * Geçiş dönemi: imzasız eski token'lar `AUTH_ACCEPT_LEGACY_TOKENS` kapatılana kadar (varsayılan açık)
 * kabul edilir ve loglanır.
 */

export type SessionTokenKind = "staff" | "parent" | "ib_viewer"

export interface VerifiedSessionToken {
  kind: SessionTokenKind
  /** Girişte atanan rol öneki (personel için "admin", "teacher" …; veli için "parent"; IB için "ib_viewer") */
  role: string
  /** staffId / parentId / viewerId */
  subjectId: string
  timestamp: number
  /** true → imzasız eski biçim, geçiş bayrağı sayesinde kabul edildi */
  legacy: boolean
}

const PARENT_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000
const IB_VIEWER_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000
/** Saat kaymasına izin (gelecek tarihli token'lar için) */
const CLOCK_SKEW_MS = 5 * 60 * 1000

const DEV_FALLBACK_SECRET = "dev-only-insecure-auth-token-secret"
let warnedDevSecret = false

function getSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim()
  if (secret) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_TOKEN_SECRET tanımlı değil; oturum token'ı üretilemez/doğrulanamaz.")
  }
  if (!warnedDevSecret) {
    warnedDevSecret = true
    console.warn("[auth] AUTH_TOKEN_SECRET tanımlı değil — yalnızca geliştirme için sabit anahtar kullanılıyor.")
  }
  return DEV_FALLBACK_SECRET
}

export function isLegacyTokenAcceptanceEnabled(): boolean {
  const raw = process.env.AUTH_ACCEPT_LEGACY_TOKENS?.trim().toLowerCase()
  if (!raw) return true
  return !["0", "false", "no", "off"].includes(raw)
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url")
}

function signatureMatches(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

function createToken(role: string, subjectId: string): string {
  if (!role || !subjectId || subjectId.includes("_") || subjectId.includes(".")) {
    throw new Error("Geçersiz token içeriği")
  }
  const payload = `${role}_${subjectId}_${Date.now()}`
  return `${payload}.${sign(payload)}`
}

export function createStaffSessionToken(role: string, staffId: string): string {
  if (!isStaffAuthRole(role)) throw new Error(`Bilinmeyen personel rolü: ${role}`)
  return createToken(role, staffId)
}

export function createParentSessionToken(parentId: string): string {
  return createToken("parent", parentId)
}

export function createIbViewerSessionToken(viewerId: string): string {
  return createToken("ib_viewer", viewerId)
}

function parsePayload(
  payload: string
): Omit<VerifiedSessionToken, "legacy"> | null {
  const parts = payload.split("_")
  if (parts.length < 3) return null
  const timestamp = Number(parts[parts.length - 1])
  const subjectId = parts[parts.length - 2]
  const role = parts.slice(0, parts.length - 2).join("_")
  if (!subjectId || !role || !Number.isFinite(timestamp) || !/^\d+$/.test(parts[parts.length - 1])) {
    return null
  }

  let kind: SessionTokenKind
  if (role === "parent") kind = "parent"
  else if (role === "ib_viewer") kind = "ib_viewer"
  else if (isStaffAuthRole(role)) kind = "staff"
  else return null

  return { kind, role, subjectId, timestamp }
}

function maxAgeFor(kind: SessionTokenKind): number {
  if (kind === "parent") return PARENT_TOKEN_MAX_AGE_MS
  if (kind === "ib_viewer") return IB_VIEWER_TOKEN_MAX_AGE_MS
  return getStaffTokenMaxAgeMs()
}

/** Aynı kişi için eski token kabul logunu saatte bir ile sınırla */
const legacyLogTimes = new Map<string, number>()
const LEGACY_LOG_INTERVAL_MS = 60 * 60 * 1000

function logLegacyAccepted(parsed: Omit<VerifiedSessionToken, "legacy">): void {
  const key = `${parsed.kind}:${parsed.subjectId}`
  const now = Date.now()
  const last = legacyLogTimes.get(key)
  if (last && now - last < LEGACY_LOG_INTERVAL_MS) return
  if (legacyLogTimes.size > 5000) legacyLogTimes.clear()
  legacyLogTimes.set(key, now)
  console.warn(
    `[auth] İmzasız eski token kabul edildi (geçiş dönemi): kind=${parsed.kind} role=${parsed.role} id=${parsed.subjectId} issuedAt=${new Date(parsed.timestamp).toISOString()}`
  )
}

/**
 * Token'ı doğrular: imza (veya geçiş döneminde eski biçim), rol ve süre.
 * Geçersizse null döner. `expectedKind` verilirse başka türdeki token'lar reddedilir.
 */
export function verifySessionToken(
  token: string | null | undefined,
  expectedKind?: SessionTokenKind
): VerifiedSessionToken | null {
  if (!token || token.length > 512) return null

  const dot = token.lastIndexOf(".")
  let parsed: Omit<VerifiedSessionToken, "legacy"> | null
  let legacy = false

  if (dot === -1) {
    parsed = parsePayload(token)
    if (!parsed) return null
    if (!isLegacyTokenAcceptanceEnabled()) return null
    legacy = true
  } else {
    const payload = token.slice(0, dot)
    const signature = token.slice(dot + 1)
    if (!signature) return null
    parsed = parsePayload(payload)
    if (!parsed) return null
    if (!signatureMatches(payload, signature)) return null
  }

  if (expectedKind && parsed.kind !== expectedKind) return null

  const now = Date.now()
  if (parsed.timestamp > now + CLOCK_SKEW_MS) return null
  if (now - parsed.timestamp > maxAgeFor(parsed.kind)) return null

  if (legacy) logLegacyAccepted(parsed)
  return { ...parsed, legacy }
}

/** `Authorization: Bearer …` başlığından token'ı okur */
export function readBearerToken(request: { headers: Headers }): string | null {
  const header = request.headers.get("authorization")
  if (!header) return null
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim() || null
  return header.trim() || null
}
