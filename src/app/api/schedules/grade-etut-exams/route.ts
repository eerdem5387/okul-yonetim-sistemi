import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertEtutSlotTimes,
  listGradeEtutExams,
} from "@/lib/schedules/grade-etut-exams"
import { DENEME_SINAVI_SUBJECT, normalizeTime } from "@/lib/schedules/lesson-slots"
import { loadEtutSlots } from "@/lib/schedules/club-schedule"

export const dynamic = "force-dynamic"

/** GET /api/schedules/grade-etut-exams */
export async function GET() {
  try {
    const [exams, etutSlots] = await Promise.all([
      listGradeEtutExams(),
      loadEtutSlots(),
    ])
    return NextResponse.json({ exams, etutSlots })
  } catch (error) {
    console.error("[grade-etut-exams GET]", error)
    return NextResponse.json({ error: "Deneme programı alınamadı" }, { status: 500 })
  }
}

type SlotBody = { startTime: string; endTime: string }

/**
 * POST /api/schedules/grade-etut-exams
 * { grade, dayOfWeek, slots?: [{startTime,endTime}], allEtutSlots?: boolean, title?, notes? }
 * allEtutSlots=true → o günün tüm etüt saatlerine deneme yazar.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const grade = Number(body.grade)
    const dayOfWeek = Number(body.dayOfWeek)
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : DENEME_SINAVI_SUBJECT
    const notes =
      typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null

    if (!Number.isInteger(grade) || grade < 5 || grade > 12) {
      return NextResponse.json({ error: "Sınıf düzeyi 5–12 olmalı" }, { status: 400 })
    }
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 5) {
      return NextResponse.json(
        { error: "Gün Pazartesi–Cuma (1–5) olmalı" },
        { status: 400 }
      )
    }

    let slots: SlotBody[] = Array.isArray(body.slots)
      ? body.slots.map((s: SlotBody) => ({
          startTime: normalizeTime(String(s.startTime ?? "")),
          endTime: normalizeTime(String(s.endTime ?? "")),
        }))
      : []

    if (body.allEtutSlots === true || slots.length === 0) {
      const etuts = await loadEtutSlots()
      if (etuts.length === 0) {
        return NextResponse.json(
          { error: "Önce Ders saatleri’nde etüt satırı tanımlayın." },
          { status: 400 }
        )
      }
      // Band’a göre filtrele: ortaokul 5–8, lise 9–12
      const band = grade <= 8 ? "ortaokul" : "lise"
      const bandSlots = etuts.filter((e) => e.band === band)
      const source = bandSlots.length > 0 ? bandSlots : etuts
      const seen = new Set<string>()
      slots = []
      for (const e of source) {
        const key = `${normalizeTime(e.startTime)}|${normalizeTime(e.endTime)}`
        if (seen.has(key)) continue
        seen.add(key)
        slots.push({
          startTime: normalizeTime(e.startTime),
          endTime: normalizeTime(e.endTime),
        })
      }
    }

    if (slots.length === 0) {
      return NextResponse.json({ error: "En az bir etüt saati gerekli" }, { status: 400 })
    }

    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        return NextResponse.json({ error: "Saat bilgisi eksik" }, { status: 400 })
      }
      const etutErr = await assertEtutSlotTimes(slot.startTime, slot.endTime)
      if (etutErr) {
        return NextResponse.json({ error: etutErr }, { status: 400 })
      }
    }

    const created = await prisma.$transaction(
      slots.map((slot) =>
        prisma.gradeEtutExam.upsert({
          where: {
            grade_dayOfWeek_startTime_endTime: {
              grade,
              dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
          },
          create: {
            grade,
            dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            title,
            notes,
            isActive: true,
          },
          update: {
            title,
            notes,
            isActive: true,
          },
        })
      )
    )

    return NextResponse.json({ exams: created }, { status: 201 })
  } catch (error) {
    console.error("[grade-etut-exams POST]", error)
    return NextResponse.json({ error: "Deneme kaydedilemedi" }, { status: 500 })
  }
}
