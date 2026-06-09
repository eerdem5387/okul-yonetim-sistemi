import { NextRequest, NextResponse } from "next/server"
import type { StaffDepartment, StaffRetentionOutcome } from "@prisma/client"
import * as XLSX from "xlsx"
import { requireHrRetentionAccess } from "@/lib/hr-retention/access"
import { RETENTION_OUTCOME_LABELS, RETENTION_OUTCOMES, listRetentionOverview } from "@/lib/hr/retention"
import { STAFF_DEPARTMENT_LABELS } from "@/lib/hr/constants"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireHrRetentionAccess(request, "export")
  if (auth.response) return auth.response

  const sp = request.nextUrl.searchParams
  const department = sp.get("department") as StaffDepartment | null
  const search = sp.get("search") || undefined
  const outcomeRaw = sp.get("outcome")

  let outcome: StaffRetentionOutcome | "NO_MEETING" | undefined
  if (outcomeRaw === "NO_MEETING") outcome = "NO_MEETING"
  else if (outcomeRaw && RETENTION_OUTCOMES.includes(outcomeRaw as StaffRetentionOutcome)) {
    outcome = outcomeRaw as StaffRetentionOutcome
  }

  const data = await listRetentionOverview({ department: department ?? undefined, search, outcome })

  const rows = data.rows.map((row) => ({
    Ad: row.staff.firstName,
    Soyad: row.staff.lastName,
    Departman: STAFF_DEPARTMENT_LABELS[row.staff.department],
    Branş: row.staff.subject ?? "",
    "Hedef Yıl": data.targetYear ?? "",
    "Son Görüşme": row.lastMeeting
      ? new Date(row.lastMeeting.meetingAt).toLocaleString("tr-TR")
      : "",
    Sonuç: row.cycle?.currentOutcome
      ? RETENTION_OUTCOME_LABELS[row.cycle.currentOutcome]
      : "Görüşme Yapılmadı",
    "Görüşmeyi Yapan": row.lastMeeting?.conductedBy
      ? `${row.lastMeeting.conductedBy.firstName} ${row.lastMeeting.conductedBy.lastName}`
      : "",
    Notlar: row.lastMeeting?.notes ?? "",
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, "Personel Görüşmeleri")
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="personel-gorusmeleri.xlsx"`,
    },
  })
}
