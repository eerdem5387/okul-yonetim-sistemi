import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canManageTemplates, COMMS_MODULE, SEND_OFFICIAL_ACTION } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

/**
 * SUPER_ADMIN: messaging.create (= send_official) yetki listesi / toggle
 */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canManageTemplates(actor.department)) {
    return NextResponse.json({ error: "Yetki grant yönetimi yalnızca sistem yöneticisine aittir" }, { status: 403 })
  }

  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      department: { notIn: ["KURUCU", "MUDUR", "SUPER_ADMIN"] },
    },
    select: { id: true, firstName: true, lastName: true, department: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  const grants = await prisma.staffPermission.findMany({
    where: {
      module: COMMS_MODULE,
      action: SEND_OFFICIAL_ACTION,
      granted: true,
      staffId: { in: staff.map((s) => s.id) },
    },
    select: { staffId: true },
  })
  const grantedSet = new Set(grants.map((g) => g.staffId))

  return NextResponse.json({
    staff: staff.map((s) => ({
      ...s,
      sendOfficial: grantedSet.has(s.id),
    })),
  })
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canManageTemplates(actor.department)) {
    return NextResponse.json({ error: "Yetki grant yönetimi yalnızca sistem yöneticisine aittir" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const staffId = String(body?.staffId || "")
  const granted = Boolean(body?.granted)
  if (!staffId) return NextResponse.json({ error: "staffId zorunlu" }, { status: 400 })

  const target = await prisma.staff.findUnique({ where: { id: staffId } })
  if (!target || !target.isActive) {
    return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 })
  }
  if (["KURUCU", "MUDUR", "SUPER_ADMIN"].includes(target.department)) {
    return NextResponse.json(
      { error: "Kurucu/Müdür/Sistem yöneticisi native yetkilidir; grant gerekmez" },
      { status: 400 }
    )
  }

  if (granted) {
    await prisma.staffPermission.upsert({
      where: {
        staffId_module_action: {
          staffId,
          module: COMMS_MODULE,
          action: SEND_OFFICIAL_ACTION,
        },
      },
      create: {
        staffId,
        module: COMMS_MODULE,
        action: SEND_OFFICIAL_ACTION,
        granted: true,
      },
      update: { granted: true },
    })
    // messaging.view da açılsın (nav)
    await prisma.staffPermission.upsert({
      where: {
        staffId_module_action: {
          staffId,
          module: COMMS_MODULE,
          action: "view",
        },
      },
      create: {
        staffId,
        module: COMMS_MODULE,
        action: "view",
        granted: true,
      },
      update: { granted: true },
    })
  } else {
    await prisma.staffPermission.deleteMany({
      where: {
        staffId,
        module: COMMS_MODULE,
        action: SEND_OFFICIAL_ACTION,
      },
    })
  }

  return NextResponse.json({ ok: true, staffId, granted })
}
