import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveChatActor } from "@/lib/chat/identity"
import {
  getReachableParentsForActor,
  getReachableStaffForActor,
} from "@/lib/chat/access-control"

export const dynamic = "force-dynamic"

/**
 * GET /api/chat/contacts
 * Aktif kullanıcının başlatabileceği DM hedeflerini döner.
 */
export async function GET(request: NextRequest) {
  const actor = await resolveChatActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const [staff, parents, branches, classes] = await Promise.all([
    getReachableStaffForActor(actor),
    getReachableParentsForActor(actor),
    actor.kind === "staff" ? listBranches() : Promise.resolve([]),
    actor.kind === "staff" ? listClasses(actor) : Promise.resolve([]),
  ])

  return NextResponse.json(
    {
      actor: { kind: actor.kind },
      staff,
      parents,
      branches,
      classes,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

async function listBranches() {
  const [branches, teachers] = await Promise.all([
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.staff.findMany({
      where: { isActive: true, department: "OGRETMEN" },
      select: { subject: true, branchLinks: { select: { branchId: true } } },
    }),
  ])
  return branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    teacherCount: teachers.filter(
      (teacher) =>
        teacher.branchLinks.some((link) => link.branchId === branch.id) ||
        teacher.subject?.trim().toLocaleLowerCase("tr") === branch.name.trim().toLocaleLowerCase("tr")
    ).length,
  }))
}

async function listClasses(actor: { kind: "staff"; staffId: string; isManager: boolean }) {
  const year = await prisma.academicYear.findFirst({
    where: { isActive: true, parentActiveYearId: null },
    select: { id: true },
  })
  return prisma.class.findMany({
    where: {
      ...(year ? { academicYearId: year.id } : {}),
      ...(actor.isManager
        ? {}
        : {
            OR: [
              { counselorId: actor.staffId },
              { schedules: { some: { teacherId: actor.staffId } } },
            ],
          }),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}
