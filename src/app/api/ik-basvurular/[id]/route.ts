import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireHrRecruitmentAccess } from "@/lib/hr-recruitment/access"
import { normalizeManualPhone } from "@/lib/hr-recruitment/manual-application"
import type { HrApplicationStatus } from "@prisma/client"

const VALID_STATUSES: HrApplicationStatus[] = [
  "YENI",
  "INCELENDI",
  "GORUSME",
  "RED",
  "ISE_ALINDI",
]

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireHrRecruitmentAccess(request, "view")
  if (gate.response) return gate.response

  try {
    const { id } = await context.params
    const application = await prisma.hrJobApplication.findUnique({ where: { id } })
    if (!application) {
      return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 })
    }
    return NextResponse.json({ application })
  } catch (error) {
    console.error("[ik-basvurular/id] GET error:", error)
    return NextResponse.json({ error: "Başvuru yüklenemedi" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireHrRecruitmentAccess(request, "edit")
  if (gate.response) return gate.response

  try {
    const { id } = await context.params
    const body = await request.json()
    const data: {
      status?: HrApplicationStatus
      internalNote?: string | null
      phone?: string
    } = {}

    if (body.phone !== undefined) {
      const existing = await prisma.hrJobApplication.findUnique({
        where: { id },
        select: { source: true },
      })
      if (!existing) {
        return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 })
      }
      if (existing.source !== "MANUAL") {
        return NextResponse.json(
          { error: "Telefon yalnızca manuel kayıtlarda düzenlenebilir" },
          { status: 400 }
        )
      }
      try {
        const raw = typeof body.phone === "string" ? body.phone : ""
        data.phone = raw.trim() ? normalizeManualPhone(raw) : "—"
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Geçersiz telefon" },
          { status: 400 }
        )
      }
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 })
      }
      data.status = body.status
    }

    if (body.internalNote !== undefined) {
      data.internalNote =
        typeof body.internalNote === "string" && body.internalNote.trim()
          ? body.internalNote.trim()
          : null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 })
    }

    const application = await prisma.hrJobApplication.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, application })
  } catch (error) {
    console.error("[ik-basvurular/id] PATCH error:", error)
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 })
    }
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireHrRecruitmentAccess(request, "delete")
  if (gate.response) return gate.response

  try {
    const { id } = await context.params
    await prisma.hrJobApplication.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ik-basvurular/id] DELETE error:", error)
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 })
    }
    return NextResponse.json({ error: "Silme başarısız" }, { status: 500 })
  }
}
