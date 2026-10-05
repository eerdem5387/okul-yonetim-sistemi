import { readFileSync, existsSync, writeFileSync } from "fs"
import { join } from "path"
import { PrismaClient } from "@prisma/client"
import * as XLSX from "xlsx"

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

const prisma = new PrismaClient()
const DAY = 1

function teacherLabel(t: { firstName: string; lastName: string } | null | undefined) {
  if (!t) return ""
  return `${t.firstName} ${t.lastName}`.trim()
}

function studentName(s: { firstName: string; lastName: string }) {
  return `${s.firstName} ${s.lastName}`.trim()
}

async function main() {
  const [clubSchedules, studySessions] = await Promise.all([
    prisma.clubSchedule.findMany({
      where: {
        isActive: true,
        dayOfWeek: DAY,
        OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
        clubGroup: { select: { id: true, name: true } },
        exclusions: { select: { studentId: true } },
      },
      orderBy: [{ startTime: "asc" }],
    }),
    prisma.studyGroupSession.findMany({
      where: { isActive: true, dayOfWeek: DAY },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        studyGroup: {
          select: {
            name: true,
            isActive: true,
            students: {
              select: {
                student: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: [{ startTime: "asc" }],
    }),
  ])

  type Row = { name: string; teacher: string; room: string; students: string[] }
  const rows: Row[] = []

  for (const sch of clubSchedules) {
    const excluded = new Set(sch.exclusions.map((e) => e.studentId))
    let students: { firstName: string; lastName: string }[] = []
    if (sch.clubGroupId) {
      const members = await prisma.clubGroupStudent.findMany({
        where: { clubGroupId: sch.clubGroupId },
        select: {
          studentId: true,
          student: { select: { firstName: true, lastName: true } },
        },
      })
      students = members.filter((m) => !excluded.has(m.studentId)).map((m) => m.student)
    } else {
      const selections = await prisma.clubSelection.findMany({
        where: { clubId: sch.club.id },
        select: {
          studentId: true,
          student: { select: { firstName: true, lastName: true } },
        },
      })
      students = selections.filter((s) => !excluded.has(s.studentId)).map((s) => s.student)
    }
    students.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "tr")
    )
    const label = sch.clubGroup?.name
      ? `${sch.club.name} (${sch.clubGroup.name})`
      : sch.club.name
    rows.push({
      name: label,
      teacher: teacherLabel(sch.club.instructor),
      room: sch.room?.trim() || "",
      students: students.map(studentName),
    })
  }

  for (const sess of studySessions) {
    if (!sess.studyGroup?.isActive) continue
    const students = [...sess.studyGroup.students.map((m) => m.student)].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "tr")
    )
    rows.push({
      name: sess.studyGroup.name,
      teacher: teacherLabel(sess.teacher),
      room: sess.room?.trim() || "",
      students: students.map(studentName),
    })
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, "tr"))

  const maxStudents = Math.max(0, ...rows.map((r) => r.students.length))
  const headers = ["Kulüp/ÖÇG ismi", "Öğretmen", "Derslik"]
  for (let i = 1; i <= maxStudents; i++) headers.push(`Öğr${i}`)

  const aoa: string[][] = [headers]
  for (const r of rows) {
    const line = [r.name, r.teacher, r.room]
    for (let i = 0; i < maxStudents; i++) line.push(r.students[i] || "")
    aoa.push(line)
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws["!cols"] = [
    { wch: 28 },
    { wch: 22 },
    { wch: 12 },
    ...Array.from({ length: maxStudents }, () => ({ wch: 18 })),
  ]
  XLSX.utils.book_append_sheet(wb, ws, "Pazartesi")

  const out = join(
    "/Users/emreerdem/Desktop",
    `pazartesi-kulup-ocg-${new Date().toISOString().slice(0, 10)}.xlsx`
  )
  writeFileSync(out, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
  console.log("OK", rows.length, out)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
