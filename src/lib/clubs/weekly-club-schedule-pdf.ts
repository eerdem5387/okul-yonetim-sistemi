import { prisma } from "@/lib/prisma"
import { generatePDF } from "@/lib/pdf-generator"
import { DAY_NAMES, WEEKDAY_INDEXES } from "@/lib/schedules/lesson-slots"

type TeacherCol = {
  id: string
  name: string
  /** dayOfWeek → club labels that day */
  byDay: Map<number, string[]>
}

const TEACHERS_PER_PAGE = 8

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function buildMatrixHtml(teachers: TeacherCol[], pageIndex: number, pageCount: number): string {
  const title =
    pageCount > 1
      ? `Haftalık Kulüp Programı (${pageIndex + 1}/${pageCount})`
      : "Haftalık Kulüp Programı"

  const headCells = teachers
    .map(
      (t) =>
        `<th class="teacher">${escapeHtml(t.name)}</th>`,
    )
    .join("")

  const bodyRows = WEEKDAY_INDEXES.map((day) => {
    const dayLabel = DAY_NAMES[day] ?? `Gün ${day}`
    const cells = teachers
      .map((t) => {
        const clubs = t.byDay.get(day) ?? []
        const content =
          clubs.length === 0
            ? ""
            : clubs.map((c) => `<div class="club">${escapeHtml(c)}</div>`).join("")
        return `<td class="slot">${content}</td>`
      })
      .join("")
    return `<tr><th class="day">${escapeHtml(dayLabel)}</th>${cells}</tr>`
  }).join("")

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      color: #0f172a;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 6px 5px;
      vertical-align: middle;
      text-align: center;
      font-size: 11px;
      line-height: 1.25;
    }
    th.corner {
      width: 88px;
      background: #e2e8f0;
    }
    th.teacher {
      background: #dbeafe;
      font-weight: 700;
      font-size: 11px;
      word-break: break-word;
    }
    th.day {
      background: #ecfdf5;
      font-weight: 700;
      width: 88px;
      text-align: left;
      padding-left: 8px;
    }
    td.slot {
      background: #f0fdf4;
      min-height: 42px;
    }
    .club + .club { margin-top: 4px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table>
    <thead>
      <tr>
        <th class="corner"></th>
        ${headCells}
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</body>
</html>`
}

/** Kulüp programından öğretmen × gün matrisi PDF’i üretir. */
export async function generateWeeklyClubSchedulePdf(): Promise<Buffer> {
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

  const teachers = [...teacherMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { sensitivity: "base" }),
  )

  if (teachers.length === 0) {
    const emptyHtml = buildMatrixHtml([], 0, 1).replace(
      "</h1>",
      "</h1><p style=\"text-align:center;color:#64748b;font-size:12px\">Kulüp atanmış öğretmen bulunamadı.</p>",
    )
    const pdf = await generatePDF(emptyHtml, {
      landscape: true,
      disableGlobalLogo: true,
      margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
    })
    return Buffer.from(pdf)
  }

  const pages = chunk(teachers, TEACHERS_PER_PAGE)
  // Puppeteer page.pdf is one document per call — merge via multiple HTML sections on one long page
  // Better: one HTML with page-break between matrices
  const sections = pages
    .map((group, index) => {
      const inner = buildMatrixHtml(group, index, pages.length)
      const bodyMatch = inner.match(/<body>([\s\S]*)<\/body>/)
      const body = bodyMatch?.[1] ?? inner
      const breakStyle =
        index < pages.length - 1 ? ' style="page-break-after: always; padding-bottom: 4mm;"' : ""
      return `<section${breakStyle}>${body}</section>`
    })
    .join("\n")

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      color: #0f172a;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 6px 5px;
      vertical-align: middle;
      text-align: center;
      font-size: 11px;
      line-height: 1.25;
    }
    th.corner {
      width: 88px;
      background: #e2e8f0;
    }
    th.teacher {
      background: #dbeafe;
      font-weight: 700;
      font-size: 11px;
      word-break: break-word;
    }
    th.day {
      background: #ecfdf5;
      font-weight: 700;
      width: 88px;
      text-align: left;
      padding-left: 8px;
    }
    td.slot {
      background: #f0fdf4;
      min-height: 42px;
    }
    .club + .club { margin-top: 4px; }
  </style>
</head>
<body>
  ${sections}
</body>
</html>`

  const pdf = await generatePDF(html, {
    landscape: true,
    disableGlobalLogo: true,
    margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
  })
  return Buffer.from(pdf)
}
