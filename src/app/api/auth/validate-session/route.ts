import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor, parseLoginRoleFromToken } from "@/lib/hr/actor"

function requestWithToken(request: NextRequest, token: string | null): NextRequest {
  if (!token) return request
  const headers = new Headers(request.headers)
  if (!headers.get("authorization") && !headers.get("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return new NextRequest(request.url, { headers, method: request.method })
}

function readToken(request: NextRequest, bodyToken?: string | null): string | null {
  if (bodyToken) return bodyToken
  const { searchParams } = new URL(request.url)
  const queryToken = searchParams.get("token")
  if (queryToken) return queryToken

  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization")
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim()
  }
  return null
}

async function validateStaffSession(request: NextRequest, token: string | null) {
  if (!token) {
    return NextResponse.json(
      { error: "Token gereklidir (query param veya Authorization header)", valid: false },
      { status: 400 }
    )
  }

  const actor = await resolveStaffActor(requestWithToken(request, token))
  if (!actor) {
    return NextResponse.json(
      { error: "Token süresi dolmuş veya geçersiz", valid: false, expired: true },
      { status: 401 }
    )
  }

  const role = parseLoginRoleFromToken(token) || "unknown"

  return NextResponse.json({
    valid: true,
    staffId: actor.staffId,
    role,
    department: actor.department,
    fullName: `${actor.firstName} ${actor.lastName}`,
  })
}

/**
 * GET /api/auth/validate-session
 * POST /api/auth/validate-session
 */
export async function GET(request: NextRequest) {
  try {
    const token = readToken(request)
    return validateStaffSession(request, token)
  } catch (error) {
    console.error("Error validating session:", error)
    return NextResponse.json(
      { error: "Session doğrulaması sırasında hata oluştu", valid: false },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = readToken(request, typeof body.token === "string" ? body.token : null)
    return validateStaffSession(request, token)
  } catch (error) {
    console.error("Error validating session:", error)
    return NextResponse.json(
      { error: "Session doğrulaması sırasında hata oluştu", valid: false },
      { status: 500 }
    )
  }
}
