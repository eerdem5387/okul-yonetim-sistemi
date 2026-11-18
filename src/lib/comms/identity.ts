import type { NextRequest } from "next/server"
import type { StaffDepartment } from "@prisma/client"
import { readBearerToken, verifySessionToken } from "@/lib/auth/session-token"
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

export async function resolveCommsActor(request: NextRequest): Promise<CommsActor | null> {
  const verified = verifySessionToken(readBearerToken(request))
  if (!verified || verified.kind === "ib_viewer") return null

  if (verified.kind === "parent") {
    const parentId = verified.subjectId

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

  const staffId = verified.subjectId
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
