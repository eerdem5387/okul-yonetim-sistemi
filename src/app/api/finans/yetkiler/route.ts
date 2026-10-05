import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canGrantFinanceAccess, FINANCE_GRANTABLE_ACTIONS } from "@/lib/finance/access"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  if (!(await canGrantFinanceAccess(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Yetki verme hakkınız yok." }, { status: 403 })
  }

  const staff = await prisma.staff.findMany({
    where: { isActive: true, department: { not: "SUPER_ADMIN" } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      permissions: {
        where: { module: "finance" },
        select: { action: true, granted: true },
      },
    },
  })

  return NextResponse.json({
    staff: staff.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      department: s.department,
      financeView: s.permissions.some((p) => p.action === "view" && p.granted),
      financeApprove: s.permissions.some((p) => p.action === "approve" && p.granted),
    })),
    grantableActions: FINANCE_GRANTABLE_ACTIONS,
  })
}

export async function PUT(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  if (!(await canGrantFinanceAccess(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Yetki verme hakkınız yok." }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    staffId?: string
    financeView?: boolean
    financeApprove?: boolean
  }

  const staffId = body.staffId?.trim()
  if (!staffId) return NextResponse.json({ error: "staffId gerekli." }, { status: 400 })

  const target = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, department: true },
  })
  if (!target) return NextResponse.json({ error: "Personel bulunamadı." }, { status: 404 })
  if (target.department === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Süper admin yetkileri buradan değişmez." }, { status: 400 })
  }
  if (target.department === "KURUCU") {
    return NextResponse.json(
      { error: "Kurucu zaten tam finans erişimine sahiptir." },
      { status: 400 },
    )
  }

  const want = new Set<string>()
  if (body.financeView) want.add("view")
  if (body.financeApprove) want.add("approve")
  if (want.has("approve")) want.add("view")

  await prisma.$transaction(async (tx) => {
    await tx.staffPermission.deleteMany({ where: { staffId, module: "finance" } })
    if (want.size > 0) {
      await tx.staffPermission.createMany({
        data: [...want].map((action) => ({
          staffId,
          module: "finance",
          action,
          granted: true,
        })),
      })
    }
  })

  return NextResponse.json({ ok: true })
}
