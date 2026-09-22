import { NextRequest, NextResponse } from "next/server"
import type { DayTemplateScope } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  bandToEnum,
  defaultSlotsForBand,
  enumToBand,
  enumToScope,
  kindToDb,
  normalizeSlotKind,
  scopeToEnum,
  toLessonSlots,
  type DaySlotInput,
} from "@/lib/schedules/day-templates"

export const dynamic = "force-dynamic"

async function ensureTemplate(band: "ORTAOKUL" | "LISE", scope: DayTemplateScope) {
  const existing = await prisma.schoolDayTemplate.findUnique({
    where: { band_scope: { band, scope } },
    include: { slots: { orderBy: { sortOrder: "asc" } } },
  })
  if (existing && existing.slots.length > 0) {
    if (scope === "WEEKDAY") {
      const toPromote = existing.slots.filter(
        (s) => s.kind === "LESSON" && normalizeSlotKind("LESSON", s.label) === "ETUT"
      )
      if (toPromote.length > 0) {
        await prisma.schoolDaySlot.updateMany({
          where: { id: { in: toPromote.map((s) => s.id) } },
          data: { kind: "ETUT" },
        })
        return prisma.schoolDayTemplate.findUniqueOrThrow({
          where: { id: existing.id },
          include: { slots: { orderBy: { sortOrder: "asc" } } },
        })
      }
    }
    return existing
  }

  const defaults = defaultSlotsForBand(band, scope)
  if (existing) {
    await prisma.schoolDaySlot.createMany({
      data: defaults.map((slot, index) => ({
        templateId: existing.id,
        sortOrder: index,
        label: slot.label,
        kind: kindToDb(slot.kind),
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    })
    return prisma.schoolDayTemplate.findUniqueOrThrow({
      where: { id: existing.id },
      include: { slots: { orderBy: { sortOrder: "asc" } } },
    })
  }

  return prisma.schoolDayTemplate.create({
    data: {
      band,
      scope,
      slots: {
        create: defaults.map((slot, index) => ({
          sortOrder: index,
          label: slot.label,
          kind: kindToDb(slot.kind),
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      },
    },
    include: { slots: { orderBy: { sortOrder: "asc" } } },
  })
}

function serializeTemplate(template: Awaited<ReturnType<typeof ensureTemplate>>) {
  return {
    band: enumToBand(template.band),
    scope: enumToScope(template.scope),
    slots: toLessonSlots(template.slots),
    updatedAt: template.updatedAt,
  }
}

/** GET /api/schedules/day-templates?band=ortaokul|lise|all&scope=weekday|saturday|all */
export async function GET(request: NextRequest) {
  try {
    const bandParam = (request.nextUrl.searchParams.get("band") || "all").toLowerCase()
    const scopeParam = (request.nextUrl.searchParams.get("scope") || "weekday").toLowerCase()

    if (bandParam === "all" && (scopeParam === "all" || scopeParam === "weekday")) {
      // Geriye uyum: band=all varsayılan olarak hafta içi şablonlarını döner
      const [ortaokul, lise] = await Promise.all([
        ensureTemplate("ORTAOKUL", "WEEKDAY"),
        ensureTemplate("LISE", "WEEKDAY"),
      ])
      return NextResponse.json({
        templates: [serializeTemplate(ortaokul), serializeTemplate(lise)],
      })
    }

    if (bandParam === "all" && scopeParam === "saturday") {
      const [ortaokul, lise] = await Promise.all([
        ensureTemplate("ORTAOKUL", "SATURDAY"),
        ensureTemplate("LISE", "SATURDAY"),
      ])
      return NextResponse.json({
        templates: [serializeTemplate(ortaokul), serializeTemplate(lise)],
      })
    }

    if (bandParam === "all" && scopeParam === "both") {
      const [ow, os, lw, ls] = await Promise.all([
        ensureTemplate("ORTAOKUL", "WEEKDAY"),
        ensureTemplate("ORTAOKUL", "SATURDAY"),
        ensureTemplate("LISE", "WEEKDAY"),
        ensureTemplate("LISE", "SATURDAY"),
      ])
      return NextResponse.json({
        templates: [
          serializeTemplate(ow),
          serializeTemplate(os),
          serializeTemplate(lw),
          serializeTemplate(ls),
        ],
      })
    }

    const band = bandToEnum(bandParam)
    if (!band) {
      return NextResponse.json(
        { error: "band=ortaokul|lise|all olmalı" },
        { status: 400 }
      )
    }

    const scope = scopeToEnum(scopeParam)
    const template = await ensureTemplate(band, scope)
    return NextResponse.json(serializeTemplate(template))
  } catch (error) {
    console.error("Error fetching day templates:", error)
    return NextResponse.json({ error: "Ders saatleri alınamadı" }, { status: 500 })
  }
}

/** PUT /api/schedules/day-templates — body: { band, scope?, slots } */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const band = bandToEnum(String(body.band ?? ""))
    if (!band) {
      return NextResponse.json({ error: "band zorunlu (ortaokul|lise)" }, { status: 400 })
    }
    const scope = scopeToEnum(String(body.scope ?? "weekday"))

    const rawSlots = Array.isArray(body.slots) ? body.slots : []
    const slots: DaySlotInput[] = rawSlots
      .map((row: Record<string, unknown>) => {
        const label = String(row.label ?? "").trim()
        return {
          label,
          kind: normalizeSlotKind(String(row.kind ?? "LESSON"), label),
          startTime: String(row.startTime ?? "").trim(),
          endTime: String(row.endTime ?? "").trim(),
        }
      })
      .filter((s: DaySlotInput) => s.label && s.startTime && s.endTime)

    if (slots.length === 0) {
      return NextResponse.json({ error: "En az bir satır gerekli" }, { status: 400 })
    }

    for (const slot of slots) {
      if (slot.startTime >= slot.endTime) {
        return NextResponse.json(
          { error: `"${slot.label}" için bitiş, başlangıçtan sonra olmalı` },
          { status: 400 }
        )
      }
    }

    const template = await prisma.$transaction(async (tx) => {
      const row = await tx.schoolDayTemplate.upsert({
        where: { band_scope: { band, scope } },
        create: { band, scope },
        update: {},
      })
      await tx.schoolDaySlot.deleteMany({ where: { templateId: row.id } })
      await tx.schoolDaySlot.createMany({
        data: slots.map((slot, index) => ({
          templateId: row.id,
          sortOrder: index,
          label: slot.label,
          kind: kindToDb(slot.kind),
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      })
      return tx.schoolDayTemplate.findUniqueOrThrow({
        where: { id: row.id },
        include: { slots: { orderBy: { sortOrder: "asc" } } },
      })
    })

    return NextResponse.json({
      success: true,
      ...serializeTemplate(template),
    })
  } catch (error) {
    console.error("Error saving day templates:", error)
    return NextResponse.json({ error: "Ders saatleri kaydedilemedi" }, { status: 500 })
  }
}
