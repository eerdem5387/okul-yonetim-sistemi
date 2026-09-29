import { NextResponse } from "next/server"
import { findStudentConflictDetails } from "@/lib/schedules/student-activity-conflicts"
import { gradeLevelLabel } from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

const GRADE_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12] as const

function sheetNameForGrade(level: number): string {
  // Excel sheet adı max 31 karakter
  return `${level}. Sınıf`
}

export async function GET() {
  try {
    const students = await findStudentConflictDetails()
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    const gradeCounts = new Map<number, number>()
    for (const g of GRADE_LEVELS) gradeCounts.set(g, 0)
    let unknownCount = 0
    for (const s of students) {
      if (s.gradeLevel != null && s.gradeLevel >= 5 && s.gradeLevel <= 12) {
        gradeCounts.set(s.gradeLevel, (gradeCounts.get(s.gradeLevel) ?? 0) + 1)
      } else {
        unknownCount += 1
      }
    }

    const summaryRows = [
      ...GRADE_LEVELS.map((g) => ({
        Sınıf: gradeLevelLabel(g),
        "Çakışan öğrenci": gradeCounts.get(g) ?? 0,
      })),
      ...(unknownCount > 0
        ? [{ Sınıf: "Diğer / belirsiz", "Çakışan öğrenci": unknownCount }]
        : []),
      {
        Sınıf: "TOPLAM",
        "Çakışan öğrenci": students.length,
      },
    ]
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
    summaryWs["!cols"] = [{ wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, "Özet")

    type Row = {
      No: number
      Ad: string
      Soyad: string
      Sınıf: string
      Gün: string
      Saat: string
      "1. Atama": string
      "1. Öğretmen": string
      "2. Atama": string
      "2. Öğretmen": string
      "Diğer çakışanlar": string
      "Başvurduğu kulüpler": string
      "Çakışmasız alternatifler": string
    }

    const cols = [
      { wch: 5 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 36 },
      { wch: 18 },
      { wch: 36 },
      { wch: 18 },
      { wch: 40 },
      { wch: 40 },
      { wch: 44 },
    ]

    const emptyHeaders: Row = {
      No: 0,
      Ad: "",
      Soyad: "",
      Sınıf: "",
      Gün: "",
      Saat: "",
      "1. Atama": "",
      "1. Öğretmen": "",
      "2. Atama": "",
      "2. Öğretmen": "",
      "Diğer çakışanlar": "",
      "Başvurduğu kulüpler": "",
      "Çakışmasız alternatifler": "",
    }

    const buildRows = (
      list: typeof students
    ): Row[] => {
      const rows: Row[] = []
      let no = 1
      for (const s of list) {
        const applications = s.applications.map((a) => a.clubName).join(", ")
        const alternatives =
          s.safeAlternatives.length === 0
            ? "—"
            : s.safeAlternatives
                .map((opt) => {
                  const times = opt.schedules
                    .map((sch) => `${sch.dayLabel} ${sch.startTime}–${sch.endTime}`)
                    .join("; ")
                  const name =
                    opt.clubGroupName && opt.clubGroupName !== opt.clubName
                      ? `${opt.clubName} / ${opt.clubGroupName}`
                      : opt.clubName
                  return times ? `${name} (${times})` : name
                })
                .join(" | ")

        const clusters =
          s.clusters.length > 0
            ? s.clusters
            : [
                {
                  dayOfWeek: 0,
                  dayLabel: "—",
                  timeLabel: "—",
                  assignments: s.conflictingAssignments,
                },
              ]

        for (const cluster of clusters) {
          const assignments = cluster.assignments
          const a1 = assignments[0]
          const a2 = assignments[1]
          const rest = assignments.slice(2)
          rows.push({
            No: no++,
            Ad: s.firstName,
            Soyad: s.lastName,
            Sınıf: s.grade,
            Gün: cluster.dayLabel,
            Saat: cluster.timeLabel,
            "1. Atama": a1?.label ?? "",
            "1. Öğretmen": a1?.teacherName ?? "",
            "2. Atama": a2?.label ?? "",
            "2. Öğretmen": a2?.teacherName ?? "",
            "Diğer çakışanlar":
              rest.length === 0
                ? ""
                : rest
                    .map(
                      (a) =>
                        `${a.label}${a.teacherName ? ` (${a.teacherName})` : ""} · ${a.startTime}–${a.endTime}`
                    )
                    .join(" | "),
            "Başvurduğu kulüpler": applications || "—",
            "Çakışmasız alternatifler": alternatives,
          })
        }
      }
      return rows
    }

    for (const g of GRADE_LEVELS) {
      const list = students.filter((s) => s.gradeLevel === g)
      const rows = buildRows(list)
      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [emptyHeaders])
      ws["!cols"] = cols
      XLSX.utils.book_append_sheet(wb, ws, sheetNameForGrade(g))
    }

    const other = students.filter(
      (s) => s.gradeLevel == null || s.gradeLevel < 5 || s.gradeLevel > 12
    )
    if (other.length > 0) {
      const rows = buildRows(other)
      const ws = XLSX.utils.json_to_sheet(rows)
      ws["!cols"] = cols
      XLSX.utils.book_append_sheet(wb, ws, "Diğer")
    }

    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `cakisan-ogrenciler_${dateStr}.xlsx`

    return new NextResponse(Buffer.from(wbout), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error exporting student conflicts:", error)
    return NextResponse.json({ error: "Excel indirilirken hata oluştu" }, { status: 500 })
  }
}
