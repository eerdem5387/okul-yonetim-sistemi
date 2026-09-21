import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  bandToEnum,
  defaultSlotsForBand,
  enumToBand,
  toLessonSlots,
  type DaySlotInput,
} from "@/lib/schedules/day-templates"

export const dynamic = "force-dynamic"

async function ensureTemplate(band: "ORTAOKUL" | "LISE") {
  const existing = await prisma.schoolDayTemplate.findUnique({
    where: { band },
    include: { slots: { orderBy: { sortOrder: "asc" } } },
  })
  if (existing && existing.slots.length > 0) return existing

  const defaults = defaultSlotsForBand(band)
  if (existing) {
    await prisma.schoolDaySlot.createMany({
      data: defaults.map((slot, index) => ({
        templateId: existing.id,
        sortOrder: index,
        label: slot.label,
        kind: slot.kind === "BREAK" ? "BREAK" : "LESSON",
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
      slots: {
        create: defaults.map((slot, index) => ({
          sortOrder: index,
          label: slot.label,
          kind: slot.kind === "BREAK" ? "BREAK" : "LESSON",
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      },
    },
    include: { slots: { orderBy: { sortOrder: "asc" } } },
  })
}

/** GET /api/schedules/day-templates?band=ortaokul|lise|all */
export async function GET(request: NextRequest) {
  try {
    const bandParam = (request.nextUrl.searchParams.get("band") || "all").toLowerCase()

    if (bandParam === "all") {
      const [ortaokul, lise] = await Promise.all([
        ensureTemplate("ORTAOKUL"),
        ensureTemplate("LISE"),
      ])
      return NextResponse.json({
        templates: [
          {
            band: enumToBand(ortaokul.band),
            slots: toLessonSlots(ortaokul.slots),
            updatedAt: ortaokul.updatedAt,
          },
          {
            band: enumToBand(lise.band),
            slots: toLessonSlots(lise.slots),
            updatedAt: lise.updatedAt,
          },
        ],
      })
    }

    const band = bandToEnum(bandParam)
    if (!band) {
      return NextResponse.json({ error: "band=ortaokul|lise|all olmalı" }, { status: 400 })
    }

    const template = await ensureTemplate(band)
    return NextResponse.json({
      band: enumToBand(template.band),
      slots: toLessonSlots(template.slots),
      updatedAt: template.updatedAt,
    })
  } catch (error) {
    console.error("Error fetching day templates:", error)
    return NextResponse.json({ error: "Ders saatleri alınamadı" }, { status: 500 })
  }
}

/** PUT /api/schedules/day-templates — body: { band, slots: [{label, kind, startTime, endTime}] } */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const band = bandToEnum(String(body.band ?? ""))
    if (!band) {
      return NextResponse.json({ error: "band zorunlu (ortaokul|lise)" }, { status: 400 })
    }

    const rawSlots = Array.isArray(body.slots) ? body.slots : []
    const slots: DaySlotInput[] = rawSlots
      .map((row: Record<string, unknown>) => ({
        label: String(row.label ?? "").trim(),
        kind: String(row.kind ?? "LESSON").toUpperCase() === "BREAK" ? "BREAK" : "LESSON",
        startTime: String(row.startTime ?? "").trim(),
        endTime: String(row.endTime ?? "").trim(),
      }))
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
        where: { band },
        create: { band },
        update: {},
      })
      await tx.schoolDaySlot.deleteMany({ where: { templateId: row.id } })
      await tx.schoolDaySlot.createMany({
        data: slots.map((slot, index) => ({
          templateId: row.id,
          sortOrder: index,
          label: slot.label,
          kind: slot.kind === "BREAK" ? "BREAK" : "LESSON",
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
      band: enumToBand(template.band),
      slots: toLessonSlots(template.slots),
      updatedAt: template.updatedAt,
    })
  } catch (error) {
    console.error("Error saving day templates:", error)
    return NextResponse.json({ error: "Ders saatleri kaydedilemedi" }, { status: 500 })
  }
}
