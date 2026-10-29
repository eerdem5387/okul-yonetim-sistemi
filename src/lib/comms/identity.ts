import type { NextRequest } from "next/server"
import type { StaffDepartment } from "@prisma/client"
import { getStaffTokenMaxAgeMs } from "@/lib/auth/token"
import { prisma } from "@/lib/prisma"

/**
 * İç haberleşme aktörü: Staff veya Parent.
 * Bearer token üzerinden çözülür.
 */
export type CommsActor =
  | {
      kind: "staff"
      staffId: string
      department: StaffDepartment
      firstName: string
      lastName: string
    }
  | {
      kind: "parent"
      parentId: string
      studentTcNumber: string
      displayName: string
    }

/** Geriye dönük alias — eski chat API’leri kaldırılınca kullanılmaz */
export type ChatActor = CommsActor

const PARENT_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000
const STAFF_TOKEN_MAX_AGE_MS = getStaffTokenMaxAgeMs()

function readBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim()
  return header.trim()
}

export async function resolveCommsActor(request: NextRequest): Promise<CommsActor | null> {
  const token = readBearerToken(request)
  if (!token) return null

  const parts = token.split("_")
  if (parts.length < 3) return null

  if (parts[0] === "parent") {
    const parentId = parts[1]
    const ts = Number(parts[2])
    if (!parentId || !Number.isFinite(ts)) return null
    if (Date.now() - ts > PARENT_TOKEN_MAX_AGE_MS) return null

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    })
    if (!parent || !parent.isActive) return null

    const display =
      parent.students[0]?.parentName?.trim() || `Veli (${parent.studentTcNumber.slice(0, 4)}...)`
    return {
      kind: "parent",
      parentId: parent.id,
      studentTcNumber: parent.studentTcNumber,
      displayName: display,
    }
  }

  const ts = Number(parts[parts.length - 1])
  const staffId = parts[parts.length - 2]
  if (!staffId || !Number.isFinite(ts)) return null
  if (Date.now() - ts > STAFF_TOKEN_MAX_AGE_MS) return null

  const staff = await prisma.staff.findUnique({ where: { id: staffId } })
  if (!staff || !staff.isActive) return null

  return {
    kind: "staff",
    staffId: staff.id,
    department: staff.department,
    firstName: staff.firstName,
    lastName: staff.lastName,
  }
}

/** @deprecated use resolveCommsActor */
export const resolveChatActor = resolveCommsActor
