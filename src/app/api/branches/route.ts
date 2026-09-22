import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  branchInclude,
  DEFAULT_BRANCH_NAMES,
  normalizeBranchName,
  syncStaffBranches,
  upsertBranchByName,
} from "@/lib/branches"

export const dynamic = "force-dynamic"

async function ensureDefaultBranches() {
  const count = await prisma.branch.count()
  if (count > 0) return
  for (let i = 0; i < DEFAULT_BRANCH_NAMES.length; i++) {
    await upsertBranchByName(DEFAULT_BRANCH_NAMES[i], i)
  }
}

/** GET /api/branches?all=1&withTeachers=1 */
export async function GET(request: NextRequest) {
  try {
    await ensureDefaultBranches()
    const all = request.nextUrl.searchParams.get("all") === "1"
    const withTeachers = request.nextUrl.searchParams.get("withTeachers") === "1"

    const branches = await prisma.branch.findMany({
      where: all ? undefined : { isActive: true },
      include: withTeachers
        ? branchInclude
        : { _count: { select: { staffLinks: true, scheduleCourses: true, subjects: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return NextResponse.json({ branches })
  } catch (error) {
    console.error("Error fetching branches:", error)
    return NextResponse.json({ error: "Branş listesi alınamadı" }, { status: 500 })
  }
}

/** POST /api/branches — { name, teacherIds?: string[] } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = normalizeBranchName(String(body.name ?? ""))
    if (!name) {
      return NextResponse.json({ error: "Branş adı zorunlu" }, { status: 400 })
    }

    const existing = await prisma.branch.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.branch.update({
          where: { id: existing.id },
          data: { isActive: true, name },
          include: branchInclude,
        })
        return NextResponse.json({ branch: reactivated, reactivated: true })
      }
      return NextResponse.json({ error: "Bu branş zaten tanımlı" }, { status: 409 })
    }

    const maxOrder = await prisma.branch.aggregate({ _max: { sortOrder: true } })
    const branch = await prisma.branch.create({
      data: {
        name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isActive: true,
      },
      include: branchInclude,
    })

    // Ders programı kataloğunda da görünsün
    const course = await prisma.scheduleCourse.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
    if (course) {
      await prisma.scheduleCourse.update({
        where: { id: course.id },
        data: { branchId: branch.id, isActive: true, name },
      })
    } else {
      await prisma.scheduleCourse.create({
        data: {
          name,
          branchId: branch.id,
          sortOrder: branch.sortOrder,
          isActive: true,
        },
      })
    }

    const teacherIds = Array.isArray(body.teacherIds)
      ? body.teacherIds.map((id: unknown) => String(id))
      : []
    if (teacherIds.length > 0) {
      for (const staffId of teacherIds) {
        const links = await prisma.staffBranch.findMany({
          where: { staffId },
          select: { branchId: true },
        })
        await syncStaffBranches(staffId, [...links.map((l) => l.branchId), branch.id])
      }
    }

    const fresh = await prisma.branch.findUnique({
      where: { id: branch.id },
      include: branchInclude,
    })
    return NextResponse.json({ branch: fresh })
  } catch (error) {
    console.error("Error creating branch:", error)
    return NextResponse.json({ error: "Branş eklenemedi" }, { status: 500 })
  }
}

/** PUT /api/branches — { id, name?, isActive?, sortOrder?, teacherIds? } */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const id = String(body.id ?? "").trim()
    if (!id) {
      return NextResponse.json({ error: "id zorunlu" }, { status: 400 })
    }

    const data: { name?: string; isActive?: boolean; sortOrder?: number } = {}
    if (typeof body.name === "string" && body.name.trim()) {
      data.name = normalizeBranchName(body.name)
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder

    const branch = await prisma.branch.update({
      where: { id },
      data,
    })

    if (data.name) {
      await prisma.scheduleCourse.updateMany({
        where: { branchId: id },
        data: { name: data.name },
      })
      const course = await prisma.scheduleCourse.findFirst({
        where: { OR: [{ branchId: id }, { name: { equals: data.name, mode: "insensitive" } }] },
      })
      if (course) {
        await prisma.scheduleCourse.update({
          where: { id: course.id },
          data: { branchId: id, name: data.name, isActive: true },
        })
      } else {
        await prisma.scheduleCourse.create({
          data: {
            name: data.name,
            branchId: id,
            sortOrder: branch.sortOrder,
            isActive: true,
          },
        })
      }
    }

    if (Array.isArray(body.teacherIds)) {
      const rawIds = body.teacherIds as unknown[]
      const teacherIds: string[] = []
      for (const x of rawIds) {
        const id = String(x).trim()
        if (id && !teacherIds.includes(id)) teacherIds.push(id)
      }
      const current = await prisma.staffBranch.findMany({
        where: { branchId: id },
        select: { staffId: true },
      })
      const currentIds = new Set(current.map((c) => c.staffId))
      const nextIds = new Set(teacherIds)

      for (const staffId of currentIds) {
        if (!nextIds.has(staffId)) {
          const links = await prisma.staffBranch.findMany({
            where: { staffId },
            select: { branchId: true },
          })
          await syncStaffBranches(
            staffId,
            links.map((l) => l.branchId).filter((bid) => bid !== id)
          )
        }
      }
      for (const staffId of nextIds) {
        if (!currentIds.has(staffId)) {
          const links = await prisma.staffBranch.findMany({
            where: { staffId },
            select: { branchId: true },
          })
          await syncStaffBranches(staffId, [...links.map((l) => l.branchId), id])
        }
      }
    }

    const fresh = await prisma.branch.findUnique({
      where: { id },
      include: branchInclude,
    })
    return NextResponse.json({ branch: fresh })
  } catch (error) {
    console.error("Error updating branch:", error)
    return NextResponse.json({ error: "Branş güncellenemedi" }, { status: 500 })
  }
}

/** DELETE /api/branches?id= — soft delete */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim()
    if (!id) {
      return NextResponse.json({ error: "id zorunlu" }, { status: 400 })
    }
    const branch = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    })
    await prisma.scheduleCourse.updateMany({
      where: { branchId: id },
      data: { isActive: false },
    })
    return NextResponse.json({ success: true, branch })
  } catch (error) {
    console.error("Error deleting branch:", error)
    return NextResponse.json({ error: "Branş silinemedi" }, { status: 500 })
  }
}
