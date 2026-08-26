import { NextRequest, NextResponse } from "next/server"
import type { StaffDepartment, StaffRetentionOutcome } from "@prisma/client"
import { requireHrRetentionAccess } from "@/lib/hr-retention/access"
import {
  RETENTION_OUTCOMES,
  createRetentionMeeting,
  getRetentionCycleByStaff,
  listRetentionOverview,
} from "@/lib/hr/retention"

export const dynamic = "force-dynamic"

const DEPARTMENTS: StaffDepartment[] = [
  "OGRETMEN",
  "OGRENCI_ISLERI",
  "MUDUR",
  "MUDUR_YARDIMCISI",
  "KURUCU",
  "REHBERLIK",
  "BAS_REHBERLIK",
  "MUHASEBE",
  "GUZEL_SANATLAR",
  "SPOR",
  "KUTUPHANE",
  "TEKNIK",
  "TEMIZLIK",
  "GUVENLIK",
  "DIGER",
]

export async function GET(request: NextRequest) {
  const auth = await requireHrRetentionAccess(request, "view")
  if (auth.response) return auth.response

  const sp = request.nextUrl.searchParams
  const staffId = sp.get("staffId") || undefined
  const targetAcademicYearLabel = sp.get("targetAcademicYearLabel") || undefined
  const department = sp.get("department") as StaffDepartment | null
  const search = sp.get("search") || undefined
  const outcomeRaw = sp.get("outcome")

  let outcome: StaffRetentionOutcome | "NO_MEETING" | undefined
  if (outcomeRaw === "NO_MEETING") outcome = "NO_MEETING"
  else if (outcomeRaw && RETENTION_OUTCOMES.includes(outcomeRaw as StaffRetentionOutcome)) {
    outcome = outcomeRaw as StaffRetentionOutcome
  }

  if (staffId) {
    const cycle = await getRetentionCycleByStaff(staffId, targetAcademicYearLabel)
    return NextResponse.json({ cycle })
  }

  const data = await listRetentionOverview({
    targetAcademicYearLabel,
    department: department && DEPARTMENTS.includes(department) ? department : undefined,
    search,
    outcome,
  })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireHrRetentionAccess(request, "create")
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })

  const { staffId, meetingAt, outcome, notes, targetAcademicYearId, targetAcademicYearLabel } =
    body as {
      staffId?: string
      meetingAt?: string
      outcome?: StaffRetentionOutcome
      notes?: string | null
      targetAcademicYearId?: string | null
      targetAcademicYearLabel?: string
    }

  if (!staffId) return NextResponse.json({ error: "staffId zorunlu" }, { status: 400 })
  if (!meetingAt) return NextResponse.json({ error: "Görüşme tarihi zorunlu" }, { status: 400 })
  if (!outcome || !RETENTION_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "Geçersiz görüşme sonucu" }, { status: 400 })
  }

  const meetingDate = new Date(meetingAt)
  if (Number.isNaN(meetingDate.getTime())) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 })
  }

  try {
    const result = await createRetentionMeeting({
      staffId,
      meetingAt: meetingDate,
      outcome,
      notes: notes ?? null,
      conductedById: auth.actor!.staffId,
      targetAcademicYearId: targetAcademicYearId ?? null,
      targetAcademicYearLabel,
    })
    const cycle = await getRetentionCycleByStaff(staffId, targetAcademicYearLabel)
    return NextResponse.json({ ...result, cycle }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kayıt oluşturulamadı" },
      { status: 400 }
    )
  }
}
