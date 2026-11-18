import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySessionToken } from "@/lib/auth/session-token"

export interface IbViewerSession {
  viewerId: string
  username: string
  fullName: string
}

export function getIbViewerTokenFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get("token")
  if (fromQuery) return fromQuery

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim()
  }
  return null
}

export async function validateIbViewerToken(
  token: string | null
): Promise<IbViewerSession | null> {
  if (!token) return null
  const parsed = verifySessionToken(token, "ib_viewer")
  if (!parsed) return null

  const viewer = await prisma.iBViewer.findUnique({
    where: { id: parsed.subjectId },
    select: { id: true, username: true, fullName: true, isActive: true },
  })
  if (!viewer || !viewer.isActive) return null

  return {
    viewerId: viewer.id,
    username: viewer.username,
    fullName: viewer.fullName,
  }
}

export async function requireIbViewerFromRequest(
  request: NextRequest
): Promise<IbViewerSession | null> {
  const token = getIbViewerTokenFromRequest(request)
  return validateIbViewerToken(token)
}
