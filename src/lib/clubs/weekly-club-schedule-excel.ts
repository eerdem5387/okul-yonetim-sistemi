import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { DAY_NAMES, WEEKDAY_INDEXES } from "@/lib/schedules/lesson-slots"

type TeacherCol = {
  id: string
  name: string
  byDay: Map<number, string[]>
}

function clubLabel(row: {
  club: { name: string }
  clubGroup: { name: string } | null
}): string {
  const clubName = row.club.name.trim() || "Kulüp"
  const groupName = row.clubGroup?.name?.trim()
  if (groupName && groupName !== clubName) return `${clubName} (${groupName})`
  return clubName
}

async function loadTeacherColumns(): Promise<TeacherCol[]> {
  const schedules = await prisma.clubSchedule.findMany({
    where: {
      isActive: true,
      OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
    },
    select: {
      dayOfWeek: true,
      instructorId: true,
      instructor: { select: { id: true, firstName: true, lastName: true } },
      club: {
        select: {
          name: true,
          instructorId: true,
          instructor: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      clubGroup: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  const teacherMap = new Map<string, TeacherCol>()

  for (const row of schedules) {
    const staff = row.instructor ?? row.club.instructor
    const staffId = row.instructorId || row.club.instructorId || staff?.id
    if (!staffId || !staff) continue
    if (!WEEKDAY_INDEXES.includes(row.dayOfWeek as (typeof WEEKDAY_INDEXES)[number])) continue

    const name = `${staff.firstName} ${staff.lastName}`.trim()
    let col = teacherMap.get(staffId)
    if (!col) {
      col = { id: staffId, name, byDay: new Map() }
      teacherMap.set(staffId, col)
    }

    const label = clubLabel(row)
    const list = col.byDay.get(row.dayOfWeek) ?? []
    if (!list.includes(label)) list.push(label)
    col.byDay.set(row.dayOfWeek, list)
  }

  return [...teacherMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { sensitivity: "base" }),
  )
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF94A3B8" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
}

function styleHeaderCell(cell: ExcelJS.Cell, fillArgb: string) {
  cell.font = { bold: true, size: 11, color: { argb: "FF0F172A" }, name: "Calibri" }
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } }
  cell.border = thinBorder
}

function styleDayCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 11, color: { argb: "FF064E3B" }, name: "Calibri" }
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } }
  cell.border = thinBorder
}

function styleBodyCell(cell: ExcelJS.Cell) {
  cell.font = { bold: false, size: 10, color: { argb: "FF0F172A" }, name: "Calibri" }
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } }
  cell.border = thinBorder
}

/** Öğretmen × gün haftalık kulüp programı Excel buffer’ı. */
export async function generateWeeklyClubScheduleExcel(): Promise<Buffer> {
  const teachers = await loadTeacherColumns()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Levent Yönetim"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Haftalık Kulüp Programı", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 2, showGridLines: false }],
    properties: { defaultRowHeight: 22 },
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  })

  const colCount = Math.max(teachers.length, 1) + 1

  // Title row
  sheet.mergeCells(1, 1, 1, colCount)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = "Haftalık Kulüp Programı"
  titleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" }, name: "Calibri" }
  titleCell.alignment = { vertical: "middle", horizontal: "center" }
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
  sheet.getRow(1).height = 28

  // Header: empty corner + teachers
  const headerRow = sheet.getRow(2)
  headerRow.height = 32
  const corner = headerRow.getCell(1)
  corner.value = "Gün"
  styleHeaderCell(corner, "FFE2E8F0")

  if (teachers.length === 0) {
    const empty = headerRow.getCell(2)
    empty.value = "Kulüp atanmış öğretmen yok"
    styleHeaderCell(empty, "FFDBEAFE")
    for (const day of WEEKDAY_INDEXES) {
      const rowIndex = 2 + (day as number) // day 1 → row 3... wait WEEKDAY starts at 1
      const r = sheet.getRow(2 + WEEKDAY_INDEXES.indexOf(day) + 1)
      r.height = 36
      const dayCell = r.getCell(1)
      dayCell.value = DAY_NAMES[day]
      styleDayCell(dayCell)
      const body = r.getCell(2)
      body.value = ""
      styleBodyCell(body)
    }
  } else {
    teachers.forEach((t, i) => {
      const cell = headerRow.getCell(i + 2)
      cell.value = t.name
      styleHeaderCell(cell, "FFDBEAFE")
    })

    WEEKDAY_INDEXES.forEach((day, dayIdx) => {
      const r = sheet.getRow(3 + dayIdx)
      r.height = 40
      const dayCell = r.getCell(1)
      dayCell.value = DAY_NAMES[day]
      styleDayCell(dayCell)

      teachers.forEach((t, i) => {
        const cell = r.getCell(i + 2)
        const clubs = t.byDay.get(day) ?? []
        cell.value = clubs.length ? clubs.join("\n") : ""
        styleBodyCell(cell)
      })
    })
  }

  sheet.getColumn(1).width = 14
  for (let c = 2; c <= colCount; c++) {
    sheet.getColumn(c).width = 18
  }

  // Light outer title border under header
  for (let c = 1; c <= colCount; c++) {
    const cell = sheet.getCell(2, c)
    cell.border = {
      ...thinBorder,
      bottom: { style: "medium", color: { argb: "FF64748B" } },
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
