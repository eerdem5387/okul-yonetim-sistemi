import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assignStudentToClubGroup,
  findStudentConflictDetails,
  removeStudentFromAssignment,
  resolveStudentConflict,
} from "@/lib/schedules/student-activity-conflicts"

export const dynamic = "force-dynamic"

/**
 * GET /api/schedules/student-conflicts?grade=7
 * Öğrenci merkezli çakışmalar: başvurular, çakışan atamalar, güvenli alternatifler.
 */
export async function GET(request: NextRequest) {
  try {
    const gradeParam = request.nextUrl.searchParams.get("grade")
    const gradeFilter = gradeParam ? parseInt(gradeParam, 10) : null

    const all = await findStudentConflictDetails()
    const students =
      gradeFilter && Number.isFinite(gradeFilter)
        ? all.filter((s) => s.gradeLevel === gradeFilter)
        : all

    const gradeCounts: Record<string, number> = {}
    for (let g = 5; g <= 12; g++) gradeCounts[String(g)] = 0
    for (const s of all) {
      if (s.gradeLevel != null && s.gradeLevel >= 5 && s.gradeLevel <= 12) {
        gradeCounts[String(s.gradeLevel)] += 1
      }
    }

    return NextResponse.json({
      count: students.length,
      totalCount: all.length,
      gradeCounts,
      students,
      // Eski UI uyumluluğu
      conflicts: students.flatMap((s) =>
        s.clusters.map((c) => ({
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          grade: s.grade,
          dayOfWeek: c.dayOfWeek,
          dayLabel: c.dayLabel,
          timeLabel: c.timeLabel,
          assignments: c.assignments,
        }))
      ),
    })
  } catch (error) {
    console.error("Error finding student conflicts:", error)
    return NextResponse.json({ error: "Çakışmalar alınamadı" }, { status: 500 })
  }
}

/**
 * POST /api/schedules/student-conflicts
 *
 * action: "exclude_day" → { studentId, assignmentKey }  — yalnızca o kulüp saatinden muaf
 * action: "leave_group" → { studentId, assignmentKey }  — gruptan/seçimden tamamen çıkar
 * action: "remove"      → { studentId, assignmentKey, mode? }  — mode: exclude_day|leave_group
 * action: "assign"      → { studentId, clubGroupId }
 * (eski) keep/remove → { studentId, keepKey, removeKeys }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? "").trim()
    const studentId = String(body.studentId ?? "").trim()

    if (!studentId) {
      return NextResponse.json({ error: "studentId zorunludur" }, { status: 400 })
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    })
    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
    }

    const runRemove = async (mode: "exclude_day" | "leave_group") => {
      const assignmentKey = String(body.assignmentKey ?? "").trim()
      if (!assignmentKey) {
        return NextResponse.json({ error: "assignmentKey zorunludur" }, { status: 400 })
      }
      const result = await removeStudentFromAssignment({
        studentId,
        assignmentKey,
        mode,
      })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: result.removed, mode })
    }

    if (action === "exclude_day") {
      return runRemove("exclude_day")
    }
    if (action === "leave_group") {
      return runRemove("leave_group")
    }

    if (action === "remove") {
      const modeRaw = String(body.mode ?? "exclude_day").trim()
      const mode =
        modeRaw === "leave_group" ? ("leave_group" as const) : ("exclude_day" as const)
      // ÖÇG için leave_group zorunlu (exclude anlamsız)
      const assignmentKey = String(body.assignmentKey ?? "").trim()
      const effectiveMode = assignmentKey.startsWith("STUDY_GROUP:")
        ? ("leave_group" as const)
        : mode
      return runRemove(effectiveMode)
    }

    if (action === "assign") {
      const clubGroupId = String(body.clubGroupId ?? "").trim()
      if (!clubGroupId) {
        return NextResponse.json({ error: "clubGroupId zorunludur" }, { status: 400 })
      }
      const result = await assignStudentToClubGroup({ studentId, clubGroupId })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: result.assigned })
    }

    // Eski akış
    const keepKey = String(body.keepKey ?? "").trim()
    const removeKeys = Array.isArray(body.removeKeys)
      ? body.removeKeys.map((k: unknown) => String(k).trim()).filter(Boolean)
      : []

    if (!keepKey) {
      return NextResponse.json(
        { error: "action (exclude_day|leave_group|remove|assign) veya keepKey zorunludur" },
        { status: 400 }
      )
    }
    if (removeKeys.length === 0) {
      return NextResponse.json(
        { error: "Çıkarılacak en az bir atama seçin" },
        { status: 400 }
      )
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
