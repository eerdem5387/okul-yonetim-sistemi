import type { NextRequest } from "next/server"
import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Sohbet aktörü: ya bir Staff ya da bir Parent.
 * UI'dan gelen Bearer token üzerinden çözülür.
 *
 * Token formatları:
 *  - Staff:  `${role}_${staffId}_${timestamp}`   (ör: admin_clx..._1717..., teacher_clx..._..., counselor_..., principal_..., student_affairs_...)
 *  - Parent: `parent_${parentId}_${timestamp}`
 */
export type ChatActor =
  | {
      kind: "staff"
      staffId: string
      department: StaffDepartment
      firstName: string
      lastName: string
      isManager: boolean
      isTeacher: boolean
    }
  | {
      kind: "parent"
      parentId: string
      studentTcNumber: string
      displayName: string
    }

const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

const MANAGER_DEPARTMENTS: StaffDepartment[] = [
  "SUPER_ADMIN",
  "MUDUR",
  "MUDUR_YARDIMCISI",
  "OGRENCI_ISLERI",
  "REHBERLIK",
  "BAS_REHBERLIK",
]

export function isManagerDepartment(department: StaffDepartment): boolean {
  return MANAGER_DEPARTMENTS.includes(department)
}

export function isAnnouncementCreatorDepartment(department: StaffDepartment): boolean {
  // Group/Announcement oluşturma yetkisi:
  return (
    department === "SUPER_ADMIN" ||
    department === "MUDUR" ||
    department === "MUDUR_YARDIMCISI" ||
    department === "OGRENCI_ISLERI"
  )
}

function readBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim()
  return header.trim()
}

/**
 * İstekteki tokeni çözümleyip aktif sohbet aktörünü döndürür.
 * Geçersizse null döner.
 */
export async function resolveChatActor(request: NextRequest): Promise<ChatActor | null> {
  const token = readBearerToken(request)
  if (!token) return null

  const parts = token.split("_")
  if (parts.length < 3) return null

  // Parent token (prefix == "parent")
  if (parts[0] === "parent") {
    const parentId = parts[1]
    const ts = Number(parts[2])
    if (!parentId || !Number.isFinite(ts)) return null
    if (Date.now() - ts > TOKEN_MAX_AGE_MS) return null

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

  // Staff token: `${role}_${staffId}_${timestamp}` (rol "student_affairs" iki '_' içerir)
  // Bu nedenle prefix'i sondan iki parçayı kırparak hesaplıyoruz.
  const ts = Number(parts[parts.length - 1])
  const staffId = parts[parts.length - 2]
  if (!staffId || !Number.isFinite(ts)) return null
  if (Date.now() - ts > TOKEN_MAX_AGE_MS) return null

  const staff = await prisma.staff.findUnique({ where: { id: staffId } })
  if (!staff || !staff.isActive) return null

  return {
    kind: "staff",
    staffId: staff.id,
    department: staff.department,
    firstName: staff.firstName,
    lastName: staff.lastName,
    isManager: isManagerDepartment(staff.department),
    isTeacher: staff.department === "OGRETMEN",
  }
}

export function actorMatchesParticipant(
  actor: ChatActor,
  participant: { staffId: string | null; parentId: string | null }
): boolean {
  if (actor.kind === "staff") return participant.staffId === actor.staffId
  return participant.parentId === actor.parentId
}
