import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  findStudentActivityConflicts,
  resolveStudentConflict,
} from "@/lib/schedules/student-activity-conflicts"

export const dynamic = "force-dynamic"

/** GET /api/schedules/student-conflicts — kulüp ↔ kulüp ve kulüp ↔ ÖÇG öğrenci çakışmaları */
export async function GET() {
  try {
    const conflicts = await findStudentActivityConflicts()
    return NextResponse.json({
      count: conflicts.length,
      conflicts,
    })
  } catch (error) {
    console.error("Error finding student conflicts:", error)
    return NextResponse.json({ error: "Çakışmalar alınamadı" }, { status: 500 })
  }
}

/**
 * POST /api/schedules/student-conflicts
 * { studentId, keepKey, removeKeys: string[] }
 * keepKey dışındaki atamalardan öğrenciyi çıkarır.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const studentId = String(body.studentId ?? "").trim()
    const keepKey = String(body.keepKey ?? "").trim()
    const removeKeys = Array.isArray(body.removeKeys)
      ? body.removeKeys.map((k: unknown) => String(k).trim()).filter(Boolean)
      : []

    if (!studentId || !keepKey) {
      return NextResponse.json(
        { error: "studentId ve keepKey zorunludur" },
        { status: 400 }
      )
    }
    if (removeKeys.length === 0) {
      return NextResponse.json(
        { error: "Çıkarılacak en az bir atama seçin" },
        { status: 400 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    })
    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
    }

    const result = await resolveStudentConflict({
      studentId,
      keepKey,
      removeKeys,
    })

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
      message:
        result.removed.length > 0
          ? `${result.removed.length} atamadan çıkarıldı`
          : "Değişiklik yapılmadı",
    })
  } catch (error) {
    console.error("Error resolving student conflict:", error)
    return NextResponse.json({ error: "Çakışma çözülemedi" }, { status: 500 })
  }
}
