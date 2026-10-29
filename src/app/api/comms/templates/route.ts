import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { CommsTemplateKind } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canManageTemplates } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

const KINDS: CommsTemplateKind[] = [
  "IHTAR",
  "TALIMAT",
  "PERSONEL_DUYURU",
  "PERSONEL_TALEP",
  "SINIF_DUYURU",
]

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const kind = request.nextUrl.searchParams.get("kind") as CommsTemplateKind | null
  const activeOnly = request.nextUrl.searchParams.get("active") !== "0"

  const templates = await prisma.commsTemplate.findMany({
    where: {
      ...(kind && KINDS.includes(kind) ? { kind } : {}),
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ kind: "asc" }, { title: "asc" }],
  })
  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canManageTemplates(actor.department)) {
    return NextResponse.json({ error: "Şablon yönetimi yalnızca sistem yöneticisine aittir" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const kind = body?.kind as CommsTemplateKind
  const title = String(body?.title || "").trim()
  const text = String(body?.body || "").trim()
  if (!KINDS.includes(kind) || !title || !text) {
    return NextResponse.json({ error: "kind, title ve body zorunlu" }, { status: 400 })
  }

  const template = await prisma.commsTemplate.create({
    data: {
      kind,
      title,
      body: text,
      createdByStaffId: actor.staffId,
    },
  })
  return NextResponse.json({ template }, { status: 201 })
}
