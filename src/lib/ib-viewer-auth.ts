import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

export interface IbViewerSession {
  viewerId: string
  username: string
  fullName: string
}

function parseIbViewerToken(token: string): { viewerId: string; timestamp: number } | null {
  if (!token.startsWith("ib_viewer_")) return null
  const parts = token.split("_")
  if (parts.length < 4) return null
  const timestamp = Number(parts[parts.length - 1])
  const viewerId = parts.slice(2, -1).join("_")
  if (!viewerId || !Number.isFinite(timestamp)) return null
  if (Date.now() - timestamp > TOKEN_MAX_AGE_MS) return null
  return { viewerId, timestamp }
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
  const parsed = parseIbViewerToken(token)
  if (!parsed) return null

  const viewer = await prisma.iBViewer.findUnique({
    where: { id: parsed.viewerId },
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
