import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/auth/api-guard"
import { checkStudentClubAdd } from "@/lib/clubs/student-club-add-check"

/**
 * GET /api/clubs/[id]/students/check?studentId=...
 * Öğrenciyi kulübe eklemeden önce etüt (ÖÇG), diğer kulüpler ve sınıf denemeleriyle
 * saat çakışmasını kontrol eder; çakışma varsa uygun alternatif kulüpleri önerir.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authGuard = await requireStaff(request)
  if (!authGuard.ok) return authGuard.response

  const { id } = await context.params
  const studentId = request.nextUrl.searchParams.get("studentId")?.trim()
  if (!studentId) {
    return NextResponse.json({ error: "studentId gerekli" }, { status: 400 })
  }

  try {
    const result = await checkStudentClubAdd({ studentId, clubId: id })
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error checking club add conflicts:", error)
    return NextResponse.json({ error: "Çakışma kontrolü yapılamadı" }, { status: 500 })
  }
}
