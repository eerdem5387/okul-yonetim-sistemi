import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { k12GradeWhereClause, parseStudentGradeLevel } from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

function sortGrades(a: string, b: string): number {
  const la = parseStudentGradeLevel(a)
  const lb = parseStudentGradeLevel(b)
  if (la != null && lb != null && la !== lb) return la - lb
  return a.localeCompare(b, "tr")
}

export async function GET() {
  try {
    const [students, selections] = await Promise.all([
      prisma.student.findMany({
        where: k12GradeWhereClause(),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tcNumber: true,
          grade: true,
        },
        orderBy: [{ grade: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.clubSelection.findMany({
        include: {
          club: { select: { name: true } },
        },
      }),
    ])

    const clubsByStudent = new Map<string, string[]>()
    for (const row of selections) {
      const list = clubsByStudent.get(row.studentId) ?? []
      list.push(row.club.name)
      clubsByStudent.set(row.studentId, list)
    }

    const studentRows = students.map((student) => {
      const clubs = clubsByStudent.get(student.id) ?? []
      return {
        Sınıf: student.grade,
        Ad: student.firstName,
        Soyad: student.lastName,
        TC: student.tcNumber,
        Kulüp: clubs.join(", "),
        Durum: clubs.length > 0 ? "Seçim yaptı" : "Seçim yapmadı",
      }
    })

    studentRows.sort((a, b) => {
      const gradeCmp = sortGrades(a.Sınıf, b.Sınıf)
      if (gradeCmp !== 0) return gradeCmp
      const last = a.Soyad.localeCompare(b.Soyad, "tr")
      if (last !== 0) return last
      return a.Ad.localeCompare(b.Ad, "tr")
    })

    const gradeTotals = new Map<string, { total: number; selected: number; unassigned: number }>()
    for (const student of students) {
      const entry = gradeTotals.get(student.grade) ?? { total: 0, selected: 0, unassigned: 0 }
      entry.total += 1
      if ((clubsByStudent.get(student.id) ?? []).length > 0) entry.selected += 1
      else entry.unassigned += 1
      gradeTotals.set(student.grade, entry)
    }

    const summaryRows = [...gradeTotals.entries()]
      .sort((a, b) => sortGrades(a[0], b[0]))
      .map(([grade, stats]) => ({
        Sınıf: grade,
        "Toplam Öğrenci": stats.total,
        "Seçim Yapan": stats.selected,
        "Seçim Yapmayan": stats.unassigned,
        "Eksik Oranı (%)":
          stats.total > 0 ? Math.round((stats.unassigned / stats.total) * 100) : 0,
      }))

    const unassignedRows = studentRows
      .filter((row) => row.Durum === "Seçim yapmadı")
      .map(({ Sınıf, Ad, Soyad, TC }) => ({ Sınıf, Ad, Soyad, TC }))

    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    const studentsWs = XLSX.utils.json_to_sheet(studentRows)
    studentsWs["!cols"] = [
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 36 },
      { wch: 16 },
    ]
    XLSX.utils.book_append_sheet(wb, studentsWs, "Öğrenci Kulüp Listesi")

    const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
    summaryWs["!cols"] = [
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, summaryWs, "Sınıf Özeti")

    const unassignedWs = XLSX.utils.json_to_sheet(
      unassignedRows.length > 0
        ? unassignedRows
        : [{ Sınıf: "", Ad: "", Soyad: "", TC: "" }]
    )
    unassignedWs["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, unassignedWs, "Seçim Yapmayanlar")

    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `kulup-sinif-verileri_${dateStr}.xlsx`

    return new NextResponse(Buffer.from(wbout), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error exporting club data by grade:", error)
    return NextResponse.json({ error: "Excel indirilirken hata oluştu" }, { status: 500 })
  }
}
