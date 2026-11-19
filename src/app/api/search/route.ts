import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaff, requireStaffAccess } from "@/lib/auth/api-guard"
import { buildStudentSearchWhere, expandTurkishSearchVariants, sanitizeSearchInput } from "@/lib/turkish-search"

/**
 * GET /api/search?q=... — Ctrl+K arama penceresi için öğrenci, sınıf ve personel kısayolları.
 * Her grup yalnızca kişinin o modülü görme yetkisi varsa döner. Yalnızca okuma yapar.
 */
export async function GET(request: NextRequest) {
  const authGuard = await requireStaff(request)
  if (!authGuard.ok) return authGuard.response

  const q = sanitizeSearchInput(new URL(request.url).searchParams.get("q") ?? "")
  if (q.length < 2) return NextResponse.json({ students: [], classes: [], staff: [] })

  const [canStudents, canClasses, canStaff] = await Promise.all([
    requireStaffAccess(request, { module: "students", action: "view" }),
    requireStaffAccess(request, { module: "classes", action: "view" }),
    requireStaffAccess(request, { module: "staff", action: "view" }),
  ])

  const studentWhere = buildStudentSearchWhere(q)
  const isNumeric = /^\d+$/.test(q)
  const nameWhere = isNumeric ? null : buildNameWhere(q)

  const [students, classes, staff] = await Promise.all([
    canStudents.ok && studentWhere
      ? prisma.student.findMany({
          where: studentWhere,
          select: { id: true, firstName: true, lastName: true, grade: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          take: 8,
        })
      : [],
    canClasses.ok && !isNumeric
      ? prisma.class.findMany({
          where: { name: { contains: q.replace(/\s+/g, ""), mode: "insensitive" }, academicYear: { isActive: true } },
          select: { id: true, name: true, _count: { select: { students: true } } },
          orderBy: { name: "asc" },
          take: 6,
        })
      : [],
    canStaff.ok && nameWhere
      ? prisma.staff.findMany({
          where: { ...nameWhere, isActive: true },
          select: { id: true, firstName: true, lastName: true, department: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          take: 6,
        })
      : [],
  ])

  return NextResponse.json({
    students: students.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, detail: s.grade })),
    classes: classes.map((c) => ({ id: c.id, name: c.name, detail: `${c._count.students} öğrenci` })),
    staff: staff.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, detail: s.department })),
  })
}

function buildNameWhere(q: string) {
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null
  return {
    AND: tokens.map((token) => ({
      OR: expandTurkishSearchVariants(token).flatMap((v) => [
        { firstName: { contains: v, mode: "insensitive" as const } },
        { lastName: { contains: v, mode: "insensitive" as const } },
      ]),
    })),
  }
}
