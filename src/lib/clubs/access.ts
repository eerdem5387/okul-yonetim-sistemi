import type { NextRequest } from "next/server"
import type { StaffActor } from "@/lib/hr/actor"
import { resolveStaffActor } from "@/lib/hr/actor"
import { isSuperAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function resolveClubStaffActor(request: NextRequest): Promise<StaffActor | null> {
  return resolveStaffActor(request)
}

export function canManageClubRoster(actor: StaffActor): boolean {
  if (isSuperAdmin(actor.department, actor.staffId)) return true
  return (
    actor.department === "MUDUR" ||
    actor.department === "KURUCU" ||
    actor.department === "MUDUR_YARDIMCISI" ||
    actor.department === "OGRENCI_ISLERI" ||
    actor.department === "REHBERLIK" ||
    actor.department === "BAS_REHBERLIK" ||
    actor.department === "SUPER_ADMIN"
  )
}

export async function isClubInstructor(clubId: string, staffId: string): Promise<boolean> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { instructorId: true },
  })
  return club?.instructorId === staffId
}

export const instructorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  subject: true,
} as const
